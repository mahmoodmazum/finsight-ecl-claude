from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query, UploadFile, File, Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
from pydantic import BaseModel

from app.database import get_db
from app.core.rbac import require_permission
from app.core.exceptions import NotFoundException, ValidationException
from app.core.audit import write_audit_event
from app.auth.models import User
from app.models.data_source import DataSource, DataLoadHistory, DataQualityIssue
from app.services.ingestion_service import trigger_source_ingestion

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────────────────
class DataSourceOut(BaseModel):
    source_id: str
    source_name: str
    source_type: str
    integration_method: str
    schedule_cron: str | None
    last_run_at: datetime | None
    last_run_status: str | None
    last_records_ingested: int | None
    last_records_failed: int | None
    is_active: bool

    model_config = {"from_attributes": True}


class DataLoadHistoryOut(BaseModel):
    load_id: int
    source_id: str
    started_at: datetime
    completed_at: datetime | None
    status: str
    records_extracted: int | None
    records_loaded: int | None
    records_failed: int | None
    error_summary: str | None

    model_config = {"from_attributes": True}


class DataQualityIssueOut(BaseModel):
    issue_id: int
    load_id: int
    loan_id: str | None
    field_name: str | None
    error_type: str
    error_detail: str | None
    is_quarantined: bool
    resolved: bool

    model_config = {"from_attributes": True}


class PaginatedIssues(BaseModel):
    items: list[DataQualityIssueOut]
    total: int
    page: int
    page_size: int


# ── Endpoints ─────────────────────────────────────────────────────────────────
@router.get("/sources", response_model=list[DataSourceOut])
async def list_sources(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("data:view")),
):
    result = await db.execute(select(DataSource).order_by(DataSource.source_name))
    return result.scalars().all()


@router.get("/history", response_model=list[DataLoadHistoryOut])
async def get_load_history(
    source_id: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("data:view")),
):
    q = select(DataLoadHistory).order_by(desc(DataLoadHistory.started_at)).limit(limit)
    if source_id:
        q = q.where(DataLoadHistory.source_id == source_id)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/quality", response_model=PaginatedIssues)
async def get_quality_issues(
    load_id: int | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("data:quality:view")),
):
    q = select(DataQualityIssue)
    if load_id:
        q = q.where(DataQualityIssue.load_id == load_id)

    count_result = await db.execute(select(func.count()).select_from(q.subquery()))
    total = count_result.scalar_one()

    q = q.order_by(DataQualityIssue.issue_id).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(q)
    return PaginatedIssues(items=result.scalars().all(), total=total, page=page, page_size=page_size)


@router.post("/trigger/{source_id}", status_code=202)
async def trigger_ingestion(
    source_id: str = Path(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("data:trigger")),
):
    result = await db.execute(select(DataSource).where(DataSource.source_id == source_id))
    source = result.scalar_one_or_none()
    if not source:
        raise NotFoundException(f"Data source '{source_id}' not found")

    load_id = await trigger_source_ingestion(source, db, current_user.user_id)

    await write_audit_event(
        db,
        event_type="DATA_INGESTION_TRIGGERED",
        entity_type="DataSource",
        entity_id=source_id,
        user_id=current_user.user_id,
        after_state={"source_name": source.source_name, "load_id": load_id},
    )
    await db.commit()

    return {"message": f"Ingestion triggered for '{source.source_name}'", "load_id": load_id}


@router.post("/upload/macro", status_code=202)
async def upload_macro_csv(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("data:upload")),
):
    """Upload Bangladesh Bank macro data CSV file."""
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise ValidationException("Only CSV files are accepted.")

    content = await file.read()
    rows_processed = len(content.splitlines()) - 1  # minus header

    await write_audit_event(
        db,
        event_type="MACRO_DATA_UPLOADED",
        entity_type="DataSource",
        entity_id="MACRO",
        user_id=current_user.user_id,
        after_state={"filename": file.filename, "rows": rows_processed},
    )
    await db.commit()

    return {"message": "Macro CSV uploaded", "filename": file.filename, "rows_processed": rows_processed}
