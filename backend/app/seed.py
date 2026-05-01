"""
Seed script — populates reference data for a fresh FinSight ECL database.
Run: python -m app.seed
"""
import asyncio
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.auth.service import hash_password
from app.auth.models import User
from app.models.segment import Segment
from app.models.data_source import DataSource
from app.models.macro import MacroScenario
from app.models.model_governance import MLModel
from app.models.staging import LGDParameter, PDParameter
from app.models.audit import RiskRegister


# ---------------------------------------------------------------------------
# Segments
# ---------------------------------------------------------------------------
SEGMENTS = [
    {"segment_id": "CORP", "segment_name": "Corporate", "assessment_method": "INDIVIDUAL",
     "collateral_type": "Mixed", "rating_band": "1-6", "unsecured_lgd_floor": Decimal("0.4500"), "ccf": Decimal("0.5000")},
    {"segment_id": "SME", "segment_name": "Small & Medium Enterprise", "assessment_method": "COLLECTIVE",
     "collateral_type": "Property/Machinery", "rating_band": "1-8", "unsecured_lgd_floor": Decimal("0.5500"), "ccf": Decimal("0.5500")},
    {"segment_id": "RETAIL", "segment_name": "Retail / Consumer", "assessment_method": "POOL",
     "collateral_type": "None", "rating_band": "N/A", "unsecured_lgd_floor": Decimal("0.7500"), "ccf": Decimal("0.4000")},
    {"segment_id": "AGRI", "segment_name": "Agriculture", "assessment_method": "POOL",
     "collateral_type": "Land", "rating_band": "N/A", "unsecured_lgd_floor": Decimal("0.6000"), "ccf": Decimal("0.3000")},
    {"segment_id": "TRADE", "segment_name": "Trade Finance", "assessment_method": "COLLECTIVE",
     "collateral_type": "Goods/LC", "rating_band": "1-6", "unsecured_lgd_floor": Decimal("0.4000"), "ccf": Decimal("1.0000")},
    {"segment_id": "STAFF", "segment_name": "Staff Loans", "assessment_method": "POOL",
     "collateral_type": "Provident Fund", "rating_band": "N/A", "unsecured_lgd_floor": Decimal("0.2000"), "ccf": Decimal("0.0000")},
]

# ---------------------------------------------------------------------------
# Data Sources
# ---------------------------------------------------------------------------
DATA_SOURCES = [
    {"source_id": str(uuid.uuid4()), "source_name": "Temenos T24 Core Banking", "source_type": "CBS",
     "integration_method": "REST_API", "schedule_cron": "0 2 * * *"},
    {"source_id": str(uuid.uuid4()), "source_name": "Collateral Management System", "source_type": "COLLATERAL",
     "integration_method": "DB_VIEW", "schedule_cron": "30 3 * * *"},
    {"source_id": str(uuid.uuid4()), "source_name": "Internal Rating System", "source_type": "RATINGS",
     "integration_method": "REST_API", "schedule_cron": "0 6 * * *"},
    {"source_id": str(uuid.uuid4()), "source_name": "Bangladesh Bank Macro Data", "source_type": "MACRO",
     "integration_method": "FILE_UPLOAD", "schedule_cron": None},
]

