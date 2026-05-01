"""Segmentation router — segments, PD parameters, LGD rules."""
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.dependencies import get_db
from app.core.rbac import require_permission
from app.core.audit import write_audit_event
from app.core.exceptions import NotFoundException
from app.auth.models import User
from app.models.segment import Segment
from app.models.staging import PDParameter, LGDParameter, TransitionMatrix

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class SegmentOut(BaseModel):
    segment_id: str
    segment_name: str
    assessment_method: str
    collateral_type: Optional[str] = None
    rating_band: Optional[str] = None
    unsecured_lgd_floor: Decimal
    ccf: Decimal
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class SegmentUpdate(BaseModel):
    segment_name: Optional[str] = None
    assessment_method: Optional[str] = None
    collateral_type: Optional[str] = None
    rating_band: Optional[str] = None
    unsecured_lgd_floor: Optional[Decimal] = None
    ccf: Optional[Decimal] = None
    is_active: Optional[bool] = None


class PDParameterOut(BaseModel):
    pd_param_id: str
    segment_id: str
    reporting_month: str
    observation_no: int
    start_month: str
    end_month: str
    total_accounts: int
    default_accounts: int
    raw_pd: Decimal
    observation_weight: Decimal
    weighted_pd: Decimal

    model_config = {"from_attributes": True}


class PDParameterCreate(BaseModel):
    segment_id: str
    reporting_month: str
    observation_no: int
    start_month: str
    end_month: str
    total_accounts: int
    default_accounts: int
    observation_weight: Decimal


class PDParameterUpdate(BaseModel):
    observation_no: Optional[int] = None
    start_month: Optional[str] = None
    end_month: Optional[str] = None
    total_accounts: Optional[int] = None
    default_accounts: Optional[int] = None
    observation_weight: Optional[Decimal] = None


class LGDParameterOut(BaseModel):
    lgd_id: str
    segment_id: str
    reporting_month: str
    security_tier: str
    lgd_value: Decimal
    haircut_pct: Decimal
    is_active: bool

    model_config = {"from_attributes": True}


class LGDParameterCreate(BaseModel):
    segment_id: str
    reporting_month: str
    security_tier: str
    lgd_value: Decimal
    haircut_pct: Decimal
    is_active: bool = True


class LGDParameterUpdate(BaseModel):
    security_tier: Optional[str] = None
    lgd_value: Optional[Decimal] = None
    haircut_pct: Optional[Decimal] = None
    is_active: Optional[bool] = None


class TransitionMatrixOut(BaseModel):
    matrix_id: str
    segment_id: str
    reporting_month: str
    from_state: str
    to_state: str
    count: int
    transition_probability: Decimal

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Segments
# ---------------------------------------------------------------------------

@router.get("/segments", response_model=list[SegmentOut])
async def list_segments(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("segmentation:view")),
):
    """List all loan segments."""
    result = await db.execute(select(Segment).order_by(Segment.segment_id))
    return result.scalars().all()


@router.put("/segments/{segment_id}", response_model=SegmentOut)
async def update_segment(
    segment_id: str,
    body: SegmentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("segmentation:edit")),
):
    """Update segment configuration."""
    result = await db.execute(select(Segment).where(Segment.segment_id == segment_id))
    segment = result.scalar_one_or_none()
    if not segment:
        raise NotFoundException(f"Segment {segment_id} not found")

    before = {
        "segment_name": segment.segment_name,
        "unsecured_lgd_floor": str(segment.unsecured_lgd_floor),
        "ccf": str(segment.ccf),
    }

    for field, val in body.model_dump(exclude_none=True).items():
        setattr(segment, field, val)

    await write_audit_event(
        db, "SEGMENT_UPDATE", "segment", segment_id, current_user.user_id,
        before_state=before,
        after_state={"segment_name": segment.segment_name, "unsecured_lgd_floor": str(segment.unsecured_lgd_floor)},
    )
    await db.commit()
    await db.refresh(segment)
    return segment


# ---------------------------------------------------------------------------
# PD Parameters (GET aliases + CRUD)
# ---------------------------------------------------------------------------

