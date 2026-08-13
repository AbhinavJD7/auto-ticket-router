from sqlalchemy import Column, String, Text, Integer, DateTime, Enum, ARRAY
from sqlalchemy.dialects.postgresql import UUID
import uuid
import enum
from datetime import datetime
from database import Base

# Enum for ticket statuses
class TicketStatus(str, enum.Enum):
    open = "open"
    in_progress = "in-progress"
    resolved = "resolved"

# Ticket Table Definition
class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    client_id = Column(String, index=True)
    title = Column(String, index=True)
    description = Column(Text)
    category = Column(String)  # e.g., billing, technical, access
    urgency = Column(String)   # e.g., low, medium, high, critical
    status = Column(Enum(TicketStatus), default=TicketStatus.open)
    created_at = Column(DateTime, default=datetime.utcnow)
    sla_deadline = Column(DateTime)

# Agent Table Definition
class Agent(Base):
    __tablename__ = "agents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    skill_tags = Column(ARRAY(String))  # Array of skills for routing
    current_load = Column(Integer, default=0)