# ---------------------------------------------------------------------------
# Macro Scenarios (seed for current reporting month)
# ---------------------------------------------------------------------------
def make_macro_scenarios(reporting_month: str) -> list[dict]:
    return [
        {
            "scenario_id": str(uuid.uuid4()), "reporting_month": reporting_month,
            "scenario_name": "BASE", "weight": Decimal("0.6000"),
            "gdp_growth": Decimal("0.0620"), "cpi_inflation": Decimal("0.0900"),
            "bdt_usd_rate": Decimal("110.5000"), "bb_repo_rate": Decimal("0.0800"),
            "npl_ratio": Decimal("0.0850"), "remittance_growth": Decimal("0.0500"),
            "export_growth": Decimal("0.0800"), "macro_multiplier": Decimal("1.000000"),
            "status": "APPROVED",
        },
        {
            "scenario_id": str(uuid.uuid4()), "reporting_month": reporting_month,
            "scenario_name": "OPTIMISTIC", "weight": Decimal("0.2000"),
            "gdp_growth": Decimal("0.0780"), "cpi_inflation": Decimal("0.0650"),
            "bdt_usd_rate": Decimal("108.0000"), "bb_repo_rate": Decimal("0.0700"),
            "npl_ratio": Decimal("0.0700"), "remittance_growth": Decimal("0.0900"),
            "export_growth": Decimal("0.1100"), "macro_multiplier": Decimal("0.880000"),
            "status": "APPROVED",
        },
        {
            "scenario_id": str(uuid.uuid4()), "reporting_month": reporting_month,
            "scenario_name": "PESSIMISTIC", "weight": Decimal("0.2000"),
            "gdp_growth": Decimal("0.0420"), "cpi_inflation": Decimal("0.1200"),
            "bdt_usd_rate": Decimal("115.0000"), "bb_repo_rate": Decimal("0.0950"),
            "npl_ratio": Decimal("0.1100"), "remittance_growth": Decimal("0.0200"),
            "export_growth": Decimal("0.0400"), "macro_multiplier": Decimal("1.250000"),
            "status": "APPROVED",
        },
    ]

# ---------------------------------------------------------------------------
# ML Models
# ---------------------------------------------------------------------------
ML_MODELS = [
    {"model_id": "PD-CORP-V2", "model_name": "Corporate PD Model v2 — Logistic Regression",
     "model_type": "PD", "method": "Logistic Regression + Scorecard", "version": "2.1.0",
     "gini_coefficient": Decimal("0.6820"), "ks_statistic": Decimal("0.4950"), "status": "PRODUCTION"},
    {"model_id": "PD-SME-V1", "model_name": "SME PD Model v1 — Cohort Analysis",
     "model_type": "PD", "method": "Cohort / Migration Analysis", "version": "1.3.0",
     "gini_coefficient": Decimal("0.5940"), "ks_statistic": Decimal("0.4120"), "status": "PRODUCTION"},
    {"model_id": "PD-RETAIL-V1", "model_name": "Retail Pool PD — Vintage Analysis",
     "model_type": "PD", "method": "Vintage / Pool Analysis", "version": "1.1.0",
     "gini_coefficient": Decimal("0.5500"), "ks_statistic": Decimal("0.3800"), "status": "PRODUCTION"},
    {"model_id": "LGD-CORP-V2", "model_name": "Corporate LGD Model v2 — Collateral Haircut",
     "model_type": "LGD", "method": "Collateral-Based Haircut Model", "version": "2.0.0",
     "gini_coefficient": None, "ks_statistic": None, "status": "PRODUCTION"},
    {"model_id": "MACRO-V1", "model_name": "Macro Overlay Model v1 — Beta Regression",
     "model_type": "MACRO", "method": "Weighted Beta Regression", "version": "1.0.0",
     "gini_coefficient": None, "ks_statistic": None, "status": "PRODUCTION"},
    {"model_id": "PD-CORP-V3", "model_name": "Corporate PD Model v3 — XGBoost",
     "model_type": "PD", "method": "XGBoost + SHAP Explainability", "version": "3.0.0-dev",
     "gini_coefficient": Decimal("0.7310"), "ks_statistic": Decimal("0.5210"), "status": "VALIDATION"},
]

