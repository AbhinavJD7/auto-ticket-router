# backend/database.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from dotenv import load_dotenv

# Load environment variables (like DB credentials) from a .env file
load_dotenv()

# We will use a local PostgreSQL URL for development.
# Format: postgresql://username:password@localhost/dbname
USER = os.environ.get("USER", "postgres")
SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    f"postgresql://{USER}@localhost:5432/ticket_router"
)

# The Engine is the starting point for any SQLAlchemy application.
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# Each instance of the SessionLocal class will be a database session.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for our database models (tables)
Base = declarative_base()

# Dependency function to get the database session in our API routes
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
