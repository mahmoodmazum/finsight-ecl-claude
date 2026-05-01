"""Dashboard router — GET /dashboard/summary."""
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.dependencies import get_db
from app.core.rbac import require_permission
from app.auth.models import User
from app.models.ecl import ECLResult
from app.models.loan import LoanAccount
from app.models.macro import MacroScenario
from app.models.provision import ProvisionRun

router = APIRouter()


class SegmentECL(BaseModel):
    segment_id: str
    ecl_weighted: Decimal
    ead: Decimal


class ScenarioWeight(BaseModel):
    scenario_name: str
    weight: Decimal
    macro_multiplier: Decimal


class RecentRun(BaseModel):
    run_id: str
    reporting_month: str
    run_type: str
    status: str
    total_ecl: Decimal
    initiated_at: Optional[str] = None

    model_config = {"from_attributes": True}


class DashboardSummary(BaseModel):
    reporting_month: str
    total_ecl: Decimal
    stage1_ecl: Decimal
    stage2_ecl: Decimal
    stage3_ecl: Decimal
    stage1_ead: Decimal
    stage2_ead: Decimal
    stage3_ead: Decimal
    stage1_pct: Decimal
    stage2_pct: Decimal
    stage3_pct: Decimal
    ecl_by_segment: list[SegmentECL]
    scenario_weights: list[ScenarioWeight]
    recent_runs: list[RecentRun]


@router.get("/summary", response_model=DashboardSummary)
async def get_dashboard_summary(
    month: str = Query(..., pattern=r"^\d{6}$", description="Reporting month YYYYMM"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("dashboard:view")),
):
    """Main dashboard summary for a reporting month."""

    # ECL totals by stage
    totals = await db.execute(
        select(
            func.isnull(func.sum(ECLResult.ecl_weighted), 0),
            func.isnull(func.sum(func.iif(ECLResult.stage == 1, ECLResult.ecl_weighted, Decimal("0"))), 0),
            func.isnull(func.sum(func.iif(ECLResult.stage == 2, ECLResult.ecl_weighted, Decimal("0"))), 0),
            func.isnull(func.sum(func.iif(ECLResult.stage == 3, ECLResult.ecl_weighted, Decimal("0"))), 0),
            func.isnull(func.sum(func.iif(ECLResult.stage == 1, ECLResult.ead, Decimal("0"))), 0),
            func.isnull(func.sum(func.iif(ECLResult.stage == 2, ECLResult.ead, Decimal("0"))), 0),
            func.isnull(func.sum(func.iif(ECLResult.stage == 3, ECLResult.ead, Decimal("0"))), 0),
        ).where(ECLResult.reporting_month == month)
    )
    row = totals.one()
    total_ecl, s1_ecl, s2_ecl, s3_ecl, s1_ead, s2_ead, s3_ead = (
        Decimal(str(v or 0)) for v in row
    )
    total_ead = s1_ead + s2_ead + s3_ead
    s1_pct = (s1_ead / total_ead * 100).quantize(Decimal("0.01")) if total_ead else Decimal("0")
    s2_pct = (s2_ead / total_ead * 100).quantize(Decimal("0.01")) if total_ead else Decimal("0")
    s3_pct = (s3_ead / total_ead * 100).quantize(Decimal("0.01")) if total_ead else Decimal("0")

    # ECL by segment
    seg_result = await db.execute(
        select(
            LoanAccount.segment_id,
            func.isnull(func.sum(ECLResult.ecl_weighted), 0),
            func.isnull(func.sum(ECLResult.ead), 0),
        )
        .join(LoanAccount, ECLResult.loan_id == LoanAccount.loan_id)
        .where(ECLResult.reporting_month == month)
        .group_by(LoanAccount.segment_id)
        .order_by(func.sum(ECLResult.ecl_weighted).desc())
    )
    ecl_by_segment = [
        SegmentECL(
            segment_id=r[0] or "UNKNOWN",
            ecl_weighted=Decimal(str(r[1] or 0)),
            ead=Decimal(str(r[2] or 0)),
        )
        for r in seg_result
    ]

    # Macro scenario weights
    macro_result = await db.execute(
        select(MacroScenario).where(
            MacroScenario.reporting_month == month,
            MacroScenario.status == "APPROVED",
        )
    )
    scenario_weights = [
        ScenarioWeight(
            scenario_name=s.scenario_name,
            weight=s.weight,
            macro_multiplier=s.macro_multiplier,
        )
        for s in macro_result.scalars()
    ]

    # Recent provision runs (last 5)
    runs_result = await db.execute(
        select(ProvisionRun)
        .where(ProvisionRun.reporting_month == month)
        .order_by(ProvisionRun.initiated_at.desc())
        .limit(5)
    )
    recent_runs = [
        RecentRun(
            run_id=r.run_id,
            reporting_month=r.reporting_month,
            run_type=r.run_type,
            status=r.status,
            total_ecl=r.total_ecl,
            initiated_at=r.initiated_at.isoformat() if r.initiated_at else None,
        )
        for r in runs_result.scalars()
    ]

    return DashboardSummary(
        reporting_month=month,
        total_ecl=total_ecl,
        stage1_ecl=s1_ecl,
        stage2_ecl=s2_ecl,
        stage3_ecl=s3_ecl,
        stage1_ead=s1_ead,
        stage2_ead=s2_ead,
        stage3_ead=s3_ead,
        stage1_pct=s1_pct,
        stage2_pct=s2_pct,
        stage3_pct=s3_pct,
        ecl_by_segment=ecl_by_segment,
        scenario_weights=scenario_weights,
        recent_runs=recent_runs,
    )


@router.get("/available-months", response_model=list[str])
async def get_available_months(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("dashboard:view")),
):
    """Return distinct reporting months that have data, sorted descending."""
    from app.models.ecl import ECLResult
    from app.models.loan import LoanAccount
    from app.models.macro import MacroScenario
    from app.models.provision import ProvisionRun
    from sqlalchemy import union_all, literal_column

    q1 = select(ECLResult.reporting_month.label("m")).distinct()
    q2 = select(LoanAccount.reporting_month.label("m")).distinct()
    q3 = select(MacroScenario.reporting_month.label("m")).distinct()
    q4 = select(ProvisionRun.reporting_month.label("m")).distinct()

    combined = union_all(q1, q2, q3, q4).subquery()
    result = await db.execute(
        select(combined.c.m).distinct().order_by(combined.c.m.desc())
    )
    return [row[0] for row in result.all() if row[0]]
