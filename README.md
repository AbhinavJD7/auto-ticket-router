# Auto-Ticket Router

An enterprise-grade client support ticket triage system. This application automatically classifies incoming support tickets, calculates SLAs based on urgency, and routes them into a live, concurrent priority queue for support agents to claim.

Built with a modern stack:
- **Backend**: FastAPI (Python)
- **Database**: PostgreSQL (via SQLAlchemy)
- **Priority Queue**: Redis (Sorted Sets)
- **Frontend**: React (TypeScript, Vite)

---

## 🚀 Quickstart (Docker)

The fastest way to get the entire stack (Database, Cache, Backend, Frontend) running locally is using Docker.

1. Ensure **Docker** and **Docker Compose** are installed and running on your machine.
2. Clone the repository and navigate into it.
3. Run the following command:
```bash
docker-compose up --build
```
4. Once the containers are healthy, open your browser to: **http://localhost**

*Note: The frontend runs on port 80 and automatically proxies `/api` requests to the backend.*

---

## 🛠️ Manual Local Development Setup

If you prefer to run the services bare-metal without Docker, follow these steps:

### 1. Prerequisites
- **Python 3.10+**
- **Node.js 18+**
- **PostgreSQL** (Running locally on default port `5432` with a database named `ticket_router`)
- **Redis** (Running locally on default port `6379`)

### 2. Start Redis & PostgreSQL
For Mac (using Homebrew):
```bash
brew services start redis
brew services start postgresql
```

### 3. Backend Setup (FastAPI)
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```
API runs on `http://127.0.0.1:8000`. Docs at `http://127.0.0.1:8000/docs`.

### 4. Frontend Setup (React)
Open a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on `http://localhost:5173`.

---

## 🎮 How to Use the Application

1. **Open the Dashboard**: Navigate to `http://localhost:5173` in your browser.
2. **Submit a Ticket (Guest Mode)**: Without logging in, use the "New Issue" form on the left to submit a ticket (e.g., "The database is down!"). Watch as the backend auto-classifies it as `CRITICAL` / `TECHNICAL` and drops it into the live Priority Queue on the right.
3. **Register an Agent**: To claim tickets, you must be a registered agent. 
   - Go to the API Docs: `http://127.0.0.1:8000/docs`
   - Scroll down to the `POST /register` endpoint.
   - Click "Try it out" and submit a JSON payload with a `name`, `email`, and `password`.
4. **Log In**: Go back to your React dashboard (`http://localhost:5173`) and log in. For testing purposes, you can use the default test agent:
   - **Email**: `test@gmail.com`
   - **Password**: `1234`
5. **Claim Tickets**: Once logged in, you will see a "Claim issue" button appear on any tickets sitting in the queue. Clicking it will assign the ticket to you and instantly remove it from the Redis queue.

---

## ☁️ AWS Deployment (Elastic Beanstalk)

This project is deployed on AWS Elastic Beanstalk's **Docker (Amazon Linux 2023)** platform using the EB CLI.

### 1. Install & Authenticate
```bash
brew install awsebcli
aws configure
```

### 2. Initialize and Deploy
```bash
# Initialize the Elastic Beanstalk environment
eb init -p docker <your-app-name> --region <your-region>

# Create the environment and deploy the containers
eb create <your-environment-name>

# Set required environment variables
eb setenv \
  JWT_SECRET_KEY="<your-secure-secret>" \
  ALLOWED_ORIGINS="http://<your-environment-cname>.elasticbeanstalk.com"

# Open the live application
eb open
```

---

## 🧪 Running Tests

To execute the Pytest suite, navigate to the `backend` folder, ensure your virtual environment is active, and run:
```bash
pytest
```

---

## 📄 Documentation

For deep dives into the architectural choices and data flows, check out the `docs/` folder:
- [Architectural Decisions Log](docs/decisions.md)
- [System Architecture & Flow](docs/flow.md)
