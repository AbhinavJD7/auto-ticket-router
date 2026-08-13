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
4. **Log In**: Go back to your React dashboard (`http://localhost:5173`) and log in using the email and password you just registered.
5. **Claim Tickets**: Once logged in, you will see a "Claim issue" button appear on any tickets sitting in the queue. Clicking it will assign the ticket to you and instantly remove it from the Redis queue.

## ☁️ AWS Deployment (Elastic Beanstalk)

This project is fully containerized and configured for AWS Elastic Beanstalk's **Docker (Amazon Linux 2023)** platform, which natively supports `docker-compose.yml`.

### Step 1: AWS Managed Databases (Recommended)
Before deploying the application code, set up your managed data stores on AWS:
1. **AWS RDS (PostgreSQL)**: Create a free-tier `db.t3.micro` Postgres instance. Note the endpoint URL, username, and password.
2. **AWS ElastiCache (Redis)**: Create a free-tier `cache.t2.micro` Redis cluster. Note the endpoint URL.

### Step 2: Prepare the Deployment Package
Elastic Beanstalk expects a `.zip` file of your repository.
```bash
# From the root of the project
zip -r deploy.zip docker-compose.yml frontend/ backend/ -x "*/node_modules/*" -x "*/venv/*" -x "*/__pycache__/*"
```

*Note: In the `docker-compose.yml`, you may want to remove the `postgres` and `redis` service blocks for production, as your containers will connect to your AWS RDS and ElastiCache instances instead.*

### Step 3: Deploy to Elastic Beanstalk
1. Go to the AWS Elastic Beanstalk Console and click **Create Application**.
2. Select **Docker** as the platform (Amazon Linux 2023).
3. Upload your `deploy.zip` file.
4. **Environment Properties**: In the configuration step, you must inject your production environment variables:
   - `DATABASE_URL`: `postgresql://<RDS_USER>:<RDS_PASS>@<RDS_ENDPOINT>:5432/ticket_router`
   - `REDIS_URL`: `<ELASTICACHE_ENDPOINT>`
   - `JWT_SECRET_KEY`: `<generate a secure random string>`
   - `ALLOWED_ORIGINS`: `<your_elastic_beanstalk_url>`
5. Launch the environment! EB will automatically build the `frontend` and `backend` images and wire them up.

### Step 4: Cleanup & Teardown
To avoid AWS charges after you are done testing:
1. Terminate the Elastic Beanstalk Environment via the EB Console.
2. Delete the RDS PostgreSQL Database.
3. Delete the ElastiCache Redis Cluster.

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
