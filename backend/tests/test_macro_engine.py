"""Unit tests for macro_engine — no DB required."""
import pytest
from decimal import Decimal
from unittest.mock import MagicMock
from app.services.macro_engine import compute_weighted_ecl


def _make_scenario(name: str, weight: float, multiplier: float, status: str = "APPROVED"):
    s = MagicMock()
    s.scenario_name = name
    s.weight = Decimal(str(weight))
    s.macro_multiplier = Decimal(str(multiplier))
    s.status = status
    return s


# ------------------------------------------------------------------
# compute_weighted_ecl
# ------------------------------------------------------------------

def test_equal_weights_and_multipliers():
    """Three scenarios with equal weights -> simple average."""
    scenarios = [
        _make_scenario("BASE", 0.6, 1.0),
        _make_scenario("OPTIMISTIC", 0.2, 0.9),
        _make_scenario("PESSIMISTIC", 0.2, 1.2),
    ]
    ecl_by_scen = {
        "BASE": Decimal("100"),
        "OPTIMISTIC": Decimal("80"),
        "PESSIMISTIC": Decimal("130"),
    }
    result = compute_weighted_ecl(ecl_by_scen, scenarios)
    # 0.6*100 + 0.2*80 + 0.2*130 = 60 + 16 + 26 = 102
    assert result == pytest.approx(Decimal("102"), rel=Decimal("0.0001"))


def test_single_scenario_returns_its_ecl():
    scenarios = [_make_scenario("BASE", 1.0, 1.0)]
    result = compute_weighted_ecl({"BASE": Decimal("500")}, scenarios)
    assert result == Decimal("500")


def test_draft_scenarios_excluded():
    """DRAFT scenarios should not contribute to weighted ECL."""
    scenarios = [
        _make_scenario("BASE", 0.6, 1.0, status="APPROVED"),
        _make_scenario("OPTIMISTIC", 0.4, 0.8, status="DRAFT"),
    ]
    ecl_by_scen = {"BASE": Decimal("100"), "OPTIMISTIC": Decimal("80")}
    result = compute_weighted_ecl(ecl_by_scen, scenarios)
    # Only BASE contributes, weight = 0.6; normalized by 0.6 -> 100
    assert result == Decimal("100")


def test_empty_scenarios_returns_average():
    """No approved scenarios -> unweighted average of provided ECLs."""
    result = compute_weighted_ecl(
        {"BASE": Decimal("100"), "PESSIMISTIC": Decimal("200")},
        [],
    )
    assert result == pytest.approx(Decimal("150"))


def test_weights_normalized_when_not_summing_to_one():
    """Weights 0.3 + 0.3 + 0.3 = 0.9, should be normalised."""
    scenarios = [
        _make_scenario("BASE", 0.3, 1.0),
        _make_scenario("OPTIMISTIC", 0.3, 1.0),
        _make_scenario("PESSIMISTIC", 0.3, 1.0),
    ]
    ecl_by_scen = {
        "BASE": Decimal("90"),
        "OPTIMISTIC": Decimal("90"),
        "PESSIMISTIC": Decimal("90"),
    }
    result = compute_weighted_ecl(ecl_by_scen, scenarios)
    # All ECLs equal -> normalisation doesn't matter -> result is 90
    assert result == pytest.approx(Decimal("90"))


def test_zero_ecl_all_scenarios():
    scenarios = [
        _make_scenario("BASE", 0.6, 1.0),
        _make_scenario("OPTIMISTIC", 0.2, 0.9),
        _make_scenario("PESSIMISTIC", 0.2, 1.2),
    ]
    result = compute_weighted_ecl(
        {"BASE": Decimal("0"), "OPTIMISTIC": Decimal("0"), "PESSIMISTIC": Decimal("0")},
        scenarios,
    )
    assert result == Decimal("0")


def test_missing_scenario_ecl_treated_as_zero():
    """ECL not supplied for a scenario defaults to 0."""
    scenarios = [
        _make_scenario("BASE", 0.6, 1.0),
        _make_scenario("PESSIMISTIC", 0.4, 1.2),
    ]
    # PESSIMISTIC not in ecl_by_scen -> treated as 0
    result = compute_weighted_ecl({"BASE": Decimal("100")}, scenarios)
    # 0.6*100 + 0.4*0 = 60, normalised by 1.0 -> 60
    assert result == pytest.approx(Decimal("60"))
