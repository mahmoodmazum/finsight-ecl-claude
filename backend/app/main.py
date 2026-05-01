from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.auth.router import router as auth_router
from app.routers.admin import router as admin_router
from app.routers import (
    dashboard, data_ingestion, segmentation, staging,
    sicr, ecl_calc, macro_scenarios, provision_gl,
    reports, model_governance, audit_trail, overlays,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.ENABLE_SCHEDULER:
        from app.jobs.scheduler import start_scheduler, stop_scheduler
        await start_scheduler()
    yield
    if settings.ENABLE_SCHEDULER:
        from app.jobs.scheduler import stop_scheduler
        await stop_scheduler()


app = FastAPI(
    title="FinSight ECL API",
    description="IFRS 9 Expected Credit Loss Platform — IFIC Bank Bangladesh",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PREFIX = settings.API_PREFIX

app.include_router(auth_router, prefix=f"{PREFIX}/auth", tags=["Auth"])
app.include_router(admin_router, prefix=f"{PREFIX}/admin", tags=["Admin"])
app.include_router(dashboard.router, prefix=f"{PREFIX}/dashboard", tags=["Dashboard"])
app.include_router(data_ingestion.router, prefix=f"{PREFIX}/data-ingestion", tags=["Data Ingestion"])
app.include_router(segmentation.router, prefix=f"{PREFIX}/segmentation", tags=["Segmentation"])
app.include_router(staging.router, prefix=f"{PREFIX}/staging", tags=["Staging"])
app.include_router(sicr.router, prefix=f"{PREFIX}/sicr", tags=["SICR"])
app.include_router(ecl_calc.router, prefix=f"{PREFIX}/ecl", tags=["ECL Calculation"])
app.include_router(macro_scenarios.router, prefix=f"{PREFIX}/macro", tags=["Macro Scenarios"])
app.include_router(provision_gl.router, prefix=f"{PREFIX}/provision", tags=["Provision & GL"])
app.include_router(reports.router, prefix=f"{PREFIX}/reports", tags=["Reports"])
app.include_router(model_governance.router, prefix=f"{PREFIX}/governance", tags=["Model Governance"])
app.include_router(audit_trail.router, prefix=f"{PREFIX}/audit", tags=["Audit Trail"])
app.include_router(overlays.router, prefix=f"{PREFIX}/overlays", tags=["Management Overlays"])


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "finsight-ecl-api"}
