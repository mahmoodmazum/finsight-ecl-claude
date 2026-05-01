"""Pydantic v2 schemas for ECL Calculation endpoints."""
from decimal import Decimal
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, field_validator


# ---------------------------------------------------------------------------
# ECL Run
# ---------------------------------------------------------------------------

class ECLRunResponse(BaseModel):
    run_id: str
    reporting_month: str
    status: str
    initiated_by: Optional[str] = None
    initiated_at: Optional[datetime] = None
    total_ecl: Decimal = Decimal("0")
    total_stage1_ecl: Decimal = Decimal("0")
    total_stage2_ecl: Decimal = Decimal("0")
    total_stage3_ecl: Decimal = Decimal("0")

    model_config = {"from_attributes": True}


class ECLRunStatusResponse(BaseModel):
    run_id: str
    status: str
    reporting_month: str
    total_ecl: Optional[Decimal] = None
    total_stage1_ecl: Optional[Decimal] = None
    total_stage2_ecl: Optional[Decimal] = None
    total_stage3_ecl: Optional[Decimal] = None
    initiated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# ECL Results (account-level)
# ---------------------------------------------------------------------------

class ECLResultRow(BaseModel):
    ecl_id: int
    loan_id: str
    reporting_month: str
    stage: int
    ead: Decimal
    pd_12m: Decimal
    pd_lifetime: Decimal
    lgd: Decimal
    eir: Decimal
    ecl_base: Decimal
    ecl_optimistic: Decimal
    ecl_pessimistic: Decimal
    ecl_weighted: Decimal
    pd_at_origination: Optional[Decimal] = None
    run_id: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ECLResultPage(BaseModel):
    items: list[ECLResultRow]
    total: int
    page: int
    page_size: int
    pages: int


# ---------------------------------------------------------------------------
# Portfolio Summary
# ---------------------------------------------------------------------------

class SegmentSummary(BaseModel):
    segment_id: str
    loan_count: int
    total_ead: Decimal
    avg_pd_12m: Decimal
    avg_lgd: Decimal
    total_ecl_weighted: Decimal
    stage1_ecl: Decimal
    stage2_ecl: Decimal
    stage3_ecl: Decimal


class PortfolioSummary(BaseModel):
    reporting_month: str
    total_loans: int
    total_ead: Decimal
    total_ecl: Decimal
    stage1_ecl: Decimal
    stage2_ecl: Decimal
    stage3_ecl: Decimal
    stage1_count: int
    stage2_count: int
    stage3_count: int
    by_segment: list[SegmentSummary]


# ---------------------------------------------------------------------------
# Parameters (LGD + CCF per segment)
# ---------------------------------------------------------------------------

class LGDParameterRow(BaseModel):
    lgd_id: str
    segment_id: str
    reporting_month: str
    security_tier: str
    lgd_value: Decimal
    haircut_pct: Decimal
    is_active: bool

    model_config = {"from_attributes": True}


class LGDParameterUpdate(BaseModel):
    lgd_id: str
    lgd_value: Decimal
    haircut_pct: Decimal

    @field_validator("lgd_value", "haircut_pct")
    @classmethod
    def validate_range(cls, v: Decimal) -> Decimal:
        if not (Decimal("0") <= v <= Decimal("1")):
            raise ValueError("Value must be between 0 and 1")
        return v


class ParametersResponse(BaseModel):
    reporting_month: str
    lgd_parameters: list[LGDParameterRow]
