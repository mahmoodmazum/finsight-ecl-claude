"""Model Governance router — model registry, backtesting, roadmap."""
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
from app.models.model_governance import MLModel

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class MLModelOut(BaseModel):
    model_id: str
    model_name: str
    model_type: str
    method: Optional[str] = None
    version: str
    gini_coefficient: Optional[Decimal] = None
    ks_statistic: Optional[Decimal] = None
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    status: str
    notes: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class MLModelCreate(BaseModel):
    model_id: str
    model_name: str
    model_type: str
    method: Optional[str] = None
    version: str
    gini_coefficient: Optional[Decimal] = None
    ks_statistic: Optional[Decimal] = None
    notes: Optional[str] = None


class MLModelUpdate(BaseModel):
    model_name: Optional[str] = None
    method: Optional[str] = None
    version: Optional[str] = None
    gini_coefficient: Optional[Decimal] = None
    ks_statistic: Optional[Decimal] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class BacktestRow(BaseModel):
    model_id: str
    model_name: str
    model_type: str
    version: str
    gini_coefficient: Optional[Decimal] = None
    ks_statistic: Optional[Decimal] = None
    status: str


class RoadmapItem(BaseModel):
    model_id: str
    model_name: str
    model_type: str
    current_status: str
    version: str


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/models", response_model=list[MLModelOut])
async def list_models(
    model_type: Optional[str] = Query(None, pattern=r"^(PD|LGD|EAD|MACRO)$"),
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("governance:view")),
):
    """List all ML models in the registry."""
    q = select(MLModel)
    if model_type:
        q = q.where(MLModel.model_type == model_type)
    if status:
        q = q.where(MLModel.status == status)
    q = q.order_by(MLModel.model_type, MLModel.model_id)
    result = await db.execute(q)
    return result.scalars().all()


@router.post("/models", response_model=MLModelOut, status_code=201)
async def create_model(
    body: MLModelCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("governance:model:create")),
):
    """Register a new ML model."""
    existing = await db.execute(select(MLModel).where(MLModel.model_id == body.model_id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Model '{body.model_id}' already exists")

    model = MLModel(
        model_id=body.model_id,
        model_name=body.model_name,
        model_type=body.model_type,
        method=body.method,
        version=body.version,
        gini_coefficient=body.gini_coefficient,
        ks_statistic=body.ks_statistic,
        status="DEVELOPMENT",
        notes=body.notes,
        created_by=current_user.user_id,
    )
    db.add(model)
    await write_audit_event(
        db, "MODEL_CREATE", "ml_model", model.model_id, current_user.user_id,
        after_state={"model_name": model.model_name, "model_type": model.model_type},
    )
    await db.commit()
    await db.refresh(model)
    return model


@router.put("/models/{model_id}", response_model=MLModelOut)
async def update_model(
    model_id: str,
    body: MLModelUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("governance:model:edit")),
):
    """Update a model registration."""
    result = await db.execute(select(MLModel).where(MLModel.model_id == model_id))
    model = result.scalar_one_or_none()
    if not model:
        raise NotFoundException(f"Model {model_id} not found")

    before = {"status": model.status, "version": model.version}
    for field, val in body.model_dump(exclude_none=True).items():
        setattr(model, field, val)

    await write_audit_event(
        db, "MODEL_UPDATE", "ml_model", model_id, current_user.user_id,
        before_state=before,
        after_state={"status": model.status, "version": model.version},
    )
    await db.commit()
    await db.refresh(model)
    return model


@router.post("/models/{model_id}/approve", response_model=MLModelOut)
async def approve_model(
    model_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("governance:model:edit")),
):
    """Approve a model for production use."""
    result = await db.execute(select(MLModel).where(MLModel.model_id == model_id))
    model = result.scalar_one_or_none()
    if not model:
        raise NotFoundException(f"Model {model_id} not found")
    if model.status == "PRODUCTION":
        raise HTTPException(status_code=409, detail="Model already in production")

    model.status = "PRODUCTION"
    model.approved_by = current_user.user_id
    model.approved_at = datetime.now(timezone.utc)

    await write_audit_event(
        db, "MODEL_APPROVE", "ml_model", model_id, current_user.user_id,
        after_state={"status": "PRODUCTION"},
    )
    await db.commit()
    await db.refresh(model)
    return model


@router.get("/backtesting", response_model=list[BacktestRow])
async def get_backtesting(
    model_type: Optional[str] = Query(None, pattern=r"^(PD|LGD|EAD|MACRO)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("governance:view")),
):
    """Return model performance metrics for backtesting review."""
    q = select(MLModel).where(MLModel.status.in_(["VALIDATION", "PRODUCTION"]))
    if model_type:
        q = q.where(MLModel.model_type == model_type)
    result = await db.execute(q.order_by(MLModel.model_type, MLModel.model_id))
    return [
        BacktestRow(
            model_id=m.model_id,
            model_name=m.model_name,
            model_type=m.model_type,
            version=m.version,
            gini_coefficient=m.gini_coefficient,
            ks_statistic=m.ks_statistic,
            status=m.status,
        )
        for m in result.scalars().all()
    ]


@router.get("/roadmap", response_model=list[RoadmapItem])
async def get_roadmap(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("governance:view")),
):
    """Return model development roadmap / status overview."""
    result = await db.execute(select(MLModel).order_by(MLModel.model_type, MLModel.model_id))
    return [
        RoadmapItem(
            model_id=m.model_id,
            model_name=m.model_name,
            model_type=m.model_type,
            current_status=m.status,
            version=m.version,
        )
        for m in result.scalars().all()
    ]
