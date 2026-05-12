"""
Staging Engine — assigns IFRS 9 Stage 1 / 2 / 3 to each loan account.
Pure-Python logic; no FastAPI dependencies so it can be unit-tested independently.
"""

from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.models.loan import LoanAccount
from app.models.staging import StagingResult


# Stage 3: Credit-impaired / IFRS default
STAGE3_CL_STATUSES = {"SS", "DF", "BL"}

# Stage 2: SICR only, excluding SS/DF/BL
STAGE2_CL_STATUSES = set()


def normalize_cl_status(cl_status: Optional[str]) -> Optional[str]:
    """
    Normalize classification status to avoid mismatch due to lowercase or spaces.
    Example: ' ss ' -> 'SS'
    """
    if cl_status is None:
        return None

    cl_status = cl_status.strip().upper()
    return cl_status if cl_status else None


def assign_stage(
    dpd: Optional[int],
    cl_status: Optional[str],
    crr_rating: Optional[int],
    is_watchlist: bool,
    is_forbearance: bool,
) -> tuple[int, bool, bool]:
    """
    Returns (stage, ifrs_default_flag, sicr_flag).

    Priority:
    Stage 3 / IFRS Default > Stage 2 / SICR > Stage 1

    Stage 3:
    - DPD >= 90
    - CL Status in SS, DF, BL

    Stage 2:
    - DPD >= 30 and below 90
    - Watchlist
    - Forbearance
    - CRR Rating >= 5

    Stage 1:
    - All other performing accounts
    """

    dpd = dpd or 0
    cl_status = normalize_cl_status(cl_status)

    # Stage 3: IFRS 9 Default / Credit-impaired
    ifrs_default = (
        dpd >= 90
        or bool(cl_status and cl_status in STAGE3_CL_STATUSES)
    )

    if ifrs_default:
        return 3, True, True

    # Stage 2: Significant Increase in Credit Risk
    sicr = (
        dpd >= 30
        or is_watchlist
        or is_forbearance
        or (crr_rating is not None and crr_rating >= 5)
    )

    if sicr:
        return 2, False, True

    # Stage 1: Performing
    return 1, False, False


async def run_staging(
    month: str,
    db: AsyncSession,
    created_by: str,
    loans: Optional[List[LoanAccount]] = None,
) -> List[StagingResult]:
    """
    Run the staging engine for the given reporting month.

    Deletes existing non-overridden staging_results for the month,
    then re-computes staging from loan data.

    Caller is responsible for commit.
    """

    if loans is None:
        result = await db.execute(
            select(LoanAccount).where(
                LoanAccount.reporting_month == month
            )
        )
        loans = result.scalars().all()

    # Delete existing system-generated results only.
    # Manual override records will remain unchanged.
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

        staging_result = StagingResult(
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

        db.add(staging_result)
        results.append(staging_result)

    return results