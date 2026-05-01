"""Reports router — library, generate, download, BB regulatory, IFRS 7 disclosure."""
import io
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.dependencies import get_db
from app.core.rbac import require_permission
from app.core.audit import write_audit_event
from app.auth.models import User
from app.models.ecl import ECLResult
from app.models.loan import LoanAccount
from app.models.provision import ProvisionRun

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class ReportDefinition(BaseModel):
    report_id: str
    report_name: str
    description: str
    category: str
    parameters: list[str]


class GenerateRequest(BaseModel):
    report_id: str
    month: str
    run_id: Optional[str] = None


class GenerateResponse(BaseModel):
    report_id: str
    month: str
    generated_at: datetime
    row_count: int
    status: str = "COMPLETE"


class BBRegulatoryRow(BaseModel):
    reporting_month: str
    stage: int
    total_outstanding: Decimal
    total_provision: Decimal
    provision_coverage_pct: Decimal


class IFRS7DisclosureRow(BaseModel):
    stage: int
    loan_count: int
    gross_ead: Decimal
    ecl_weighted: Decimal
    ecl_rate_pct: Decimal


# ---------------------------------------------------------------------------
# Report library
# ---------------------------------------------------------------------------

REPORT_LIBRARY: list[ReportDefinition] = [
    ReportDefinition(
        report_id="ECL_SUMMARY",
        report_name="ECL Portfolio Summary",
        description="Stage-wise ECL totals by segment for the reporting month.",
        category="IFRS9",
        parameters=["month"],
    ),
    ReportDefinition(
        report_id="STAGING_SUMMARY",
        report_name="Staging Classification Summary",
        description="Stage distribution by segment and classification drivers.",
        category="IFRS9",
        parameters=["month"],
    ),
    ReportDefinition(
        report_id="MACRO_SENSITIVITY",
        report_name="Macro Scenario Sensitivity",
        description="ECL sensitivity to macro scenario weights and multipliers.",
        category="IFRS9",
        parameters=["month"],
    ),
    ReportDefinition(
        report_id="BB_REGULATORY",
        report_name="Bangladesh Bank Regulatory Provision",
        description="Provision schedule in BB CL format (BRPD Circular).",
        category="REGULATORY",
        parameters=["month"],
    ),
    ReportDefinition(
        report_id="IFRS7_DISCLOSURE",
        report_name="IFRS 7 Financial Instruments Disclosure",
        description="Credit risk exposure and ECL disclosure tables for annual report.",
        category="DISCLOSURE",
        parameters=["month"],
    ),
    ReportDefinition(
        report_id="GL_SUMMARY",
        report_name="GL Entry Summary",
        description="Provision accounting entries for the GL system.",
        category="ACCOUNTING",
        parameters=["month", "run_id"],
    ),
]


@router.get("/library", response_model=list[ReportDefinition])
async def get_report_library(
    current_user: User = Depends(require_permission("reports:view")),
):
    """Return the list of available report types."""
    return REPORT_LIBRARY


# ---------------------------------------------------------------------------
# Generate (async-style — returns metadata; actual download not implemented)
# ---------------------------------------------------------------------------

@router.post("/generate", response_model=GenerateResponse)
async def generate_report(
    body: GenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("reports:generate")),
):
    """Trigger report generation. Returns metadata; download via /reports/download."""
    known_ids = {r.report_id for r in REPORT_LIBRARY}
    if body.report_id not in known_ids:
        raise HTTPException(status_code=422, detail=f"Unknown report_id: {body.report_id}")

    # Count relevant rows for the response
    count_result = await db.execute(
        select(func.count(ECLResult.ecl_id)).where(ECLResult.reporting_month == body.month)
    )
    row_count = count_result.scalar_one() or 0

    await write_audit_event(
        db, "REPORT_GENERATED", "report", body.report_id, current_user.user_id,
        after_state={"month": body.month, "run_id": body.run_id},
    )
    await db.commit()

    return GenerateResponse(
        report_id=body.report_id,
        month=body.month,
        generated_at=datetime.now(timezone.utc),
        row_count=row_count,
    )


# ---------------------------------------------------------------------------
# Download — Excel file
# ---------------------------------------------------------------------------

@router.get("/download/{report_id}")
async def download_report(
    report_id: str,
    month: str = Query(..., pattern=r"^\d{6}$"),
    run_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("reports:export")),
):
    """Generate and stream a .xlsx report file."""
    from app.services.report_generator import generate_excel_report, REPORT_BUILDERS

    known_ids = {r.report_id for r in REPORT_LIBRARY}
    if report_id not in known_ids:
        raise HTTPException(status_code=422, detail=f"Unknown report_id: {report_id}")

    try:
        xlsx_bytes = await generate_excel_report(report_id, month, run_id, db)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Report generation failed: {exc}") from exc

    filename = f"{report_id}_{month}.xlsx"
    return StreamingResponse(
        io.BytesIO(xlsx_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ---------------------------------------------------------------------------
# BB Regulatory provision schedule
# ---------------------------------------------------------------------------

@router.get("/bb-regulatory", response_model=list[BBRegulatoryRow])
async def get_bb_regulatory(
    month: str = Query(..., pattern=r"^\d{6}$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("reports:view")),
):
    """Bangladesh Bank CL-based provision schedule for the reporting month."""
    result = await db.execute(
        select(
            ECLResult.stage,
            func.sum(ECLResult.ead),
            func.sum(ECLResult.ecl_weighted),
        )
        .where(ECLResult.reporting_month == month)
        .group_by(ECLResult.stage)
        .order_by(ECLResult.stage)
    )
    rows = []
    for stage, total_ead, total_ecl in result:
        ead = Decimal(str(total_ead or 0))
        ecl = Decimal(str(total_ecl or 0))
        coverage = (ecl / ead * 100).quantize(Decimal("0.01")) if ead else Decimal("0")
        rows.append(BBRegulatoryRow(
            reporting_month=month,
            stage=stage,
            total_outstanding=ead,
            total_provision=ecl,
            provision_coverage_pct=coverage,
        ))
    return rows


# ---------------------------------------------------------------------------
# IFRS 7 disclosure
# ---------------------------------------------------------------------------

@router.get("/ifrs7", response_model=list[IFRS7DisclosureRow])
async def get_ifrs7_disclosure(
    month: str = Query(..., pattern=r"^\d{6}$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("reports:view")),
):
    """IFRS 7 credit risk disclosure tables for the reporting month."""
    result = await db.execute(
        select(
            ECLResult.stage,
            func.count(ECLResult.ecl_id),
            func.sum(ECLResult.ead),
            func.sum(ECLResult.ecl_weighted),
        )
        .where(ECLResult.reporting_month == month)
        .group_by(ECLResult.stage)
        .order_by(ECLResult.stage)
    )
    rows = []
    for stage, cnt, total_ead, total_ecl in result:
        ead = Decimal(str(total_ead or 0))
        ecl = Decimal(str(total_ecl or 0))
        ecl_rate = (ecl / ead * 100).quantize(Decimal("0.01")) if ead else Decimal("0")
        rows.append(IFRS7DisclosureRow(
            stage=stage,
            loan_count=cnt or 0,
            gross_ead=ead,
            ecl_weighted=ecl,
            ecl_rate_pct=ecl_rate,
        ))
    return rows
