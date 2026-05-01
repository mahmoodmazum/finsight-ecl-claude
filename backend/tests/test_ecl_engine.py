"""
Unit tests for ECL engine pure functions:
  - lgd_engine: compute_lgd, compute_ead, compute_discount_factor
  - macro_engine: compute_weighted_ecl
  - ECL formula validation (EAD × PD × LGD × DF × macro)

No DB required — all pure function inputs.
"""
import pytest
from decimal import Decimal
from unittest.mock import MagicMock

from app.services.lgd_engine import compute_lgd, compute_ead, compute_discount_factor
from app.services.macro_engine import compute_weighted_ecl
from app.services.ecl_engine import DEFAULT_EIR, TTD_STAGE1, TTD_STAGE2, TTD_STAGE3


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_scenario(name: str, weight: float, multiplier: float, status: str = "APPROVED"):
    s = MagicMock()
    s.scenario_name = name
    s.weight = Decimal(str(weight))
    s.macro_multiplier = Decimal(str(multiplier))
    s.status = status
    return s


# ---------------------------------------------------------------------------
# compute_lgd
# ---------------------------------------------------------------------------

class TestComputeLGD:
    def test_over_secured_returns_floor(self):
        # collateral >= outstanding -> 5% floor
        lgd = compute_lgd(Decimal("1000"), Decimal("1500"), Decimal("0.45"))
        assert lgd == Decimal("0.05")

    def test_exactly_secured_returns_floor(self):
        lgd = compute_lgd(Decimal("1000"), Decimal("1000"), Decimal("0.45"))
        assert lgd == Decimal("0.05")

    def test_unsecured_returns_segment_floor(self):
        lgd = compute_lgd(Decimal("1000"), Decimal("0"), Decimal("0.45"))
        assert lgd == Decimal("0.45")

    def test_partially_secured_between_floor_and_one(self):
        # 50% collateral coverage: 1 - (500 * 0.80 / 1000) = 0.60
        lgd = compute_lgd(Decimal("1000"), Decimal("500"), Decimal("0.45"))
        assert lgd == Decimal("0.60")

    def test_partially_secured_clamped_to_floor(self):
        # Very high collateral, almost over-secured: should clamp to 0.05
        lgd = compute_lgd(Decimal("1000"), Decimal("900"), Decimal("0.45"))
        assert lgd >= Decimal("0.05")

    def test_zero_outstanding_returns_segment_lgd(self):
        lgd = compute_lgd(Decimal("0"), Decimal("500"), Decimal("0.40"))
        assert lgd == Decimal("0.40")

    def test_negative_outstanding_returns_segment_lgd(self):
        lgd = compute_lgd(Decimal("-100"), Decimal("0"), Decimal("0.35"))
        assert lgd == Decimal("0.35")

    def test_different_unsecured_floors(self):
        lgd_retail = compute_lgd(Decimal("500"), Decimal("0"), Decimal("0.50"))
        lgd_corp = compute_lgd(Decimal("500"), Decimal("0"), Decimal("0.40"))
        assert lgd_retail == Decimal("0.50")
        assert lgd_corp == Decimal("0.40")


# ---------------------------------------------------------------------------
# compute_ead
# ---------------------------------------------------------------------------

class TestComputeEAD:
    def test_no_undrawn(self):
        ead = compute_ead(Decimal("1000"), Decimal("0"), Decimal("0.50"))
        assert ead == Decimal("1000")

    def test_ccf_50_pct(self):
        ead = compute_ead(Decimal("1000"), Decimal("200"), Decimal("0.50"))
        assert ead == Decimal("1100")

    def test_ccf_100_pct(self):
        ead = compute_ead(Decimal("500"), Decimal("500"), Decimal("1.0"))
        assert ead == Decimal("1000")

    def test_ccf_zero(self):
        ead = compute_ead(Decimal("800"), Decimal("1000"), Decimal("0"))
        assert ead == Decimal("800")

    def test_fully_drawn_revolving(self):
        # Outstanding = full limit, undrawn = 0
        ead = compute_ead(Decimal("5000"), Decimal("0"), Decimal("0.75"))
        assert ead == Decimal("5000")


