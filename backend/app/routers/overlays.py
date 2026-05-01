"""Management Overlays router — submit, approve, expire."""
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
from app.models.overlay import ManagementOverlay

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class OverlayOut(BaseModel):
    overlay_id: str
    loan_id: Optional[str] = None
    segment_id: Optional[str] = None
    overlay_type: str
    adjustment_factor: Decimal
    rationale: str
    effective_from: str
    effective_to: Optional[str] = None
    status: str
    submitted_by: Optional[str] = None
    approved_by: Optional[str] = None
    submitted_at: datetime
    approved_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class OverlayPage(BaseModel):
    items: list[OverlayOut]
    total: int
    page: int
    page_size: int


class OverlayCreate(BaseModel):
    loan_id: Optional[str] = None
    segment_id: Optional[str] = None
    overlay_type: str
    adjustment_factor: Decimal
    rationale: str
    effective_from: str
    effective_to: Optional[str] = None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/", response_model=OverlayPage)
async def list_overlays(
    status: Optional[str] = Query(None, pattern=r"^(PENDING|APPROVED|REJECTED|EXPIRED)$"),
    segment_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("overlays:view")),
):
    """List management overlays with optional filters."""
    q = select(ManagementOverlay)
    if status:
        q = q.where(ManagementOverlay.status == status)
    if segment_id:
        q = q.where(ManagementOverlay.segment_id == segment_id)

    count_result = await db.execute(select(func.count()).select_from(q.subquery()))
    total = count_result.scalar_one()

    result = await db.execute(
        q.order_by(ManagementOverlay.submitted_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return OverlayPage(items=result.scalars().all(), total=total, page=page, page_size=page_size)


@router.post("/", response_model=OverlayOut, status_code=201)
async def submit_overlay(
    body: OverlayCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("overlays:submit")),
):
    """Submit a management overlay for approval."""
    if not body.loan_id and not body.segment_id:
        raise HTTPException(status_code=422, detail="Either loan_id or segment_id must be provided")

    overlay = ManagementOverlay(
        overlay_id=str(uuid.uuid4()),
        loan_id=body.loan_id,
        segment_id=body.segment_id,
        overlay_type=body.overlay_type,
        adjustment_factor=body.adjustment_factor,
        rationale=body.rationale,
        effective_from=body.effective_from,
        effective_to=body.effective_to,
        status="PENDING",
        submitted_by=current_user.user_id,
        submitted_at=datetime.now(timezone.utc),
        created_by=current_user.user_id,
    )
    db.add(overlay)
    await write_audit_event(
        db, "OVERLAY_SUBMIT", "overlay", overlay.overlay_id, current_user.user_id,
        after_state={"overlay_type": overlay.overlay_type, "adjustment_factor": str(overlay.adjustment_factor)},
    )
    await db.commit()
    await db.refresh(overlay)
    return overlay


@router.post("/{overlay_id}/approve", response_model=OverlayOut)
async def approve_overlay(
    overlay_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("overlays:approve")),
):
    """Approve a pending management overlay."""
    result = await db.execute(select(ManagementOverlay).where(ManagementOverlay.overlay_id == overlay_id))
    overlay = result.scalar_one_or_none()
    if not overlay:
        raise NotFoundException(f"Overlay {overlay_id} not found")
    if overlay.status != "PENDING":
        raise HTTPException(status_code=409, detail=f"Overlay is {overlay.status}, not PENDING")
    if overlay.submitted_by == current_user.user_id:
        raise HTTPException(status_code=403, detail="Cannot approve your own overlay (dual control)")

    overlay.status = "APPROVED"
    overlay.approved_by = current_user.user_id
    overlay.approved_at = datetime.now(timezone.utc)

    await write_audit_event(
        db, "OVERLAY_APPROVE", "overlay", overlay_id, current_user.user_id,
        after_state={"status": "APPROVED"},
    )
    await db.commit()
    await db.refresh(overlay)
    return overlay


@router.post("/{overlay_id}/reject", response_model=OverlayOut)
async def reject_overlay(
    overlay_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("overlays:approve")),
):
    """Reject a pending management overlay."""
    result = await db.execute(select(ManagementOverlay).where(ManagementOverlay.overlay_id == overlay_id))
    overlay = result.scalar_one_or_none()
    if not overlay:
        raise NotFoundException(f"Overlay {overlay_id} not found")
    if overlay.status != "PENDING":
        raise HTTPException(status_code=409, detail=f"Overlay is {overlay.status}, not PENDING")
    if overlay.submitted_by == current_user.user_id:
        raise HTTPException(status_code=403, detail="Cannot reject your own overlay (dual control)")

    overlay.status = "REJECTED"
    overlay.approved_by = current_user.user_id
    overlay.approved_at = datetime.now(timezone.utc)

    await write_audit_event(
        db, "OVERLAY_REJECT", "overlay", overlay_id, current_user.user_id,
        after_state={"status": "REJECTED"},
    )
    await db.commit()
    await db.refresh(overlay)
    return overlay


@router.post("/{overlay_id}/expire", response_model=OverlayOut)
async def expire_overlay(
    overlay_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("overlays:expire")),
):
    """Expire an approved overlay."""
    result = await db.execute(select(ManagementOverlay).where(ManagementOverlay.overlay_id == overlay_id))
    overlay = result.scalar_one_or_none()
    if not overlay:
        raise NotFoundException(f"Overlay {overlay_id} not found")
    if overlay.status != "APPROVED":
        raise HTTPException(status_code=409, detail=f"Overlay is {overlay.status}, not APPROVED")

    overlay.status = "EXPIRED"
    await write_audit_event(
        db, "OVERLAY_EXPIRE", "overlay", overlay_id, current_user.user_id,
        after_state={"status": "EXPIRED"},
    )
    await db.commit()
    await db.refresh(overlay)
    return overlay
