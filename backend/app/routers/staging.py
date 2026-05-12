"""Staging router — results, migration matrix, overrides, dual approval, run engine."""
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.dependencies import get_db
from app.core.rbac import require_permission
from app.core.audit import write_audit_event
from app.core.exceptions import NotFoundException
from app.auth.models import User
from app.models.staging import StagingResult, TransitionMatrix
from app.models.loan import LoanAccount
from app.services.staging_engine import run_staging

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class StagingResultOut(BaseModel):
    staging_id: int
    loan_id: str
    reporting_month: str
    stage: int
    ifrs_default_flag: bool
    sicr_flag: bool
    dpd_at_staging: int
    cl_status_at_staging: Optional[str] = None
    crr_at_staging: Optional[int] = None
    override_flag: bool
    override_reason: Optional[str] = None
    override_by: Optional[str] = None
    override_approved_by: Optional[str] = None
    override_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class StagingResultPage(BaseModel):
    items: list[StagingResultOut]
    total: int
    page: int
    page_size: int


class TransitionMatrixOut(BaseModel):
    matrix_id: str
    segment_id: str
    reporting_month: str
    from_state: str
    to_state: str
    count: int
    transition_probability: Decimal

    model_config = {"from_attributes": True}


class StageOverrideRequest(BaseModel):
    staging_id: int
    new_stage: int
    reason: str


class StagingRunResponse(BaseModel):
    reporting_month: str
    accounts_staged: int
    stage1: int
    stage2: int
    stage3: int


# ---------------------------------------------------------------------------
# GET /staging/results
# ---------------------------------------------------------------------------

@router.get("/results", response_model=StagingResultPage)
async def get_staging_results(
    month: str = Query(..., pattern=r"^\d{6}$"),
    stage: Optional[int] = Query(None, ge=1, le=3),
    overrides_only: bool = Query(False),
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("staging:view")),
):
    """Return paginated staging results for a reporting month."""
    q = select(StagingResult).where(StagingResult.reporting_month == month)
    if stage is not None:
        q = q.where(StagingResult.stage == stage)
    if overrides_only:
        q = q.where(StagingResult.override_flag == True)  # noqa: E712

    count_result = await db.execute(select(func.count()).select_from(q.subquery()))
    total = count_result.scalar_one()

    rows_result = await db.execute(
        q.order_by(StagingResult.staging_id)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return StagingResultPage(
        items=rows_result.scalars().all(),
        total=total,
        page=page,
        page_size=page_size,
    )


# ---------------------------------------------------------------------------
# GET /staging/migration-matrix
# ---------------------------------------------------------------------------

@router.get("/migration-matrix", response_model=list[TransitionMatrixOut])
async def get_migration_matrix(
    month: str = Query(..., pattern=r"^\d{6}$"),
    segment_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("staging:view")),
):
    """Return the transition / migration matrix for a reporting month."""
    q = select(TransitionMatrix).where(TransitionMatrix.reporting_month == month)
    if segment_id:
        q = q.where(TransitionMatrix.segment_id == segment_id)
    q = q.order_by(TransitionMatrix.segment_id, TransitionMatrix.from_state, TransitionMatrix.to_state)
    result = await db.execute(q)
    return result.scalars().all()


# ---------------------------------------------------------------------------
# POST /staging/override  — submit override (needs a second approver)
# ---------------------------------------------------------------------------

@router.post("/override", response_model=StagingResultOut)
async def submit_stage_override(
    body: StageOverrideRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("staging:override:submit")),
):
    """Submit a stage override request. Requires a second approver."""
    if body.new_stage not in (1, 2, 3):
        raise HTTPException(status_code=422, detail="new_stage must be 1, 2, or 3")

    result = await db.execute(
        select(StagingResult).where(StagingResult.staging_id == body.staging_id)
    )
    staging = result.scalar_one_or_none()
    if not staging:
        raise NotFoundException(f"Staging result {body.staging_id} not found")

    before_stage = staging.stage
    staging.stage = body.new_stage
    staging.override_flag = True
    staging.override_reason = body.reason
    staging.override_by = current_user.user_id
    staging.override_at = datetime.now(timezone.utc)
    staging.override_approved_by = None  # awaiting second approval

    await write_audit_event(
        db, "STAGE_OVERRIDE_SUBMITTED", "staging_result", str(staging.staging_id), current_user.user_id,
        before_state={"stage": before_stage},
        after_state={"stage": body.new_stage, "reason": body.reason},
        notes="Stage override submitted — awaiting dual approval",
    )
    await db.commit()
    await db.refresh(staging)
    return staging


# ---------------------------------------------------------------------------
# POST /staging/override/{staging_id}/approve  — dual approval
# ---------------------------------------------------------------------------

@router.post("/override/{staging_id}/approve", response_model=StagingResultOut)
async def approve_stage_override(
    staging_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("staging:override:approve")),
):
    """Approve a pending stage override (dual control — must be a different user)."""
    result = await db.execute(
        select(StagingResult).where(StagingResult.staging_id == staging_id)
    )
    staging = result.scalar_one_or_none()
    if not staging:
        raise NotFoundException(f"Staging result {staging_id} not found")
    if not staging.override_flag:
        raise HTTPException(status_code=409, detail="No pending override on this record")
    if staging.override_approved_by is not None:
        raise HTTPException(status_code=409, detail="Override already approved")
    if staging.override_by == current_user.user_id:
        raise HTTPException(status_code=403, detail="Cannot approve your own override (dual control)")

    staging.override_approved_by = current_user.user_id
    await write_audit_event(
        db, "STAGE_OVERRIDE_APPROVED", "staging_result", str(staging_id), current_user.user_id,
        after_state={"stage": staging.stage, "approved_by": current_user.user_id},
    )
    await db.commit()
    await db.refresh(staging)
    return staging


# ---------------------------------------------------------------------------
# POST /staging/run  — trigger staging engine
# ---------------------------------------------------------------------------

@router.post("/run", response_model=StagingRunResponse, status_code=202)
async def run_staging_engine(
    month: str = Query(..., pattern=r"^\d{6}$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("staging:run")),
):
    """Run the staging engine for a reporting month."""
    results = await run_staging(month, db, created_by=current_user.user_id)

    stage_counts = {1: 0, 2: 0, 3: 0}
    for r in results:
        stage_counts[r.stage] = stage_counts.get(r.stage, 0) + 1

    await write_audit_event(
        db, "STAGING_RUN_COMPLETE", "staging", month, current_user.user_id,
        after_state={"month": month, "total": len(results), **{f"stage{k}": v for k, v in stage_counts.items()}},
    )
    await db.commit()

    return StagingRunResponse(
        reporting_month=month,
        accounts_staged=len(results),
        stage1=stage_counts.get(1, 0),
        stage2=stage_counts.get(2, 0),
        stage3=stage_counts.get(3, 0),
    )