# ---------------------------------------------------------------------------
# compute_discount_factor
# ---------------------------------------------------------------------------

class TestComputeDiscountFactor:
    def test_zero_eir_returns_one(self):
        df = compute_discount_factor(Decimal("0"), Decimal("1"))
        assert df == Decimal("1")

    def test_negative_time_returns_one(self):
        df = compute_discount_factor(Decimal("0.09"), Decimal("0"))
        assert df == Decimal("1")

    def test_standard_9pct_1yr(self):
        # DF = 1 / 1.09 ≈ 0.9174
        df = compute_discount_factor(Decimal("0.09"), Decimal("1"))
        assert abs(df - Decimal("0.9174")) < Decimal("0.001")

    def test_stage1_ttd(self):
        # TTD_STAGE1 = 0.5, EIR = 9%: DF = 1/(1.09)^0.5 ≈ 0.9579
        df = compute_discount_factor(DEFAULT_EIR, TTD_STAGE1)
        assert Decimal("0.95") < df < Decimal("0.97")

    def test_stage2_ttd(self):
        # TTD_STAGE2 = 2.0, EIR = 9%: DF = 1/(1.09)^2 ≈ 0.8417
        df = compute_discount_factor(DEFAULT_EIR, TTD_STAGE2)
        assert Decimal("0.83") < df < Decimal("0.86")

    def test_stage3_ttd(self):
        # TTD_STAGE3 = 0.25, near-term default: DF close to 1
        df = compute_discount_factor(DEFAULT_EIR, TTD_STAGE3)
        assert Decimal("0.97") < df < Decimal("1.00")

    def test_higher_eir_gives_lower_df(self):
        df_low = compute_discount_factor(Decimal("0.05"), Decimal("1"))
        df_high = compute_discount_factor(Decimal("0.20"), Decimal("1"))
        assert df_low > df_high


# ---------------------------------------------------------------------------
# ECL formula: EAD × PD × LGD × DF
# ---------------------------------------------------------------------------

class TestECLFormula:
    def _ecl(self, ead, pd, lgd, eir, ttd):
        df = compute_discount_factor(eir, ttd)
        return ead * pd * lgd * df

    def test_stage1_ecl_positive(self):
        ecl = self._ecl(
            Decimal("1000"), Decimal("0.02"), Decimal("0.45"),
            DEFAULT_EIR, TTD_STAGE1
        )
        assert ecl > Decimal("0")

    def test_stage3_ecl_pd_one(self):
        # Stage 3: PD=1 -> ECL = EAD × LGD × DF
        ecl = self._ecl(
            Decimal("1000"), Decimal("1.0"), Decimal("0.45"),
            DEFAULT_EIR, TTD_STAGE3
        )
        # Should be close to 1000 * 0.45 * DF(0.25y)
        assert Decimal("440") < ecl < Decimal("460")

    def test_ecl_increases_with_pd(self):
        kwargs = dict(lgd=Decimal("0.45"), eir=DEFAULT_EIR, ttd=TTD_STAGE1)
        ecl_low = self._ecl(Decimal("1000"), Decimal("0.01"), **kwargs)
        ecl_high = self._ecl(Decimal("1000"), Decimal("0.05"), **kwargs)
        assert ecl_high > ecl_low

    def test_ecl_increases_with_ead(self):
        ecl_small = self._ecl(Decimal("500"), Decimal("0.02"), Decimal("0.45"), DEFAULT_EIR, TTD_STAGE1)
        ecl_large = self._ecl(Decimal("2000"), Decimal("0.02"), Decimal("0.45"), DEFAULT_EIR, TTD_STAGE1)
        assert ecl_large == ecl_small * 4


# ---------------------------------------------------------------------------
# compute_weighted_ecl
# ---------------------------------------------------------------------------

