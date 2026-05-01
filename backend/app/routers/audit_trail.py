"""Audit Trail router — immutable audit log + risk register CRUD."""
import uuid
from datetime import date, datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text

from app.core.dependencies import get_db
from app.core.rbac import require_permission
from app.core.audit import write_audit_event
from app.core.exceptions import NotFoundException
from app.auth.models import User
from app.models.audit import RiskRegister

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class AuditLogEntry(BaseModel):
    log_id: int
    event_type: str
    entity_type: str
    entity_id: str
    user_id: Optional[str] = None
    user_ip: Optional[str] = None
    before_state: Optional[str] = None
    after_state: Optional[str] = None
    event_at: datetime
    notes: Optional[str] = None


class AuditLogPage(BaseModel):
    items: list[AuditLogEntry]
    total: int
    page: int
    page_size: int


class RiskRegisterOut(BaseModel):
    risk_id: str
    risk_title: str
    description: Optional[str] = None
    category: str
    rating: str
    mitigation: Optional[str] = None
    owner: Optional[str] = None
    status: str
    target_date: Optional[date] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class RiskCreate(BaseModel):
    risk_title: str
    description: Optional[str] = None
    category: str
    rating: str
    mitigation: Optional[str] = None
    owner: Optional[str] = None
    target_date: Optional[date] = None


class RiskUpdate(BaseModel):
    risk_title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    rating: Optional[str] = None
    mitigation: Optional[str] = None
    owner: Optional[str] = None
    status: Optional[str] = None
    target_date: Optional[date] = None


# ---------------------------------------------------------------------------
# Audit Log — read-only via raw SQL (immutable table)
# ---------------------------------------------------------------------------

@router.get("/log", response_model=AuditLogPage)
async def get_audit_log(
    event_type: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("audit:log:view")),
):
    """Return paginated, immutable audit log entries."""
    where_clauses = []
    params: dict = {}

    if event_type:
        where_clauses.append("event_type = :event_type")
        params["event_type"] = event_type
    if entity_type:
        where_clauses.append("entity_type = :entity_type")
        params["entity_type"] = entity_type
    if user_id:
        where_clauses.append("user_id = :user_id")
        params["user_id"] = user_id

    where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

    count_result = await db.execute(
        text(f"SELECT COUNT(*) FROM audit_log {where_sql}"), params
    )
    total = count_result.scalar_one()

    offset = (page - 1) * page_size
    rows_result = await db.execute(
        text(
            f"SELECT log_id, event_type, entity_type, entity_id, user_id, user_ip, "
            f"before_state, after_state, event_at, notes "
            f"FROM audit_log {where_sql} "
            f"ORDER BY event_at DESC "
            f"OFFSET {offset} ROWS FETCH NEXT {page_size} ROWS ONLY"
        ),
        params,
    )
    items = [
        AuditLogEntry(
            log_id=r[0],
            event_type=r[1],
            entity_type=r[2],
            entity_id=r[3],
            user_id=r[4],
            user_ip=r[5],
            before_state=r[6],
            after_state=r[7],
            event_at=r[8],
            notes=r[9],
        )
        for r in rows_result
    ]

    return AuditLogPage(items=items, total=total, page=page, page_size=page_size)


# ---------------------------------------------------------------------------
# Risk Register
# ---------------------------------------------------------------------------

@router.get("/risk-register", response_model=list[RiskRegisterOut])
async def list_risks(
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("audit:register:view")),
):
    q = select(RiskRegister)
    if status:
        q = q.where(RiskRegister.status == status)
    if category:
        q = q.where(RiskRegister.category == category)
    result = await db.execute(q.order_by(RiskRegister.created_at.desc()))
    return result.scalars().all()


@router.post("/risk-register", response_model=RiskRegisterOut, status_code=201)
async def create_risk(
    body: RiskCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("audit:register:edit")),
):
    risk = RiskRegister(
        risk_id=str(uuid.uuid4()),
        risk_title=body.risk_title,
        description=body.description,
        category=body.category,
        rating=body.rating,
        mitigation=body.mitigation,
        owner=body.owner,
        status="OPEN",
        target_date=body.target_date,
        created_by=current_user.user_id,
    )
    db.add(risk)
    await write_audit_event(
        db, "RISK_CREATE", "risk_register", risk.risk_id, current_user.user_id,
        after_state={"risk_title": risk.risk_title, "rating": risk.rating},
    )
    await db.commit()
    await db.refresh(risk)
    return risk


@router.put("/risk-register/{risk_id}", response_model=RiskRegisterOut)
async def update_risk(
    risk_id: str,
    body: RiskUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("audit:register:edit")),
):
    result = await db.execute(select(RiskRegister).where(RiskRegister.risk_id == risk_id))
    risk = result.scalar_one_or_none()
    if not risk:
        raise NotFoundException(f"Risk {risk_id} not found")

    before = {"status": risk.status, "rating": risk.rating}
    for field, val in body.model_dump(exclude_none=True).items():
        setattr(risk, field, val)

    await write_audit_event(
        db, "RISK_UPDATE", "risk_register", risk_id, current_user.user_id,
        before_state=before,
        after_state={"status": risk.status, "rating": risk.rating},
    )
    await db.commit()
    await db.refresh(risk)
    return risk


@router.delete("/risk-register/{risk_id}", status_code=204)
async def delete_risk(
    risk_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("audit:register:edit")),
):
    result = await db.execute(select(RiskRegister).where(RiskRegister.risk_id == risk_id))
    risk = result.scalar_one_or_none()
    if not risk:
        raise NotFoundException(f"Risk {risk_id} not found")

    await write_audit_event(
        db, "RISK_DELETE", "risk_register", risk_id, current_user.user_id,
        before_state={"risk_title": risk.risk_title, "status": risk.status},
    )
    await db.delete(risk)
    await db.commit()
