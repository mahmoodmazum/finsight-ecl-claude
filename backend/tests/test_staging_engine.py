"""Unit tests for staging_engine.assign_stage — no DB required."""
import pytest
from app.services.staging_engine import assign_stage


# ------------------------------------------------------------------
# Stage 3 (IFRS default)
# ------------------------------------------------------------------

def test_stage3_by_dpd():
    stage, ifrs_default, sicr = assign_stage(90, "STD-0", None, False, False)
    assert stage == 3
    assert ifrs_default is True
    assert sicr is True


def test_stage3_by_dpd_above_threshold():
    stage, _, _ = assign_stage(120, None, None, False, False)
    assert stage == 3


def test_stage3_by_cl_status_bl():
    stage, ifrs_default, sicr = assign_stage(0, "BL", None, False, False)
    assert stage == 3
    assert ifrs_default is True


def test_stage3_dpd_takes_priority_over_sicr():
    """90+ DPD -> Stage 3 even if other SICR factors present."""
    stage, ifrs_default, _ = assign_stage(90, "SS", 6, True, True)
    assert stage == 3
    assert ifrs_default is True


# ------------------------------------------------------------------
# Stage 2 (SICR)
# ------------------------------------------------------------------

def test_stage2_by_dpd():
    stage, ifrs_default, sicr = assign_stage(30, "STD-0", None, False, False)
    assert stage == 2
    assert ifrs_default is False
    assert sicr is True


def test_stage2_by_cl_status_ss():
    stage, _, sicr = assign_stage(0, "SS", None, False, False)
    assert stage == 2
    assert sicr is True


def test_stage2_by_cl_status_df():
    stage, _, _ = assign_stage(0, "DF", None, False, False)
    assert stage == 2


def test_stage2_by_watchlist():
    stage, ifrs_default, sicr = assign_stage(0, "STD-0", None, True, False)
    assert stage == 2
    assert ifrs_default is False
    assert sicr is True


def test_stage2_by_forbearance():
    stage, _, sicr = assign_stage(0, "STD-1", None, False, True)
    assert stage == 2
    assert sicr is True


def test_stage2_by_crr_exactly_5():
    stage, _, _ = assign_stage(0, "STD-0", 5, False, False)
    assert stage == 2


def test_stage2_by_crr_above_5():
    stage, _, _ = assign_stage(0, None, 7, False, False)
    assert stage == 2


def test_crr_4_does_not_trigger_stage2():
    stage, _, _ = assign_stage(0, "STD-0", 4, False, False)
    assert stage == 1


# ------------------------------------------------------------------
# Stage 1 (performing)
# ------------------------------------------------------------------

def test_stage1_clean():
    stage, ifrs_default, sicr = assign_stage(0, "STD-0", 2, False, False)
    assert stage == 1
    assert ifrs_default is False
    assert sicr is False


def test_stage1_no_dpd_no_flags():
    stage, _, _ = assign_stage(0, None, None, False, False)
    assert stage == 1


def test_stage1_dpd_29_is_not_sicr():
    stage, _, sicr = assign_stage(29, "STD-0", 3, False, False)
    assert stage == 1
    assert sicr is False


def test_stage1_uc_cl_status():
    """UC (Unclassified) status should remain Stage 1."""
    stage, _, _ = assign_stage(0, "UC", 1, False, False)
    assert stage == 1


# ------------------------------------------------------------------
# Edge cases
# ------------------------------------------------------------------

def test_dpd_exactly_90_is_stage3():
    stage, _, _ = assign_stage(90, "STD-0", None, False, False)
    assert stage == 3


def test_dpd_exactly_30_is_stage2():
    stage, _, _ = assign_stage(30, "STD-0", None, False, False)
    assert stage == 2


def test_none_cl_status_handled():
    """None cl_status should not cause errors."""
    stage, _, _ = assign_stage(0, None, None, False, False)
    assert stage == 1
