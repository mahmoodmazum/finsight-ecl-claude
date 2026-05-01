"""
Macro Engine — macroeconomic scenario weighting for ECL calculation.
Pure Python; uses pre-stored macro_multiplier values approved by CRO.
"""
from decimal import Decimal
from typing import List
from app.models.macro import MacroScenario


def get_scenario_multiplier(scenario: MacroScenario) -> Decimal:
    """Returns the stored macro multiplier (pre-approved by CRO)."""
    return scenario.macro_multiplier


def compute_weighted_ecl(
    ecl_by_scenario: dict[str, Decimal],
    scenarios: List[MacroScenario],
) -> Decimal:
    """
    Weighted ECL = Σ (weight_i × ECL_i) for all APPROVED scenarios.

    ecl_by_scenario: {'BASE': Decimal, 'OPTIMISTIC': Decimal, 'PESSIMISTIC': Decimal}

    Weights are normalised if they don't sum to 1 (handles partial scenario sets).
    """
    total = Decimal("0")
    total_weight = Decimal("0")

    for scenario in scenarios:
        if scenario.status != "APPROVED":
            continue
        ecl = ecl_by_scenario.get(scenario.scenario_name, Decimal("0"))
        total += scenario.weight * ecl
        total_weight += scenario.weight

    if total_weight <= Decimal("0"):
        # Fallback: unweighted average
        values = [v for v in ecl_by_scenario.values()]
        if not values:
            return Decimal("0")
        return sum(values) / Decimal(len(values))

    # Normalise if weights don't sum exactly to 1
    if total_weight != Decimal("1"):
        total = total / total_weight

    return total
