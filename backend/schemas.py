from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from models import TicketStatus

class TicketBase(BaseModel):
    client_id: str
    title: str
    description: str

class TicketCreate(TicketBase):
    pass

class TicketResponse(TicketBase):
    id: UUID
    category: str
    urgency: str
    status: TicketStatus
    created_at: datetime
    sla_deadline: datetime

    class Config:
        orm_mode = True

class AgentBase(BaseModel):
    name: str
    email: str
    skill_tags: List[str]

class AgentCreate(AgentBase):
    password: str

class AgentResponse(AgentBase):
    id: UUID
    current_load: int

    class Config:
        orm_mode = True