def _calc_pd(total: int, default: int, weight: Decimal):
    raw = Decimal(str(default)) / Decimal(str(total)) if total > 0 else Decimal("0")
    weighted = (raw * weight).quantize(Decimal("0.000001"))
    return raw.quantize(Decimal("0.000001")), weighted


@router.get("/pd-parameters", response_model=list[PDParameterOut])
async def get_pd_parameters(
    month: str,
    segment_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("segmentation:view")),
):
    """PD parameters for a reporting month."""
    q = select(PDParameter).where(PDParameter.reporting_month == month)
    if segment_id:
        q = q.where(PDParameter.segment_id == segment_id)
    q = q.order_by(PDParameter.segment_id, PDParameter.observation_no)
    result = await db.execute(q)
    return result.scalars().all()


@router.post("/pd-parameters", response_model=PDParameterOut, status_code=201)
async def create_pd_parameter(
    body: PDParameterCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("segmentation:edit")),
):
    """Create a new PD parameter observation."""
    raw_pd, weighted_pd = _calc_pd(body.total_accounts, body.default_accounts, body.observation_weight)
    param = PDParameter(
        pd_param_id=str(uuid.uuid4()),
        segment_id=body.segment_id,
        reporting_month=body.reporting_month,
        observation_no=body.observation_no,
        start_month=body.start_month,
        end_month=body.end_month,
        total_accounts=body.total_accounts,
        default_accounts=body.default_accounts,
        raw_pd=raw_pd,
        observation_weight=body.observation_weight,
        weighted_pd=weighted_pd,
        created_by=current_user.user_id,
    )
    db.add(param)
    await write_audit_event(
        db, "PARAMETER_UPDATE", "pd_parameter", param.pd_param_id, current_user.user_id,
        after_state={
            "segment_id": body.segment_id,
            "reporting_month": body.reporting_month,
            "observation_no": body.observation_no,
            "raw_pd": str(raw_pd),
            "weighted_pd": str(weighted_pd),
        },
    )
    await db.commit()
    await db.refresh(param)
    return param


@router.put("/pd-parameters/{pd_param_id}", response_model=PDParameterOut)
async def update_pd_parameter(
    pd_param_id: str,
    body: PDParameterUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("segmentation:edit")),
):
    """Update a PD parameter observation."""
    result = await db.execute(select(PDParameter).where(PDParameter.pd_param_id == pd_param_id))
    param = result.scalar_one_or_none()
    if not param:
        raise NotFoundException(f"PD parameter {pd_param_id} not found")

    before = {"raw_pd": str(param.raw_pd), "weighted_pd": str(param.weighted_pd)}

    for field, val in body.model_dump(exclude_none=True).items():
        setattr(param, field, val)

    raw_pd, weighted_pd = _calc_pd(param.total_accounts, param.default_accounts, param.observation_weight)
    param.raw_pd = raw_pd
    param.weighted_pd = weighted_pd

    await write_audit_event(
        db, "PARAMETER_UPDATE", "pd_parameter", pd_param_id, current_user.user_id,
        before_state=before,
        after_state={"raw_pd": str(raw_pd), "weighted_pd": str(weighted_pd)},
    )
    await db.commit()
    await db.refresh(param)
    return param


@router.delete("/pd-parameters/{pd_param_id}", status_code=204)
async def delete_pd_parameter(
    pd_param_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("segmentation:edit")),
):
    """Delete a PD parameter observation."""
    result = await db.execute(select(PDParameter).where(PDParameter.pd_param_id == pd_param_id))
    param = result.scalar_one_or_none()
    if not param:
        raise NotFoundException(f"PD parameter {pd_param_id} not found")

    before = {"segment_id": param.segment_id, "reporting_month": param.reporting_month, "observation_no": param.observation_no}
    await db.delete(param)
    await write_audit_event(
        db, "PARAMETER_UPDATE", "pd_parameter", pd_param_id, current_user.user_id,
        before_state=before,
        notes="PD parameter deleted",
    )
    await db.commit()


# ---------------------------------------------------------------------------
# LGD Parameters (GET aliases + CRUD)
# ---------------------------------------------------------------------------

