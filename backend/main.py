from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import redis
import json

from database import engine, Base, get_db
import models
import schemas
from auth import get_password_hash, verify_password, create_access_token, get_current_agent
from fastapi.security import OAuth2PasswordRequestForm

# Create database tables if they don't exist
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Auto Ticket Router API",
    description="Enterprise client support ticket triage system.",
    version="1.0.0"
)

import os

# CORS setup for frontend access
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173")
origins = [origin.strip() for origin in allowed_origins_env.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Connect to Redis for Priority Queue (using a connection pool)
# The default REDIS_URL is for local development without Docker.
# In Docker Compose, this will be "redis".
REDIS_URL = os.getenv("REDIS_URL", "localhost")
try:
    redis_client = redis.Redis(host=REDIS_URL, port=6379, db=0, decode_responses=True)
except Exception as e:
    print("Warning: Could not connect to Redis", e)
    redis_client = None

def auto_classify_ticket(title: str, description: str):
    """Simple rule-based engine to classify category and urgency"""
    content = (title + " " + description).lower()
    
    # Categorization logic
    category = "general"
    if any(word in content for word in ["bill", "invoice", "payment", "charge"]):
        category = "billing"
    elif any(word in content for word in ["bug", "error", "crash", "technical", "api"]):
        category = "technical"
    elif any(word in content for word in ["login", "password", "access", "account"]):
        category = "access"

    # Urgency logic
    urgency = "low"
    sla_hours = 48 # default 48h SLA
    
    if any(word in content for word in ["urgent", "asap", "critical", "down"]):
        urgency = "critical"
        sla_hours = 1
    elif any(word in content for word in ["high", "important"]):
        urgency = "high"
        sla_hours = 4
    elif any(word in content for word in ["medium"]):
        urgency = "medium"
        sla_hours = 12

    sla_deadline = datetime.utcnow() + timedelta(hours=sla_hours)
    
    return category, urgency, sla_deadline

def push_to_priority_queue(ticket: models.Ticket):
    """Push ticket to Redis Priority Queue based on urgency weight and SLA"""
    if not redis_client: return
    
    urgency_weights = {"critical": 1, "high": 2, "medium": 3, "low": 4}
    weight = urgency_weights.get(ticket.urgency, 4)
    
    # We use a sorted set in Redis. The score is based on weight + timestamp
    # A simple formula to prioritize: weight (lower is better) * 1000000000 + unix timestamp of SLA
    score = (weight * 10_000_000_000) + int(ticket.sla_deadline.timestamp())
    
    ticket_data = json.dumps({
        "id": str(ticket.id), 
        "title": ticket.title,
        "description": ticket.description,
        "category": ticket.category, 
        "urgency": ticket.urgency,
        "status": ticket.status
    })
    redis_client.zadd("ticket_priority_queue", {ticket_data: score})

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "Ticket Router API is running", "redis": redis_client.ping() if redis_client else False}

@app.post("/register", response_model=schemas.AgentResponse)
def register_agent(agent: schemas.AgentCreate, db: Session = Depends(get_db)):
    db_agent = db.query(models.Agent).filter(models.Agent.email == agent.email).first()
    if db_agent:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(agent.password)
    new_agent = models.Agent(
        name=agent.name,
        email=agent.email,
        password_hash=hashed_password,
        skill_tags=agent.skill_tags
    )
    db.add(new_agent)
    db.commit()
    db.refresh(new_agent)
    return new_agent

@app.post("/token", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    agent = db.query(models.Agent).filter(models.Agent.email == form_data.username).first()
    if not agent or not verify_password(form_data.password, agent.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": agent.email})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/tickets/", response_model=schemas.TicketResponse)
def create_ticket(ticket: schemas.TicketCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    # 1. Auto-classify
    category, urgency, sla_deadline = auto_classify_ticket(ticket.title, ticket.description)
    
    # 2. Save to database
    db_ticket = models.Ticket(
        client_id=ticket.client_id,
        title=ticket.title,
        description=ticket.description,
        category=category,
        urgency=urgency,
        sla_deadline=sla_deadline
    )
    db.add(db_ticket)
    db.commit()
    db.refresh(db_ticket)
    
    # 3. Push to Redis Priority Queue in the background
    background_tasks.add_task(push_to_priority_queue, db_ticket)
    
    return db_ticket

@app.get("/tickets/", response_model=list[schemas.TicketResponse])
def get_tickets(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_agent: models.Agent = Depends(get_current_agent)):
    tickets = db.query(models.Ticket).offset(skip).limit(limit).all()
    return tickets

@app.get("/queue/")
def get_priority_queue():
    """Endpoint to view the current live priority queue in Redis"""
    if not redis_client:
        return {"error": "Redis not connected"}
    
    # Fetch all tickets in the sorted set, ordered by priority
    queue = redis_client.zrange("ticket_priority_queue", 0, -1, withscores=True)
    return {"queue": [{"ticket": json.loads(q[0]), "priority_score": q[1]} for q in queue]}

import uuid

@app.post("/tickets/{ticket_id}/claim")
def claim_ticket(ticket_id: str, db: Session = Depends(get_db), current_agent: models.Agent = Depends(get_current_agent)):
    # 1. Fetch ticket and do an atomic update to prevent double-claiming
    try:
        ticket_uuid = uuid.UUID(ticket_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ticket ID format.")

    updated_rows = db.query(models.Ticket).filter(
        models.Ticket.id == ticket_uuid,
        models.Ticket.status == models.TicketStatus.open
    ).update({
        "status": models.TicketStatus.in_progress
    }, synchronize_session=False)
    
    if updated_rows == 0:
        db.rollback()
        raise HTTPException(status_code=400, detail="Ticket not found or already claimed.")
    
    # Update agent's current load
    db.query(models.Agent).filter(models.Agent.id == current_agent.id).update({
        "current_load": models.Agent.current_load + 1
    }, synchronize_session=False)
    
    db.commit()

    # Fetch the updated ticket to return it
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_uuid).first()
    
    # 2. Remove from Redis queue
    if redis_client:
        # We need to find the exact JSON string to remove it. 
        # Alternatively, ZREMRANGEBYSCORE or iterating.
        # Since we just serialize the data to push it, let's reconstruct or remove by matching ID.
        # It's safer to iterate and remove if the ID matches.
        queue = redis_client.zrange("ticket_priority_queue", 0, -1)
        for item in queue:
            try:
                data = json.loads(item)
                if data.get("id") == str(ticket.id):
                    redis_client.zrem("ticket_priority_queue", item)
                    break
            except:
                pass
                
    return {"message": "Ticket claimed successfully", "ticket": ticket}
