"""
LGD Engine — collateral-based Loss Given Default computation.
Pure Python; no DB or FastAPI dependencies.
"""
from decimal import Decimal


OVER_SECURED_LGD = Decimal("0.05")
PARTIAL_RECOVERY_RATE = Decimal("0.80")


def compute_lgd(
    outstanding: Decimal,
    collateral_net: Decimal,
    segment_unsecured_lgd: Decimal,
) -> Decimal:
    """
    Compute LGD based on net collateral coverage.

    - Over-secured  (collateral_net >= outstanding) : 5% floor
    - Partially secured (0 < collateral_net < outstanding): 1 - (net × 0.80 / outstanding)
    - Unsecured     (collateral_net == 0)           : segment LGD floor

    Result is clamped to [OVER_SECURED_LGD, 1.0].
    """
    if outstanding <= Decimal("0"):
        return segment_unsecured_lgd

    if collateral_net >= outstanding:
        return OVER_SECURED_LGD

    if collateral_net > Decimal("0"):
        lgd = Decimal("1") - (collateral_net * PARTIAL_RECOVERY_RATE / outstanding)
        return max(OVER_SECURED_LGD, min(lgd, Decimal("1")))

    return segment_unsecured_lgd


def compute_ead(outstanding: Decimal, undrawn: Decimal, ccf: Decimal) -> Decimal:
    """
    EAD = outstanding balance + (undrawn commitment × CCF).
    CCF (Credit Conversion Factor) captures the expected drawdown of undrawn limits.
    """
    return outstanding + (undrawn * ccf)


def compute_discount_factor(eir: Decimal, time_to_default_years: Decimal) -> Decimal:
    """
    Discount Factor = 1 / (1 + EIR) ^ t
    Returns 1.0 when EIR or time is zero/negative (no discounting).
    """
    if eir <= Decimal("0") or time_to_default_years <= Decimal("0"):
        return Decimal("1")
    return Decimal("1") / (Decimal("1") + eir) ** time_to_default_years
