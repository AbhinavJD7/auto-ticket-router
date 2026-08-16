# Deployment Story

This document outlines the evolutionary journey of this project's deployment architecture, detailing how it progressed from a traditional AWS infrastructure to a modern serverless stack.

## The Original Architecture (AWS Elastic Beanstalk)

Initially, this project was designed with a traditional monolithic infrastructure approach using **Docker** on **AWS Elastic Beanstalk**. 

The AWS setup utilized `docker-compose.yml` to spin up 4 distinct containers within an EC2 instance:
1. **PostgreSQL** Database container
2. **Redis** Queue container
3. **FastAPI Backend** container
4. **Nginx/React Frontend** container (which proxies `/api` traffic to the backend).

### Deploying to AWS
The project still fully supports this architecture. You can spin up the enterprise AWS version at any time using the EB CLI:
```bash
eb init -p docker auto-ticket-router --region us-east-1
eb create auto-ticket-router-env
eb setenv JWT_SECRET_KEY="<your-secret>" ALLOWED_ORIGINS="*"
eb deploy
```

While robust, this approach incurred continuous monthly charges (running EC2 instances, EBS volumes, and load balancers 24/7), making it less ideal for a portfolio project intended to run indefinitely for $0.

---

## The Modern Serverless Architecture (Vercel + Supabase)

To eliminate hosting costs while maintaining enterprise-grade performance and high availability, the infrastructure was decoupled into a **$0/month Serverless Stack**.

### 1. Database & Cache layer (Supabase + Upstash)
Since serverless platforms don't run persistent Docker containers for stateful data:
* **PostgreSQL** was migrated to **Supabase**, utilizing their Shared IPv4 Connection Pooler (`pooler.supabase.com:5432`) to ensure compatibility with serverless environments.
* **Redis** was migrated to **Upstash**, providing a serverless, low-latency key-value store for the live priority queue.

### 2. Frontend & Backend Layer (Vercel Services)
Instead of splitting the React UI onto Vercel and the FastAPI backend onto Render (which introduces cold starts), the project utilizes Vercel's multi-service architecture via `vercel.json`:

```json
{
    "services": {
        "frontend": {
            "root": "frontend",
            "framework": "vite"
        },
        "backend": {
            "root": "backend",
            "entrypoint": "main.py"
        }
    }
}
```

When pushed to GitHub, Vercel automatically:
1. Builds the Vite React app for the frontend.
2. Packages the FastAPI application into Python Serverless Functions.
3. Automatically rewrites `/api/*` requests to the Python functions.

### How to Deploy to Vercel
1. Push the repository (including `vercel.json`) to GitHub.
2. Import the repository into Vercel.
3. Supply the following Environment Variables in the Vercel dashboard:
   - `DATABASE_URL`: Your Supabase IPv4 Pooler connection string.
   - `REDIS_URL`: Your Upstash Redis connection string.
   - `JWT_SECRET_KEY`: A secure random string for JWT signing.
   - `ALLOWED_ORIGINS`: `*` (or the specific Vercel deployment URL).
4. Deploy!

By shifting to this decoupled architecture, the application remains fully scalable, ACID-compliant, and queue-driven, but costs absolutely nothing to keep live on the internet.
