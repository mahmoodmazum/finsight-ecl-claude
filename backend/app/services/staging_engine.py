"""
Staging Engine — assigns IFRS 9 Stage 1 / 2 / 3 to each loan account.
Pure-Python logic; no FastAPI dependencies so it can be unit-tested independently.
"""
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.models.loan import LoanAccount
from app.models.staging import StagingResult


STAGE3_CL_STATUSES = {"BL"}
STAGE2_CL_STATUSES = {"SS", "DF"}


def assign_stage(
    dpd: int,
    cl_status: Optional[str],
    crr_rating: Optional[int],
    is_watchlist: bool,
    is_forbearance: bool,
) -> tuple[int, bool, bool]:
    """
    Returns (stage, ifrs_default_flag, sicr_flag).
    Priority: Stage 3 (IFRS default) > Stage 2 (SICR) > Stage 1.
    """
    # Stage 3: IFRS 9 Default
    ifrs_default = dpd >= 90 or bool(cl_status and cl_status in STAGE3_CL_STATUSES)
    if ifrs_default:
        return 3, True, True

    # Stage 2: SICR triggered
    sicr = (
        dpd >= 30
        or bool(cl_status and cl_status in STAGE2_CL_STATUSES)
        or is_watchlist
        or is_forbearance
        or (crr_rating is not None and crr_rating >= 5)
    )
    if sicr:
        return 2, False, True

    return 1, False, False


async def run_staging(
    month: str,
    db: AsyncSession,
    created_by: str,
    loans: Optional[List[LoanAccount]] = None,
) -> List[StagingResult]:
    """
    Run the staging engine for the given reporting month.
    Deletes existing non-overridden staging_results for the month, then
    re-computes from loan data.  Caller is responsible for commit.
    """
    if loans is None:
        result = await db.execute(
            select(LoanAccount).where(LoanAccount.reporting_month == month)
        )
        loans = result.scalars().all()

    # Delete existing non-overridden results
    await db.execute(
        delete(StagingResult).where(
            StagingResult.reporting_month == month,
            StagingResult.override_flag == False,  # noqa: E712
        )
    )
    await db.flush()

    results: List[StagingResult] = []
    for loan in loans:
        stage, ifrs_default, sicr = assign_stage(
            dpd=loan.dpd,
            cl_status=loan.cl_status,
            crr_rating=loan.crr_rating,
            is_watchlist=loan.is_watchlist,
            is_forbearance=loan.is_forbearance,
        )
        sr = StagingResult(
            loan_id=loan.loan_id,
            reporting_month=month,
            stage=stage,
            ifrs_default_flag=ifrs_default,
            sicr_flag=sicr,
            dpd_at_staging=loan.dpd,
            cl_status_at_staging=loan.cl_status,
            crr_at_staging=loan.crr_rating,
            override_flag=False,
            created_by=created_by,
        )
        db.add(sr)
        results.append(sr)

    return results
