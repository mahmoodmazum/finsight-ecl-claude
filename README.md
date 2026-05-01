# FinSight ECL — IFRS 9 Expected Credit Loss Platform

Production-grade ECL calculation platform for IFIC Bank Bangladesh. Implements IFRS 9 Sections 5.5 and 7 with Bangladesh Bank regulatory compliance.

## Stack

- **Frontend**: React 19 + Vite + TypeScript + Tailwind CSS + TanStack Query v5
- **Backend**: Python 3.12 + FastAPI (async) + SQLAlchemy 2.0
- **Database**: Microsoft SQL Server 2019+
- **Auth**: JWT (access 15min + refresh 7d)
- **Queue**: APScheduler (nightly ingestion jobs)
- **Migrations**: Alembic

## Prerequisites

- Docker Desktop
- ODBC Driver 17 for SQL Server (for local dev without Docker)
- Node.js 20+ (for local frontend dev)
- Python 3.12+ (for local backend dev)

## Quick Start (Docker)

```bash
# 1. Copy env file and set your password
cp .env.example .env
# Edit .env — set DB_PASSWORD and JWT_SECRET_KEY

# 2. Start all services
docker compose up --build

# 3. Run migrations (first time only)
docker compose exec backend alembic upgrade head

# 4. Seed reference data
docker compose exec backend python -m app.seed

# 5. Access the app
# Frontend: http://localhost:5173
# API docs: http://localhost:8000/docs
# Default admin: admin@finsight.com / Admin@123456
```

## Local Development (without Docker)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Copy and configure env
cp ../.env.example .env

# Run migrations
alembic upgrade head

# Seed data
python -m app.seed

# Start API
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install

# Create .env.local
echo "VITE_API_BASE_URL=http://localhost:8000/api/v1" > .env.local

npm run dev
```

## Project Structure

```
finsight-ecl/
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app factory
│   │   ├── config.py          # Settings (pydantic-settings)
│   │   ├── database.py        # Async SQLAlchemy engine
│   │   ├── seed.py            # Reference data seeder
│   │   ├── auth/              # JWT auth module
│   │   ├── models/            # SQLAlchemy ORM models
│   │   ├── schemas/           # Pydantic v2 schemas
│   │   ├── routers/           # FastAPI routers
│   │   ├── services/          # Business logic (ECL engine, etc.)
│   │   ├── jobs/              # APScheduler jobs
│   │   └── core/              # Dependencies, exceptions, audit helper
│   ├── alembic/               # Database migrations
│   └── tests/                 # pytest tests
└── frontend/
    └── src/
        ├── api/               # Axios API clients
        ├── hooks/             # React Query hooks
        ├── components/        # UI components
        ├── stores/            # Zustand stores
        └── types/             # TypeScript types
```

## Roles

| Role | Permissions |
|------|-------------|
| VIEWER | Read-only access to all pages |
| ANALYST | Read + run ECL calculations + submit overlays |
| CRO | ANALYST + approve provision runs + approve overlays |
| ADMIN | Full access including user management |

## API Documentation

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Running Tests

```bash
# Backend
cd backend
pytest tests/ -v

# Frontend
cd frontend
npm run test
```

## Key Constraints

- All monetary values stored in BDT Crore (DECIMAL 18,4); displayed with ৳ prefix and "Cr" suffix
- All timestamps stored in UTC; displayed in Asia/Dhaka (UTC+6)
- Reporting month format: YYYYMM (6-digit string)
- Locked provision runs are immutable (API returns 403 on modification attempts)
- Audit log is append-only (INSTEAD OF DELETE trigger blocks deletions)
- ECL runs are async — POST returns 202 with run_id; poll GET /ecl/run/{run_id}/status
