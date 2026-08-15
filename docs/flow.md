# System Architecture & Flow

This document maps out the system architecture, control flow, and component interactions for the Auto Ticket Router project.

## High-Level Architecture

The system consists of four primary components:
1. **Frontend Client:** React SPA (TypeScript) acting as the Support Agent Dashboard.
2. **Backend API:** FastAPI (Python) serving as the orchestration and logic layer.
3. **Persistent Store:** PostgreSQL database storing the canonical records of tickets and agents.
4. **Live Queue:** Redis acting as the in-memory priority queue.

## Control Flow & User Journeys

### 1. Ticket Submission & Auto-Classification Flow
When a user (or client system) submits a new support ticket:
1. **API Request:** A `POST` request is sent to `http://127.0.0.1:8000/tickets/` with the raw ticket data (title, description, client_id).
2. **Validation:** FastAPI (via Pydantic schemas) validates the incoming payload format.
3. **Auto-Classification:** The `auto_classify_ticket` engine scans the text for keywords.
   - It assigns a **Category** (e.g., technical, billing).
   - It assigns an **Urgency** (e.g., low, critical).
   - It calculates an **SLA Deadline** based on the assigned urgency.
4. **Persistence:** The classified ticket is inserted into the PostgreSQL `tickets` table using SQLAlchemy.
5. **Queueing (Background Task):** A background task calculates a priority score (combining urgency weight and SLA timestamp) and pushes the ticket ID into a Redis Sorted Set (`ticket_priority_queue`).
6. **Response:** The API returns the newly created, classified ticket to the caller.

### 2. Agent Authentication Flow
1. **Registration:** `POST /register` creates a new agent profile (hashing password via bcrypt) and stores it in PostgreSQL.
2. **Login:** `POST /token` verifies credentials and returns a JWT access token.
3. **Storage:** Frontend stores the JWT in `localStorage` and attaches it as a `Bearer` token in the `Authorization` header for subsequent protected API requests.

### 3. Agent Dashboard Polling Flow
When a logged-in support agent opens the dashboard:
1. **Mount:** The React frontend initializes and triggers `useEffect`.
2. **Fetch Tickets:** `GET /tickets/` (protected) is called to fetch the historical and current tickets from PostgreSQL.
3. **Fetch Queue:** `GET /queue/` (public) is called to fetch the live list of unassigned tickets currently waiting in the Redis priority queue.
4. **Render:** The UI renders the tickets with color-coded urgency badges and displays the total number of tickets currently in the live queue.

### 4. Ticket Claim Flow
When an agent clicks "Claim" on a ticket in the UI:
1. **API Request:** `POST /tickets/{ticket_id}/claim` is triggered with the agent's JWT.
2. **Auth Verification:** `get_current_agent` dependency decodes the JWT and fetches the agent context.
3. **Atomic DB Update:** The backend executes an atomic update on PostgreSQL: `UPDATE tickets SET status = 'in-progress' WHERE id = ? AND status = 'open'`.
4. **Race Condition Handling:** If `updated_rows == 0`, a 400 Error is returned (another agent claimed it first). If successful, the agent's `current_load` is incremented.
5. **Redis Cleanup:** The backend scans the Redis `ticket_priority_queue` and removes the ticket payload via `ZREM` so it disappears from the live queue.
6. **Response:** Success is returned, and the frontend refreshes the view.

---

## 5. Tech Stack & Architectural Justifications (The "Why")

When explaining this architecture in an interview, it is crucial to explain *why* specific tools were chosen over popular alternatives.

### Frontend: React + Vite + Tailwind CSS
* **React:** Chosen for its component-based architecture which allows us to cleanly separate the `Client Portal` from the `Agent Workspace` while sharing reusable UI components (like buttons and inputs).
  * *Why not Angular/Vue?* React has a more robust ecosystem, wider community support, and faster onboarding for most developers.
* **Vite:** Used as the build tool and development server.
  * *Why not Create React App (CRA) or Webpack?* Vite uses native ES modules to provide blazing-fast Hot Module Replacement (HMR). Changes reflect in the browser instantly, whereas Webpack gets notoriously slow as a project grows.
* **Tailwind CSS:** A utility-first CSS framework.
  * *Why not vanilla CSS or Bootstrap?* Vanilla CSS leads to massive, hard-to-maintain stylesheets and naming conflicts. Bootstrap looks generic. Tailwind allows us to build a highly custom, premium dark-mode UI ("Supabase-style") directly inside our JSX without switching context.

### Backend: FastAPI (Python)
* **FastAPI:** A modern, high-performance web framework for building APIs.
  * *Why not Django?* Django is a heavy "batteries-included" monolithic framework. Our application is essentially a lightweight microservice/API layer for a SPA (Single Page App). Django is overkill for this.
  * *Why not Flask?* Flask is lightweight but lacks native asynchronous support and built-in type validation. FastAPI gives us automatic data validation (via Pydantic) and auto-generates Swagger API documentation out of the box, saving hours of manual doc writing.

### Database: PostgreSQL + SQLAlchemy
* **PostgreSQL:** An advanced, open-source relational database.
  * *Why not MongoDB (NoSQL)?* Ticket routing involves highly structured data with clear relationships (Agents, Tickets, Statuses). Furthermore, we absolutely require **ACID transactions** to handle concurrency (preventing two agents from claiming the same ticket simultaneously). Relational databases like Postgres excel at strict concurrency control.
* **SQLAlchemy:** The standard Python Object-Relational Mapper (ORM).
  * *Why use an ORM?* It prevents SQL injection attacks, allows us to write database queries in Python instead of raw SQL strings, and makes it trivial to swap out the underlying database engine if needed in the future.

### Caching/Queueing: Redis
* **Redis:** An in-memory key-value data store.
  * *Why use Redis?* Querying the PostgreSQL database constantly for "live queue" updates is expensive and slow. Redis operates in RAM, allowing for sub-millisecond read/writes, making it the industry standard for fast queue management, rate-limiting, and Pub/Sub functionality.

### Infrastructure: Docker
* **Docker & Docker Compose:** Used to containerize our external dependencies (Postgres and Redis).
  * *Why use Docker?* It entirely eliminates the "it works on my machine" problem. Instead of forcing new developers to manually install and configure Postgres and Redis on their specific operating systems, they simply run `docker-compose up -d` and the exact required environments are spun up in isolated containers.