# ---------------------------------------------------------------------------
# Risk Register
# ---------------------------------------------------------------------------
RISK_REGISTER = [
    {"risk_title": "PD Model Overfitting Risk", "description": "Corporate PD model may be overfitted to historical data pre-COVID.",
     "category": "MODEL", "rating": "HIGH",
     "mitigation": "Annual backtesting against out-of-sample data; comparison with peer bank benchmarks.",
     "status": "OPEN"},
    {"risk_title": "Data Quality — CBS DPD Lag", "description": "T24 DPD field may lag 1-2 days vs actual payment date.",
     "category": "DATA", "rating": "MEDIUM",
     "mitigation": "Daily reconciliation job checks DPD consistency; quarantine threshold of 3-day lag.",
     "status": "MITIGATED"},
    {"risk_title": "IFRS 9 vs BB Regulatory Divergence", "description": "ECL provision may fall below BB BRPD minimum requirement.",
     "category": "REGULATORY", "rating": "HIGH",
     "mitigation": "Monthly dual-run comparison report; escalation to CRO if shortfall > 5%.",
     "status": "OPEN"},
    {"risk_title": "Macro Scenario Weight Subjectivity", "description": "Scenario weights rely on management judgement without formal economic model.",
     "category": "MODEL", "rating": "MEDIUM",
     "mitigation": "Overlay approval by CRO required; weights logged in audit trail.",
     "status": "OPEN"},
    {"risk_title": "Collateral Valuation Frequency", "description": "Property collateral revalued annually — may not reflect current market values.",
     "category": "DATA", "rating": "MEDIUM",
     "mitigation": "Interim haircut floor applied to collateral older than 18 months.",
     "status": "OPEN"},
]

# ---------------------------------------------------------------------------
# LGD Parameters (seed for current reporting month)
# ---------------------------------------------------------------------------
LGD_TIERS = [
    {"security_tier": "OVER_SECURED", "lgd_value": Decimal("0.0500"), "haircut_pct": Decimal("0.2000")},
    {"security_tier": "PARTIAL", "lgd_value": Decimal("0.3500"), "haircut_pct": Decimal("0.2000")},
    {"security_tier": "UNSECURED", "lgd_value": Decimal("0.4500"), "haircut_pct": Decimal("0.0000")},
]

# ---------------------------------------------------------------------------
# PD Parameters (illustrative seed values per segment, 4 observations)
# ---------------------------------------------------------------------------
PD_OBSERVATIONS = [
    {"observation_no": 1, "observation_weight": Decimal("0.4000")},
    {"observation_no": 2, "observation_weight": Decimal("0.3000")},
    {"observation_no": 3, "observation_weight": Decimal("0.2000")},
    {"observation_no": 4, "observation_weight": Decimal("0.1000")},
]

# Raw PDs per segment per observation (illustrative)
SEGMENT_PD_MAP = {
    "CORP":   [Decimal("0.018000"), Decimal("0.020000"), Decimal("0.022000"), Decimal("0.019000")],
    "SME":    [Decimal("0.032000"), Decimal("0.035000"), Decimal("0.030000"), Decimal("0.033000")],
    "RETAIL": [Decimal("0.045000"), Decimal("0.048000"), Decimal("0.042000"), Decimal("0.046000")],
    "AGRI":   [Decimal("0.055000"), Decimal("0.058000"), Decimal("0.052000"), Decimal("0.056000")],
    "TRADE":  [Decimal("0.022000"), Decimal("0.024000"), Decimal("0.020000"), Decimal("0.021000")],
    "STAFF":  [Decimal("0.005000"), Decimal("0.006000"), Decimal("0.005000"), Decimal("0.005000")],
}


async def _already_seeded(db: AsyncSession) -> bool:
    result = await db.execute(text("SELECT COUNT(*) FROM users"))
    count = result.scalar()
    return count > 0


