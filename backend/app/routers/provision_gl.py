"""Provision & GL router — runs, movements, GL entries, approval, locking."""
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
from app.models.provision import ProvisionRun, ProvisionMovement, GLEntry

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class ProvisionRunOut(BaseModel):
    run_id: str
    reporting_month: str
    run_type: str
    status: str
    total_ecl: Decimal
    total_stage1_ecl: Decimal
    total_stage2_ecl: Decimal
    total_stage3_ecl: Decimal
    initiated_by: Optional[str] = None
    approved_by: Optional[str] = None
    initiated_at: datetime
    approved_at: Optional[datetime] = None
    locked_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ProvisionRunPage(BaseModel):
    items: list[ProvisionRunOut]
    total: int
    page: int
    page_size: int


class MovementOut(BaseModel):
    movement_id: str
    run_id: str
    movement_type: str
    amount: Decimal
    account_count: int
    notes: Optional[str] = None

    model_config = {"from_attributes": True}


class GLEntryOut(BaseModel):
    entry_id: str
    run_id: str
    entry_date: str
    dr_account: str
    cr_account: str
    amount: Decimal
    currency: str
    description: Optional[str] = None
    entry_type: str
    posted: bool
    posted_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# GET /provision/runs
# ---------------------------------------------------------------------------

@router.get("/runs", response_model=ProvisionRunPage)
async def list_runs(
    month: Optional[str] = Query(None, pattern=r"^\d{6}$"),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("provision:view")),
):
    """List provision runs with optional month / status filters."""
    q = select(ProvisionRun)
    if month:
        q = q.where(ProvisionRun.reporting_month == month)
    if status:
        q = q.where(ProvisionRun.status == status)

    count_result = await db.execute(select(func.count()).select_from(q.subquery()))
    total = count_result.scalar_one()

    result = await db.execute(
        q.order_by(ProvisionRun.initiated_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return ProvisionRunPage(items=result.scalars().all(), total=total, page=page, page_size=page_size)


@router.get("/runs/{run_id}", response_model=ProvisionRunOut)
async def get_run(
    run_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("provision:view")),
):
    """Get detail for a single provision run."""
    result = await db.execute(select(ProvisionRun).where(ProvisionRun.run_id == run_id))
    run = result.scalar_one_or_none()
    if not run:
        raise NotFoundException(f"Run {run_id} not found")
    return run


# ---------------------------------------------------------------------------
# POST /provision/runs/{run_id}/submit  — DRAFT → PENDING_APPROVAL
# ---------------------------------------------------------------------------

@router.post("/runs/{run_id}/submit", response_model=ProvisionRunOut)
async def submit_run_for_approval(
    run_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("provision:approve")),
):
    """Submit a DRAFT provision run for CRO approval."""
    result = await db.execute(select(ProvisionRun).where(ProvisionRun.run_id == run_id))
    run = result.scalar_one_or_none()
    if not run:
        raise NotFoundException(f"Run {run_id} not found")
    if run.status != "DRAFT":
        raise HTTPException(status_code=409, detail=f"Run status is '{run.status}', expected DRAFT")

    run.status = "PENDING_APPROVAL"
    await write_audit_event(
        db, "PROVISION_RUN_SUBMITTED", "provision_run", run_id, current_user.user_id,
        after_state={"status": "PENDING_APPROVAL"},
    )
    await db.commit()
    await db.refresh(run)
    return run


# ---------------------------------------------------------------------------
# POST /provision/runs/{run_id}/approve  — PENDING_APPROVAL → APPROVED
# ---------------------------------------------------------------------------

@router.post("/runs/{run_id}/approve", response_model=ProvisionRunOut)
async def approve_run(
    run_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("provision:approve")),
):
    """Approve a provision run (must be a different user than the submitter)."""
    result = await db.execute(select(ProvisionRun).where(ProvisionRun.run_id == run_id))
    run = result.scalar_one_or_none()
    if not run:
        raise NotFoundException(f"Run {run_id} not found")
    if run.status != "PENDING_APPROVAL":
        raise HTTPException(status_code=409, detail=f"Run status is '{run.status}', expected PENDING_APPROVAL")
    if run.initiated_by == current_user.user_id:
        raise HTTPException(status_code=403, detail="Cannot approve a run you initiated (dual control)")

    run.status = "APPROVED"
    run.approved_by = current_user.user_id
    run.approved_at = datetime.now(timezone.utc)

    await write_audit_event(
        db, "PROVISION_RUN_APPROVED", "provision_run", run_id, current_user.user_id,
        after_state={"status": "APPROVED", "approved_by": current_user.user_id},
    )
    await db.commit()
    await db.refresh(run)
    return run


# ---------------------------------------------------------------------------
# POST /provision/runs/{run_id}/lock  — APPROVED → LOCKED
# ---------------------------------------------------------------------------

@router.post("/runs/{run_id}/lock", response_model=ProvisionRunOut)
async def lock_run(
    run_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("provision:lock")),
):
    """Lock an approved provision run (immutable after this point)."""
    result = await db.execute(select(ProvisionRun).where(ProvisionRun.run_id == run_id))
    run = result.scalar_one_or_none()
    if not run:
        raise NotFoundException(f"Run {run_id} not found")
    if run.status != "APPROVED":
        raise HTTPException(status_code=409, detail=f"Run status is '{run.status}', expected APPROVED")

    run.status = "LOCKED"
    run.locked_at = datetime.now(timezone.utc)

    await write_audit_event(
        db, "PROVISION_RUN_LOCKED", "provision_run", run_id, current_user.user_id,
        after_state={"status": "LOCKED"},
    )
    await db.commit()
    await db.refresh(run)
    return run


# ---------------------------------------------------------------------------
# GET /provision/runs/{run_id}/movement
# ---------------------------------------------------------------------------

@router.get("/runs/{run_id}/movement", response_model=list[MovementOut])
async def get_run_movement(
    run_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("provision:view")),
):
    """Return the provision movement waterfall for a run."""
    result = await db.execute(
        select(ProvisionMovement)
        .where(ProvisionMovement.run_id == run_id)
        .order_by(ProvisionMovement.created_at)
    )
    return result.scalars().all()


# ---------------------------------------------------------------------------
# GET /provision/runs/{run_id}/gl-entries
# ---------------------------------------------------------------------------

@router.get("/runs/{run_id}/gl-entries", response_model=list[GLEntryOut])
async def get_gl_entries(
    run_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("provision:view")),
):
    """Return GL entries generated for a provision run."""
    result = await db.execute(
        select(GLEntry)
        .where(GLEntry.run_id == run_id)
        .order_by(GLEntry.entry_date, GLEntry.entry_type)
    )
    return result.scalars().all()
