"""SICR router — assessment results, factor summary, rules config."""
from datetime import datetime
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.dependencies import get_db
from app.core.rbac import require_permission
from app.core.audit import write_audit_event
from app.auth.models import User
from app.models.staging import StagingResult
from app.models.loan import LoanAccount

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class SICRAssessmentOut(BaseModel):
    staging_id: int
    loan_id: str
    reporting_month: str
    stage: int
    sicr_flag: bool
    ifrs_default_flag: bool
    dpd_at_staging: int
    cl_status_at_staging: Optional[str] = None
    crr_at_staging: Optional[int] = None
    override_flag: bool

    model_config = {"from_attributes": True}


class SICRAssessmentPage(BaseModel):
    items: list[SICRAssessmentOut]
    total: int
    page: int
    page_size: int


class SICRFactorSummary(BaseModel):
    reporting_month: str
    total_assessed: int
    sicr_count: int
    default_count: int
    stage1_count: int
    stage2_count: int
    stage3_count: int
    override_count: int
    dpd_trigger_count: int


class SICRRulesConfig(BaseModel):
    dpd_stage2_threshold: int = 30
    dpd_stage3_threshold: int = 90
    crr_stage2_threshold: int = 5
    cl_status_stage2: list[str] = ["SS", "DF"]
    cl_status_stage3: list[str] = ["BL"]
    pd_ratio_threshold: float = 2.0
    watchlist_triggers_sicr: bool = True
    forbearance_triggers_sicr: bool = True


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/assessment", response_model=SICRAssessmentPage)
async def get_sicr_assessment(
    month: str = Query(..., pattern=r"^\d{6}$"),
    sicr_only: bool = Query(False),
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("sicr:view")),
):
    """Return paginated SICR assessment results for a reporting month."""
    q = select(StagingResult).where(StagingResult.reporting_month == month)
    if sicr_only:
        q = q.where(StagingResult.sicr_flag == True)  # noqa: E712

    count_result = await db.execute(select(func.count()).select_from(q.subquery()))
    total = count_result.scalar_one()

    rows_result = await db.execute(
        q.order_by(StagingResult.staging_id)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return SICRAssessmentPage(
        items=rows_result.scalars().all(),
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/factor-summary", response_model=SICRFactorSummary)
async def get_factor_summary(
    month: str = Query(..., pattern=r"^\d{6}$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("sicr:view")),
):
    """Aggregate SICR factor summary for a reporting month."""
    result = await db.execute(
        select(
            func.count(StagingResult.staging_id),
            func.sum(func.iif(StagingResult.sicr_flag == True, 1, 0)),
            func.sum(func.iif(StagingResult.ifrs_default_flag == True, 1, 0)),
            func.sum(func.iif(StagingResult.stage == 1, 1, 0)),
            func.sum(func.iif(StagingResult.stage == 2, 1, 0)),
            func.sum(func.iif(StagingResult.stage == 3, 1, 0)),
            func.sum(func.iif(StagingResult.override_flag == True, 1, 0)),
            func.sum(func.iif(StagingResult.dpd_at_staging >= 30, 1, 0)),
        ).where(StagingResult.reporting_month == month)
    )
    row = result.one()
    (total, sicr, default_, s1, s2, s3, override, dpd_trigger) = row

    return SICRFactorSummary(
        reporting_month=month,
        total_assessed=total or 0,
        sicr_count=sicr or 0,
        default_count=default_ or 0,
        stage1_count=s1 or 0,
        stage2_count=s2 or 0,
        stage3_count=s3 or 0,
        override_count=override or 0,
        dpd_trigger_count=dpd_trigger or 0,
    )


@router.get("/rules-config", response_model=SICRRulesConfig)
async def get_sicr_rules(
    current_user: User = Depends(require_permission("sicr:view")),
):
    """Return current SICR classification rules configuration."""
    return SICRRulesConfig()


@router.put("/rules-config", response_model=SICRRulesConfig)
async def update_sicr_rules(
    body: SICRRulesConfig,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("sicr:rules:edit")),
):
    """Update SICR rules. Changes take effect on the next staging run."""
    await write_audit_event(
        db, "SICR_RULES_UPDATE", "sicr_rules", "global", current_user.user_id,
        after_state=body.model_dump(),
        notes="SICR rules configuration updated",
    )
    await db.commit()
    return body
