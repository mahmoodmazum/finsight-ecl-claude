"""Macro scenarios router — scenarios CRUD, indicators, sensitivity, approval."""
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.dependencies import get_db
from app.core.rbac import require_permission
from app.core.audit import write_audit_event
from app.core.exceptions import NotFoundException
from app.auth.models import User
from app.models.macro import MacroScenario

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class MacroScenarioOut(BaseModel):
    scenario_id: str
    reporting_month: str
    scenario_name: str
    weight: Decimal
    gdp_growth: Optional[Decimal] = None
    cpi_inflation: Optional[Decimal] = None
    bdt_usd_rate: Optional[Decimal] = None
    bb_repo_rate: Optional[Decimal] = None
    npl_ratio: Optional[Decimal] = None
    remittance_growth: Optional[Decimal] = None
    export_growth: Optional[Decimal] = None
    macro_multiplier: Decimal
    status: str
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class MacroScenarioCreate(BaseModel):
    reporting_month: str
    scenario_name: str
    weight: Decimal
    gdp_growth: Optional[Decimal] = None
    cpi_inflation: Optional[Decimal] = None
    bdt_usd_rate: Optional[Decimal] = None
    bb_repo_rate: Optional[Decimal] = None
    npl_ratio: Optional[Decimal] = None
    remittance_growth: Optional[Decimal] = None
    export_growth: Optional[Decimal] = None
    macro_multiplier: Decimal = Decimal("1.000000")


class MacroScenarioUpdate(BaseModel):
    weight: Optional[Decimal] = None
    gdp_growth: Optional[Decimal] = None
    cpi_inflation: Optional[Decimal] = None
    bdt_usd_rate: Optional[Decimal] = None
    bb_repo_rate: Optional[Decimal] = None
    npl_ratio: Optional[Decimal] = None
    remittance_growth: Optional[Decimal] = None
    export_growth: Optional[Decimal] = None
    macro_multiplier: Optional[Decimal] = None


class SensitivityRow(BaseModel):
    scenario_name: str
    macro_multiplier: Decimal
    weight: Decimal
    weighted_contribution: Decimal


class SensitivityResponse(BaseModel):
    reporting_month: str
    total_weighted_multiplier: Decimal
    rows: list[SensitivityRow]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/scenarios", response_model=list[MacroScenarioOut])
