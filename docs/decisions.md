# Architectural Decisions Log

This document tracks all major architectural and technical decisions made during the development of the Auto Ticket Router project.

## 1. Backend Framework
- **Decision:** Use FastAPI (Python) for the backend API.
- **Context/Problem:** The application requires a fast, asynchronous backend capable of handling multiple concurrent requests (such as incoming tickets and queue polling) with built-in data validation.
- **Rationale:** FastAPI provides out-of-the-box asynchronous support, automatic Swagger documentation, and uses Pydantic for strict data validation, making it highly efficient for building robust REST APIs compared to alternatives like Flask or Django.

## 2. Database Selection (Persistent Storage)
- **Decision:** Use PostgreSQL via SQLAlchemy ORM.
- **Context/Problem:** The system needs reliable, relational persistent storage for tickets and agent profiles, ensuring ACID compliance.
- **Rationale:** PostgreSQL is a robust open-source relational database. Using SQLAlchemy ORM abstracts the SQL logic, making it easier to define schemas in Python and preventing SQL injection.

## 3. Priority Queue System
- **Decision:** Implement the priority queue using Redis (Sorted Sets).
- **Context/Problem:** The routing system needs to hold unassigned tickets in a live queue and sort them efficiently based on urgency and SLA deadlines. Relying solely on PostgreSQL for constant queue polling and sorting under heavy load could cause bottlenecks.
- **Rationale:** Redis is an in-memory data store that offers exceptionally fast read/write speeds. Its "Sorted Sets" (`ZADD`, `ZRANGE`) feature perfectly models a priority queue natively, where the "score" determines priority without requiring complex application-level sorting loops.

## 4. Frontend Framework
- **Decision:** Use React.js with TypeScript and Vite.
- **Context/Problem:** Support agents need a fast, reactive, single-page application (SPA) dashboard to view the live ticket queue without constantly refreshing the browser.
- **Rationale:** React is the industry standard for SPAs. TypeScript adds type safety (matching our backend Pydantic models). Vite was chosen over Create React App (CRA) or Webpack for its vastly superior development server startup time and Hot Module Replacement (HMR) speed.

## 5. Authentication Strategy
- **Decision:** Use JWT (JSON Web Tokens) with `localStorage` on the frontend.
- **Context/Problem:** The API needs to be secured so only authorized agents can claim tickets. We need a stateless authentication mechanism.
- **Rationale:** JWT is the standard for stateless API authentication. While HTTP-only cookies provide better protection against XSS, `localStorage` is widely understood, standard for React SPAs, and sufficient for this project's security profile.

## 6. Concurrency Handling for Ticket Claims
- **Decision:** Use atomic database updates for claiming tickets.
- **Context/Problem:** Multiple agents might click "Claim" on the same ticket simultaneously, potentially causing a race condition where the ticket is assigned to both.
- **Rationale:** Instead of a `SELECT` then `UPDATE` pattern, the backend executes an atomic `UPDATE tickets SET status = 'in-progress' WHERE id = ? AND status = 'open'`. If `updated_rows == 0`, it means another agent already claimed it, preventing double-claims.

## 7. Containerization & Hosting
- **Decision:** Docker Compose & AWS Elastic Beanstalk (Multi-Docker).
- **Context/Problem:** The app consists of a backend, frontend, PostgreSQL, and Redis. Running these locally requires a lot of manual setup, and deploying four separate services individually is complex and expensive.
- **Rationale:** Dockerizing everything ensures perfect parity between local development and production. Elastic Beanstalk's Amazon Linux 2023 Docker platform natively supports `docker-compose.yml`, allowing us to host the entire 4-container ecosystem on a single EC2 instance for free-tier simplicity.
