"""ECL Calculation router.

Endpoints:
  POST   /ecl/run?month=YYYYMM            Trigger async ECL run (ANALYST+)
  GET    /ecl/run/{run_id}/status         Poll run status
  GET    /ecl/results                     Account-level ECL results (paginated)
  GET    /ecl/portfolio-summary           Aggregated summary by segment / stage
  GET    /ecl/parameters                  LGD + CCF parameters for a month
  PUT    /ecl/parameters                  Update LGD parameter values (ANALYST+)
"""
import asyncio
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.dependencies import get_db
from app.core.rbac import require_permission
from app.core.exceptions import NotFoundException
from app.core.audit import write_audit_event
from app.auth.models import User
from app.models.provision import ProvisionRun
from app.models.ecl import ECLResult
from app.models.staging import LGDParameter
from app.models.loan import LoanAccount
from app.models.segment import Segment
from app.schemas.ecl import (
    ECLRunResponse,
    ECLRunStatusResponse,
    ECLResultPage,
    ECLResultRow,
    PortfolioSummary,
    SegmentSummary,
    ParametersResponse,
    LGDParameterUpdate,
    LGDParameterRow,
)
from app.services.ecl_engine import ECLEngine

router = APIRouter()
ecl_engine = ECLEngine()


def _validate_month(month: str) -> str:
    if not (len(month) == 6 and month.isdigit()):
        raise HTTPException(status_code=422, detail="month must be YYYYMM format")
    return month


# ---------------------------------------------------------------------------
# POST /ecl/run
# ---------------------------------------------------------------------------

@router.post("/run", status_code=202, response_model=ECLRunResponse)
async def trigger_ecl_run(
    background_tasks: BackgroundTasks,
    month: str = Query(..., description="Reporting month YYYYMM"),
    run_type: str = Query("MONTH_END", description="MONTH_END | INTRAMONTH | TEST"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("ecl:run")),
):
    """
    Trigger a full IFRS 9 ECL calculation for the given reporting month.
    Returns 202 with run_id. Poll GET /ecl/run/{run_id}/status for completion.
    """
    _validate_month(month)
    if run_type not in ("MONTH_END", "INTRAMONTH", "TEST"):
        raise HTTPException(status_code=422, detail="Invalid run_type")

    run_id = str(uuid.uuid4())
    run = ProvisionRun(
        run_id=run_id,
        reporting_month=month,
        run_type=run_type,
        status="QUEUED",
        initiated_by=current_user.user_id,
        initiated_at=datetime.now(timezone.utc),
        created_by=current_user.user_id,
    )
    db.add(run)

    await write_audit_event(
        db=db,
        event_type="ECL_RUN_INITIATED",
        entity_type="provision_run",
        entity_id=run_id,
        user_id=current_user.user_id,
        after_state={"run_id": run_id, "month": month, "run_type": run_type},
        notes=f"ECL run initiated for month {month}",
    )
    await db.commit()

    # Launch background task — engine opens its own session
    background_tasks.add_task(
        ecl_engine.run_full_ecl, run_id, month, current_user.user_id
    )

    # Reload to get server-set fields
    result = await db.execute(
        select(ProvisionRun).where(ProvisionRun.run_id == run_id)
    )
    return result.scalar_one()


# ---------------------------------------------------------------------------
# GET /ecl/run/{run_id}/status
# ---------------------------------------------------------------------------

@router.get("/run/{run_id}/status", response_model=ECLRunStatusResponse)
async def get_run_status(
    run_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("ecl:view")),
):
    """Poll the status of an ECL calculation run."""
    result = await db.execute(
        select(ProvisionRun).where(ProvisionRun.run_id == run_id)
    )
    run = result.scalar_one_or_none()
    if not run:
        raise NotFoundException(f"Run {run_id} not found")
    return run


# ---------------------------------------------------------------------------
# GET /ecl/results
# ---------------------------------------------------------------------------