@router.get("/lgd-rules", response_model=list[LGDParameterOut])
async def get_lgd_rules(
    month: str,
    segment_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("segmentation:view")),
):
    """LGD rules for a reporting month."""
    q = select(LGDParameter).where(LGDParameter.reporting_month == month)
    if segment_id:
        q = q.where(LGDParameter.segment_id == segment_id)
    q = q.order_by(LGDParameter.segment_id, LGDParameter.security_tier)
    result = await db.execute(q)
    return result.scalars().all()


@router.post("/lgd-parameters", response_model=LGDParameterOut, status_code=201)
async def create_lgd_parameter(
    body: LGDParameterCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("segmentation:edit")),
):
    """Create a new LGD parameter."""
    param = LGDParameter(
        lgd_id=str(uuid.uuid4()),
        segment_id=body.segment_id,
        reporting_month=body.reporting_month,
        security_tier=body.security_tier,
        lgd_value=body.lgd_value,
        haircut_pct=body.haircut_pct,
        is_active=body.is_active,
        created_by=current_user.user_id,
    )
    db.add(param)
    await write_audit_event(
        db, "PARAMETER_UPDATE", "lgd_parameter", param.lgd_id, current_user.user_id,
        after_state={
            "segment_id": body.segment_id,
            "reporting_month": body.reporting_month,
            "security_tier": body.security_tier,
            "lgd_value": str(body.lgd_value),
        },
    )
    await db.commit()
    await db.refresh(param)
    return param


@router.put("/lgd-parameters/{lgd_id}", response_model=LGDParameterOut)
async def update_lgd_parameter(
    lgd_id: str,
    body: LGDParameterUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("segmentation:edit")),
):
    """Update an LGD parameter."""
    result = await db.execute(select(LGDParameter).where(LGDParameter.lgd_id == lgd_id))
    param = result.scalar_one_or_none()
    if not param:
        raise NotFoundException(f"LGD parameter {lgd_id} not found")

    before = {"lgd_value": str(param.lgd_value), "haircut_pct": str(param.haircut_pct), "security_tier": param.security_tier}
    for field, val in body.model_dump(exclude_none=True).items():
        setattr(param, field, val)

    await write_audit_event(
        db, "PARAMETER_UPDATE", "lgd_parameter", lgd_id, current_user.user_id,
        before_state=before,
        after_state={"lgd_value": str(param.lgd_value), "haircut_pct": str(param.haircut_pct)},
    )
    await db.commit()
    await db.refresh(param)
    return param


@router.delete("/lgd-parameters/{lgd_id}", status_code=204)
async def delete_lgd_parameter(
    lgd_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("segmentation:edit")),
):
    """Delete an LGD parameter."""
    result = await db.execute(select(LGDParameter).where(LGDParameter.lgd_id == lgd_id))
    param = result.scalar_one_or_none()
    if not param:
        raise NotFoundException(f"LGD parameter {lgd_id} not found")

    before = {"segment_id": param.segment_id, "reporting_month": param.reporting_month, "security_tier": param.security_tier}
    await db.delete(param)
    await write_audit_event(
        db, "PARAMETER_UPDATE", "lgd_parameter", lgd_id, current_user.user_id,
        before_state=before,
        notes="LGD parameter deleted",
    )
    await db.commit()


# ---------------------------------------------------------------------------
# Legacy aliases
# ---------------------------------------------------------------------------

@router.get("/rating-mapping", response_model=list[PDParameterOut])
async def get_rating_mapping(
    month: str,
    segment_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("segmentation:view")),
):
    q = select(PDParameter).where(PDParameter.reporting_month == month)
    if segment_id:
        q = q.where(PDParameter.segment_id == segment_id)
    q = q.order_by(PDParameter.segment_id, PDParameter.observation_no)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/rules", response_model=list[LGDParameterOut])
async def get_rules(
    month: str,
    segment_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("segmentation:view")),
):
    q = select(LGDParameter).where(LGDParameter.reporting_month == month)
    if segment_id:
        q = q.where(LGDParameter.segment_id == segment_id)
    q = q.order_by(LGDParameter.segment_id, LGDParameter.security_tier)
    result = await db.execute(q)
    return result.scalars().all()