async def seed(db: AsyncSession) -> None:
    if await _already_seeded(db):
        print("Database already seeded — skipping.")
        return

    now = datetime.now(timezone.utc)
    reporting_month = now.strftime("%Y%m")

    # ---- Admin user --------------------------------------------------------
    admin = User(
        user_id=str(uuid.uuid4()),
        email="admin@finsight.com",
        password_hash=hash_password("Admin@123456"),
        full_name="System Administrator",
        role="ADMIN",
        is_active=True,
        created_by="SEED",
    )
    db.add(admin)
    await db.flush()
    admin_id = admin.user_id

    # Extra demo users
    for email, name, role in [
        ("cro@finsight.com", "Chief Risk Officer", "CRO"),
        ("analyst@finsight.com", "ECL Analyst", "ANALYST"),
        ("viewer@finsight.com", "Read-Only Viewer", "VIEWER"),
    ]:
        db.add(User(
            user_id=str(uuid.uuid4()),
            email=email,
            password_hash=hash_password("Demo@123456"),
            full_name=name,
            role=role,
            is_active=True,
            created_by=admin_id,
        ))

    # ---- Segments ----------------------------------------------------------
    for s in SEGMENTS:
        db.add(Segment(**s, is_active=True, created_by=admin_id))

    # ---- Data Sources ------------------------------------------------------
    for ds in DATA_SOURCES:
        db.add(DataSource(**ds, is_active=True, created_by=admin_id))

    await db.flush()

    # ---- Macro Scenarios ---------------------------------------------------
    for ms in make_macro_scenarios(reporting_month):
        db.add(MacroScenario(**ms, approved_by=admin_id, approved_at=now, created_by=admin_id))

    # ---- ML Models ---------------------------------------------------------
    for m in ML_MODELS:
        db.add(MLModel(**m, approved_by=admin_id if m["status"] == "PRODUCTION" else None,
                       approved_at=now if m["status"] == "PRODUCTION" else None, created_by=admin_id))

    # ---- Risk Register -----------------------------------------------------
    for r in RISK_REGISTER:
        db.add(RiskRegister(**r, owner=admin_id, created_by=admin_id))

    # ---- LGD Parameters (all segments × 3 tiers) ---------------------------
    for seg in SEGMENTS:
        sid = seg["segment_id"]
        lgd_floor = seg["unsecured_lgd_floor"]
        for tier in LGD_TIERS:
            # Override UNSECURED lgd_value with segment floor
            lgd_val = lgd_floor if tier["security_tier"] == "UNSECURED" else tier["lgd_value"]
            db.add(LGDParameter(
                lgd_id=str(uuid.uuid4()),
                segment_id=sid,
                reporting_month=reporting_month,
                security_tier=tier["security_tier"],
                lgd_value=lgd_val,
                haircut_pct=tier["haircut_pct"],
                is_active=True,
                created_by=admin_id,
            ))

    # ---- PD Parameters (all segments × 4 observations) --------------------
    weights = [Decimal("0.40"), Decimal("0.30"), Decimal("0.20"), Decimal("0.10")]
    for seg in SEGMENTS:
        sid = seg["segment_id"]
        raw_pds = SEGMENT_PD_MAP[sid]
        for i, obs in enumerate(PD_OBSERVATIONS):
            raw_pd = raw_pds[i]
            weighted_pd = raw_pd * weights[i]
            # Illustrative month ranges
            obs_year = int(reporting_month[:4])
            obs_month = int(reporting_month[4:])
            end_month_dt = datetime(obs_year, obs_month, 1)
            start_month = f"{obs_year - i - 1:04d}{obs_month:02d}"
            db.add(PDParameter(
                pd_param_id=str(uuid.uuid4()),
                segment_id=sid,
                reporting_month=reporting_month,
                observation_no=obs["observation_no"],
                start_month=start_month,
                end_month=reporting_month,
                total_accounts=200 - (i * 10),
                default_accounts=max(1, int(float(raw_pd) * (200 - i * 10))),
                raw_pd=raw_pd,
                observation_weight=weights[i],
                weighted_pd=weighted_pd,
                created_by=admin_id,
            ))

    await db.commit()
    print(f"Seed complete for reporting month {reporting_month}.")
    print("Default credentials:")
    print("  admin@finsight.com    / Admin@123456  (ADMIN)")
    print("  cro@finsight.com      / Demo@123456   (CRO)")
    print("  analyst@finsight.com  / Demo@123456   (ANALYST)")
    print("  viewer@finsight.com   / Demo@123456   (VIEWER)")


async def main() -> None:
    async with AsyncSessionLocal() as db:
        await seed(db)


if __name__ == "__main__":
    asyncio.run(main())
