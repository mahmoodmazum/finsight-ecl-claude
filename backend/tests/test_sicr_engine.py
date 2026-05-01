"""Unit tests for sicr_engine.assess_sicr — no DB required."""
import pytest
from app.services.sicr_engine import assess_sicr, SICR_DEFAULT_CONFIG


def _assess(**kwargs):
    defaults = dict(
        loan_id="L001",
        dpd=0,
        cl_status="STD-0",
        crr_rating=2,
        is_watchlist=False,
        is_forbearance=False,
        pd_at_origination=None,
        pd_current=None,
    )
    defaults.update(kwargs)
    return assess_sicr(**defaults)


# ------------------------------------------------------------------
# DPD trigger
# ------------------------------------------------------------------

def test_dpd_below_threshold_no_trigger():
    a = _assess(dpd=29)
    assert a.dpd_trigger is False
    assert a.sicr_flag is False


def test_dpd_at_threshold_triggers():
    a = _assess(dpd=30)
    assert a.dpd_trigger is True
    assert a.sicr_flag is True


def test_dpd_above_threshold_triggers():
    a = _assess(dpd=60)
    assert a.dpd_trigger is True


# ------------------------------------------------------------------
# CL status trigger
# ------------------------------------------------------------------

def test_cl_status_ss_triggers():
    a = _assess(cl_status="SS")
    assert a.cl_status_trigger is True
    assert a.sicr_flag is True


def test_cl_status_df_triggers():
    a = _assess(cl_status="DF")
    assert a.cl_status_trigger is True


def test_cl_status_std_no_trigger():
    a = _assess(cl_status="STD-0")
    assert a.cl_status_trigger is False


def test_cl_status_none_no_trigger():
    a = _assess(cl_status=None)
    assert a.cl_status_trigger is False


# ------------------------------------------------------------------
# Watchlist / forbearance
# ------------------------------------------------------------------

def test_watchlist_triggers_sicr():
    a = _assess(is_watchlist=True)
    assert a.watchlist_trigger is True
    assert a.sicr_flag is True


def test_forbearance_triggers_sicr():
    a = _assess(is_forbearance=True)
    assert a.forbearance_trigger is True
    assert a.sicr_flag is True


# ------------------------------------------------------------------
# CRR trigger
# ------------------------------------------------------------------

def test_crr_below_threshold_no_trigger():
    a = _assess(crr_rating=4)
    assert a.crr_trigger is False


def test_crr_at_threshold_triggers():
    a = _assess(crr_rating=5)
    assert a.crr_trigger is True
    assert a.sicr_flag is True


def test_crr_none_no_trigger():
    a = _assess(crr_rating=None)
    assert a.crr_trigger is False


# ------------------------------------------------------------------
# PD ratio trigger
# ------------------------------------------------------------------

def test_pd_ratio_below_threshold_no_trigger():
    a = _assess(pd_at_origination=0.02, pd_current=0.035)
    assert a.pd_ratio_trigger is False  # 1.75x < 2.0x threshold


def test_pd_ratio_at_threshold_triggers():
    a = _assess(pd_at_origination=0.02, pd_current=0.041)
    assert a.pd_ratio_trigger is True   # 2.05x > 2.0x
    assert a.sicr_flag is True


def test_pd_ratio_none_origination_no_trigger():
    a = _assess(pd_at_origination=None, pd_current=0.05)
    assert a.pd_ratio_trigger is False


def test_pd_ratio_zero_origination_no_trigger():
    a = _assess(pd_at_origination=0.0, pd_current=0.05)
    assert a.pd_ratio_trigger is False


# ------------------------------------------------------------------
# pd_ratio property
# ------------------------------------------------------------------

def test_pd_ratio_computed():
    a = _assess(pd_at_origination=0.02, pd_current=0.04)
    assert a.pd_ratio == pytest.approx(2.0)


def test_pd_ratio_none_when_no_origination():
    a = _assess(pd_at_origination=None, pd_current=0.04)
    assert a.pd_ratio is None


# ------------------------------------------------------------------
# triggered_factors
# ------------------------------------------------------------------

def test_triggered_factors_multiple():
    a = _assess(dpd=30, is_watchlist=True)
    assert "DPD" in a.triggered_factors
    assert "WATCHLIST" in a.triggered_factors


def test_triggered_factors_empty_when_clean():
    a = _assess()
    assert a.triggered_factors == []


# ------------------------------------------------------------------
# Custom config
# ------------------------------------------------------------------

def test_custom_dpd_threshold():
    custom_cfg = dict(SICR_DEFAULT_CONFIG)
    custom_cfg["dpd_threshold"] = 60
    a = assess_sicr("L001", 30, "STD-0", 2, False, False, config=custom_cfg)
    assert a.dpd_trigger is False  # 30 < 60 custom threshold


def test_all_clean_is_not_sicr():
    a = _assess(dpd=0, cl_status="STD-0", crr_rating=1,
                is_watchlist=False, is_forbearance=False)
    assert a.sicr_flag is False
