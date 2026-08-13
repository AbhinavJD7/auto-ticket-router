from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import redis
import json

from database import engine, Base, get_db
import models
import schemas

# Create database tables if they don't exist
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Auto Ticket Router API",
    description="Enterprise client support ticket triage system.",
    version="1.0.0"
)

# CORS setup for frontend access
origins = ["http://localhost:3000", "http://localhost:5173"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Connect to Redis for Priority Queue
# Note: Ensure you have Redis running locally (default port 6379)
try:
    redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
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
    
    ticket_data = json.dumps({"id": str(ticket.id), "category": ticket.category, "urgency": ticket.urgency})
    redis_client.zadd("ticket_priority_queue", {ticket_data: score})

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "Ticket Router API is running", "redis": redis_client.ping() if redis_client else False}

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
def get_tickets(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
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