async def list_scenarios(
    month: str = Query(..., pattern=r"^\d{6}$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("macro:view")),
):
    """List all macro scenarios for a reporting month."""
    result = await db.execute(
        select(MacroScenario)
        .where(MacroScenario.reporting_month == month)
        .order_by(MacroScenario.scenario_name)
    )
    return result.scalars().all()


@router.post("/scenarios", response_model=MacroScenarioOut, status_code=201)
async def create_scenario(
    body: MacroScenarioCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("macro:edit")),
):
    """Create a new macro scenario (starts in DRAFT status)."""
    existing = await db.execute(
        select(MacroScenario).where(
            MacroScenario.reporting_month == body.reporting_month,
            MacroScenario.scenario_name == body.scenario_name,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Scenario '{body.scenario_name}' already exists for {body.reporting_month}")

    scenario = MacroScenario(
        scenario_id=str(uuid.uuid4()),
        reporting_month=body.reporting_month,
        scenario_name=body.scenario_name,
        weight=body.weight,
        gdp_growth=body.gdp_growth,
        cpi_inflation=body.cpi_inflation,
        bdt_usd_rate=body.bdt_usd_rate,
        bb_repo_rate=body.bb_repo_rate,
        npl_ratio=body.npl_ratio,
        remittance_growth=body.remittance_growth,
        export_growth=body.export_growth,
        macro_multiplier=body.macro_multiplier,
        status="DRAFT",
        created_by=current_user.user_id,
    )
    db.add(scenario)
    await write_audit_event(
        db, "PARAMETER_UPDATE", "macro_scenario", scenario.scenario_id, current_user.user_id,
        after_state={"scenario_name": scenario.scenario_name, "month": scenario.reporting_month},
    )
    await db.commit()
    await db.refresh(scenario)
    return scenario


@router.put("/scenarios/{scenario_id}", response_model=MacroScenarioOut)
async def update_scenario(
    scenario_id: str,
    body: MacroScenarioUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("macro:edit")),
):
    """Update a macro scenario — resets APPROVED back to DRAFT."""
    result = await db.execute(select(MacroScenario).where(MacroScenario.scenario_id == scenario_id))
    scenario = result.scalar_one_or_none()
    if not scenario:
        raise NotFoundException(f"Scenario {scenario_id} not found")

    before = {
        "weight": str(scenario.weight),
        "gdp_growth": str(scenario.gdp_growth),
        "cpi_inflation": str(scenario.cpi_inflation),
        "bdt_usd_rate": str(scenario.bdt_usd_rate),
        "bb_repo_rate": str(scenario.bb_repo_rate),
        "npl_ratio": str(scenario.npl_ratio),
        "remittance_growth": str(scenario.remittance_growth),
        "export_growth": str(scenario.export_growth),
        "macro_multiplier": str(scenario.macro_multiplier),
        "status": scenario.status,
    }

    for field, val in body.model_dump(exclude_none=True).items():
        setattr(scenario, field, val)

    # Reset to DRAFT so it requires re-approval
    scenario.status = "DRAFT"
    scenario.approved_by = None
    scenario.approved_at = None

    await write_audit_event(
        db, "PARAMETER_UPDATE", "macro_scenario", scenario_id, current_user.user_id,
        before_state=before,
        after_state={
            "weight": str(scenario.weight),
            "macro_multiplier": str(scenario.macro_multiplier),
            "status": "DRAFT",
        },
    )
    await db.commit()
    await db.refresh(scenario)
    return scenario


@router.post("/scenarios/{scenario_id}/approve", response_model=MacroScenarioOut)
async def approve_scenario(
    scenario_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("macro:approve")),
):
    """Approve a macro scenario (CRO or above)."""
    result = await db.execute(select(MacroScenario).where(MacroScenario.scenario_id == scenario_id))
    scenario = result.scalar_one_or_none()
    if not scenario:
        raise NotFoundException(f"Scenario {scenario_id} not found")
    if scenario.status == "APPROVED":
        raise HTTPException(status_code=409, detail="Scenario already approved")

    scenario.status = "APPROVED"
    scenario.approved_by = current_user.user_id
    scenario.approved_at = datetime.now(timezone.utc)

    await write_audit_event(
        db, "MACRO_SCENARIO_APPROVE", "macro_scenario", scenario_id, current_user.user_id,
        after_state={"status": "APPROVED"},
    )
    await db.commit()
    await db.refresh(scenario)
    return scenario


@router.get("/indicators", response_model=list[MacroScenarioOut])
async def get_indicators(
    month: str = Query(..., pattern=r"^\d{6}$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("macro:view")),
):
    """Return approved macro indicators for a reporting month."""
    result = await db.execute(
        select(MacroScenario)
        .where(MacroScenario.reporting_month == month, MacroScenario.status == "APPROVED")
        .order_by(MacroScenario.scenario_name)
    )
    return result.scalars().all()


@router.get("/sensitivity", response_model=SensitivityResponse)
async def get_sensitivity(
    month: str = Query(..., pattern=r"^\d{6}$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("macro:view")),
):
    """Weighted macro multiplier sensitivity analysis for approved scenarios."""
    result = await db.execute(
        select(MacroScenario)
        .where(MacroScenario.reporting_month == month, MacroScenario.status == "APPROVED")
    )
    scenarios = result.scalars().all()

    total_weight = sum(s.weight for s in scenarios) or Decimal("1")
    rows = []
    total_multiplier = Decimal("0")
    for s in scenarios:
        norm_weight = s.weight / total_weight
        contribution = norm_weight * s.macro_multiplier
        total_multiplier += contribution
        rows.append(SensitivityRow(
            scenario_name=s.scenario_name,
            macro_multiplier=s.macro_multiplier,
            weight=s.weight,
            weighted_contribution=contribution.quantize(Decimal("0.000001")),
        ))

    return SensitivityResponse(
        reporting_month=month,
        total_weighted_multiplier=total_multiplier.quantize(Decimal("0.000001")),
        rows=rows,
    )
