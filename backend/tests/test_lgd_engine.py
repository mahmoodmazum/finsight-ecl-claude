"""Unit tests for lgd_engine — no DB required."""
import pytest
from decimal import Decimal
from app.services.lgd_engine import compute_lgd, compute_ead, compute_discount_factor

UNSECURED_LGD = Decimal("0.45")


# ------------------------------------------------------------------
# compute_lgd
# ------------------------------------------------------------------

def test_over_secured_returns_floor():
    """Collateral >= outstanding -> 5% LGD floor."""
    lgd = compute_lgd(
        outstanding=Decimal("1000"),
        collateral_net=Decimal("1200"),
        segment_unsecured_lgd=UNSECURED_LGD,
    )
    assert lgd == Decimal("0.05")


def test_exactly_secured_returns_floor():
    lgd = compute_lgd(Decimal("1000"), Decimal("1000"), UNSECURED_LGD)
    assert lgd == Decimal("0.05")


def test_unsecured_returns_segment_lgd():
    lgd = compute_lgd(Decimal("1000"), Decimal("0"), UNSECURED_LGD)
    assert lgd == UNSECURED_LGD


def test_partially_secured_between_floor_and_unsecured():
    """Partial collateral -> LGD between 5% and unsecured floor."""
    lgd = compute_lgd(
        outstanding=Decimal("1000"),
        collateral_net=Decimal("500"),
        segment_unsecured_lgd=UNSECURED_LGD,
    )
    # LGD = 1 - (500 * 0.80 / 1000) = 1 - 0.40 = 0.60
    assert lgd == Decimal("0.60")
    assert lgd > Decimal("0.05")


def test_partially_secured_formula():
    """Verify formula: 1 - (net_col * 0.80 / outstanding)."""
    outstanding = Decimal("2000")
    collateral_net = Decimal("800")
    expected = Decimal("1") - (collateral_net * Decimal("0.80") / outstanding)
    lgd = compute_lgd(outstanding, collateral_net, UNSECURED_LGD)
    assert lgd == expected


def test_zero_outstanding_returns_segment_lgd():
    lgd = compute_lgd(Decimal("0"), Decimal("500"), UNSECURED_LGD)
    assert lgd == UNSECURED_LGD


def test_lgd_clamped_above_over_secured_floor():
    """Very low collateral should still be >= 5%."""
    lgd = compute_lgd(Decimal("10000"), Decimal("10"), UNSECURED_LGD)
    assert lgd >= Decimal("0.05")


def test_lgd_clamped_below_one():
    lgd = compute_lgd(Decimal("1000"), Decimal("1"), Decimal("0.99"))
    assert lgd <= Decimal("1")


# ------------------------------------------------------------------
# compute_ead
# ------------------------------------------------------------------

def test_ead_no_undrawn():
    ead = compute_ead(Decimal("1000"), Decimal("0"), Decimal("0.5"))
    assert ead == Decimal("1000")


def test_ead_with_undrawn():
    ead = compute_ead(Decimal("1000"), Decimal("500"), Decimal("0.5"))
    assert ead == Decimal("1250")  # 1000 + 500*0.5


def test_ead_full_ccf():
    ead = compute_ead(Decimal("500"), Decimal("200"), Decimal("1.0"))
    assert ead == Decimal("700")


def test_ead_zero_ccf():
    ead = compute_ead(Decimal("1000"), Decimal("9999"), Decimal("0"))
    assert ead == Decimal("1000")


# ------------------------------------------------------------------
# compute_discount_factor
# ------------------------------------------------------------------

def test_df_zero_time_returns_one():
    df = compute_discount_factor(Decimal("0.09"), Decimal("0"))
    assert df == Decimal("1")


def test_df_zero_eir_returns_one():
    df = compute_discount_factor(Decimal("0"), Decimal("1"))
    assert df == Decimal("1")


def test_df_one_year():
    """DF = 1 / (1 + 0.09)^1 = 1/1.09."""
    df = compute_discount_factor(Decimal("0.09"), Decimal("1"))
    expected = Decimal("1") / Decimal("1.09")
    assert float(df) == pytest.approx(float(expected), rel=1e-6)


def test_df_decreases_with_time():
    df1 = compute_discount_factor(Decimal("0.09"), Decimal("1"))
    df2 = compute_discount_factor(Decimal("0.09"), Decimal("2"))
    assert df1 > df2


def test_df_decreases_with_rate():
    df_low = compute_discount_factor(Decimal("0.05"), Decimal("1"))
    df_high = compute_discount_factor(Decimal("0.15"), Decimal("1"))
    assert df_low > df_high