@router.get("/results", response_model=ECLResultPage)
async def get_ecl_results(
    month: str = Query(..., description="Reporting month YYYYMM"),
    segment: Optional[str] = Query(None),
    stage: Optional[int] = Query(None, ge=1, le=3),
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("ecl:view")),
):
    """Return paginated account-level ECL results for a reporting month."""
    _validate_month(month)

    base_q = (
        select(ECLResult)
        .join(LoanAccount, ECLResult.loan_id == LoanAccount.loan_id)
        .where(ECLResult.reporting_month == month)
    )
    if stage is not None:
        base_q = base_q.where(ECLResult.stage == stage)
    if segment:
        base_q = base_q.where(LoanAccount.segment_id == segment)

    count_result = await db.execute(
        select(func.count()).select_from(base_q.subquery())
    )
    total = count_result.scalar_one()

    rows_result = await db.execute(
        base_q.order_by(ECLResult.ecl_id)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    rows = rows_result.scalars().all()
    pages = max(1, -(-total // page_size))  # ceiling division

    return ECLResultPage(
        items=[ECLResultRow.model_validate(r) for r in rows],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


# ---------------------------------------------------------------------------
# GET /ecl/portfolio-summary
# ---------------------------------------------------------------------------

@router.get("/portfolio-summary", response_model=PortfolioSummary)
async def get_portfolio_summary(
    month: str = Query(..., description="Reporting month YYYYMM"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("ecl:view")),
):
    """Aggregated ECL portfolio summary by stage and segment."""
    _validate_month(month)

    # Overall totals
    totals_result = await db.execute(
        select(
            func.count(ECLResult.ecl_id),
            func.sum(ECLResult.ead),
            func.sum(ECLResult.ecl_weighted),
            func.sum(
                func.iif(ECLResult.stage == 1, ECLResult.ecl_weighted, Decimal("0"))
            ),
            func.sum(
                func.iif(ECLResult.stage == 2, ECLResult.ecl_weighted, Decimal("0"))
            ),
            func.sum(
                func.iif(ECLResult.stage == 3, ECLResult.ecl_weighted, Decimal("0"))
            ),
            func.sum(func.iif(ECLResult.stage == 1, 1, 0)),
            func.sum(func.iif(ECLResult.stage == 2, 1, 0)),
            func.sum(func.iif(ECLResult.stage == 3, 1, 0)),
        ).where(ECLResult.reporting_month == month)
    )
    row = totals_result.one()
    (
        total_loans, total_ead, total_ecl,
        s1_ecl, s2_ecl, s3_ecl,
        s1_cnt, s2_cnt, s3_cnt,
    ) = row

    # Per-segment aggregation
    seg_result = await db.execute(
        select(
            LoanAccount.segment_id,
            func.count(ECLResult.ecl_id),
            func.sum(ECLResult.ead),
            func.avg(ECLResult.pd_12m),
            func.avg(ECLResult.lgd),
            func.sum(ECLResult.ecl_weighted),
            func.sum(
                func.iif(ECLResult.stage == 1, ECLResult.ecl_weighted, Decimal("0"))
            ),
            func.sum(
                func.iif(ECLResult.stage == 2, ECLResult.ecl_weighted, Decimal("0"))
            ),
            func.sum(
                func.iif(ECLResult.stage == 3, ECLResult.ecl_weighted, Decimal("0"))
            ),
        )
        .join(LoanAccount, ECLResult.loan_id == LoanAccount.loan_id)
        .where(ECLResult.reporting_month == month)
        .group_by(LoanAccount.segment_id)
    )

    by_segment = []
    for seg_row in seg_result:
        (
            seg_id, cnt, ead, avg_pd, avg_lgd, ecl_w,
            seg_s1, seg_s2, seg_s3
        ) = seg_row
        by_segment.append(SegmentSummary(
            segment_id=seg_id or "UNKNOWN",
            loan_count=cnt or 0,
            total_ead=ead or Decimal("0"),
            avg_pd_12m=avg_pd or Decimal("0"),
            avg_lgd=avg_lgd or Decimal("0"),
            total_ecl_weighted=ecl_w or Decimal("0"),
            stage1_ecl=seg_s1 or Decimal("0"),
            stage2_ecl=seg_s2 or Decimal("0"),
            stage3_ecl=seg_s3 or Decimal("0"),
        ))

    return PortfolioSummary(
        reporting_month=month,
        total_loans=total_loans or 0,
        total_ead=total_ead or Decimal("0"),
        total_ecl=total_ecl or Decimal("0"),
        stage1_ecl=s1_ecl or Decimal("0"),
        stage2_ecl=s2_ecl or Decimal("0"),
        stage3_ecl=s3_ecl or Decimal("0"),
        stage1_count=s1_cnt or 0,
        stage2_count=s2_cnt or 0,
        stage3_count=s3_cnt or 0,
        by_segment=by_segment,
    )


# ---------------------------------------------------------------------------
# GET /ecl/parameters
# ---------------------------------------------------------------------------

@router.get("/parameters", response_model=ParametersResponse)
async def get_parameters(
    month: str = Query(..., description="Reporting month YYYYMM"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("ecl:view")),
):
    """Return LGD parameters for the given reporting month."""
    _validate_month(month)

    result = await db.execute(
        select(LGDParameter)
        .where(
            LGDParameter.reporting_month == month,
            LGDParameter.is_active == True,  # noqa: E712
        )
        .order_by(LGDParameter.segment_id, LGDParameter.security_tier)
    )
    params = result.scalars().all()

    return ParametersResponse(
        reporting_month=month,
        lgd_parameters=[LGDParameterRow.model_validate(p) for p in params],
    )


# ---------------------------------------------------------------------------
# PUT /ecl/parameters
# ---------------------------------------------------------------------------

@router.put("/parameters", response_model=ParametersResponse)
async def update_parameters(
    month: str = Query(..., description="Reporting month YYYYMM"),
    updates: list[LGDParameterUpdate] = ...,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("ecl:parameters:edit")),
):
    """Update LGD parameter values. Triggers an audit log entry per change."""
    _validate_month(month)

    updated = []
    for upd in updates:
        result = await db.execute(
            select(LGDParameter).where(LGDParameter.lgd_id == upd.lgd_id)
        )
        param = result.scalar_one_or_none()
        if not param:
            raise NotFoundException(f"LGD parameter {upd.lgd_id} not found")

        before = {"lgd_value": str(param.lgd_value), "haircut_pct": str(param.haircut_pct)}
        param.lgd_value = upd.lgd_value
        param.haircut_pct = upd.haircut_pct

        await write_audit_event(
            db=db,
            event_type="LGD_PARAMETER_UPDATE",
            entity_type="lgd_parameter",
            entity_id=param.lgd_id,
            user_id=current_user.user_id,
            before_state=before,
            after_state={
                "lgd_value": str(upd.lgd_value),
                "haircut_pct": str(upd.haircut_pct),
            },
            notes=f"LGD parameter updated for segment {param.segment_id} / {param.security_tier}",
        )
        updated.append(param)

    await db.commit()

    result = await db.execute(
        select(LGDParameter)
        .where(
            LGDParameter.reporting_month == month,
            LGDParameter.is_active == True,  # noqa: E712
        )
        .order_by(LGDParameter.segment_id, LGDParameter.security_tier)
    )
    all_params = result.scalars().all()

    return ParametersResponse(
        reporting_month=month,
        lgd_parameters=[LGDParameterRow.model_validate(p) for p in all_params],
    )