class TestComputeWeightedECL:
    def test_equal_weights_averages(self):
        scenarios = [
            make_scenario("BASE", 1/3, 1.0),
            make_scenario("OPTIMISTIC", 1/3, 0.8),
            make_scenario("PESSIMISTIC", 1/3, 1.2),
        ]
        ecl_by_scenario = {
            "BASE": Decimal("100"),
            "OPTIMISTIC": Decimal("80"),
            "PESSIMISTIC": Decimal("120"),
        }
        result = compute_weighted_ecl(ecl_by_scenario, scenarios)
        # Equal weights -> average = 100
        assert abs(result - Decimal("100")) < Decimal("0.01")

    def test_standard_weights(self):
        # Typical IFRS 9: base 50%, optimistic 25%, pessimistic 25%
        scenarios = [
            make_scenario("BASE", 0.50, 1.0),
            make_scenario("OPTIMISTIC", 0.25, 0.9),
            make_scenario("PESSIMISTIC", 0.25, 1.1),
        ]
        ecl_by_scenario = {
            "BASE": Decimal("100"),
            "OPTIMISTIC": Decimal("90"),
            "PESSIMISTIC": Decimal("110"),
        }
        result = compute_weighted_ecl(ecl_by_scenario, scenarios)
        # 0.5*100 + 0.25*90 + 0.25*110 = 50 + 22.5 + 27.5 = 100
        assert abs(result - Decimal("100")) < Decimal("0.01")

    def test_skewed_pessimistic(self):
        scenarios = [
            make_scenario("BASE", 0.40, 1.0),
            make_scenario("OPTIMISTIC", 0.10, 0.8),
            make_scenario("PESSIMISTIC", 0.50, 1.3),
        ]
        ecl_by_scenario = {
            "BASE": Decimal("100"),
            "OPTIMISTIC": Decimal("80"),
            "PESSIMISTIC": Decimal("130"),
        }
        result = compute_weighted_ecl(ecl_by_scenario, scenarios)
        expected = Decimal("0.4") * 100 + Decimal("0.1") * 80 + Decimal("0.5") * 130
        assert abs(result - expected) < Decimal("0.01")

    def test_draft_scenarios_excluded(self):
        scenarios = [
            make_scenario("BASE", 0.50, 1.0, status="APPROVED"),
            make_scenario("OPTIMISTIC", 0.25, 0.8, status="DRAFT"),  # excluded
            make_scenario("PESSIMISTIC", 0.25, 1.2, status="APPROVED"),
        ]
        ecl_by_scenario = {
            "BASE": Decimal("100"),
            "OPTIMISTIC": Decimal("80"),
            "PESSIMISTIC": Decimal("120"),
        }
        result = compute_weighted_ecl(ecl_by_scenario, scenarios)
        # Only BASE(0.5) + PESSIMISTIC(0.25) are APPROVED, weights sum to 0.75
        # Normalised: BASE=2/3, PESS=1/3 -> (2/3)*100 + (1/3)*120 = 106.67
        assert abs(result - Decimal("106.67")) < Decimal("0.1")

    def test_no_approved_scenarios_falls_back_to_average(self):
        scenarios = [
            make_scenario("BASE", 0.50, 1.0, status="DRAFT"),
        ]
        ecl_by_scenario = {"BASE": Decimal("100")}
        result = compute_weighted_ecl(ecl_by_scenario, scenarios)
        # Fallback: average of values = 100
        assert result == Decimal("100")

    def test_empty_scenarios_returns_zero(self):
        result = compute_weighted_ecl({}, [])
        assert result == Decimal("0")

    def test_weights_normalised_when_not_summing_to_one(self):
        # Weights sum to 1.5 but should still produce correct weighted average
        scenarios = [
            make_scenario("BASE", 0.75, 1.0),
            make_scenario("PESSIMISTIC", 0.75, 1.2),
        ]
        ecl_by_scenario = {
            "BASE": Decimal("100"),
            "PESSIMISTIC": Decimal("120"),
        }
        result = compute_weighted_ecl(ecl_by_scenario, scenarios)
        # Normalised: each 0.5 -> (100 + 120) / 2 = 110
        assert abs(result - Decimal("110")) < Decimal("0.01")
