"""
SICR Assessment Engine.
Evaluates Significant Increase in Credit Risk factors per IFRS 9 Section 5.5.4.
Can be called standalone (not only within the ECL engine run).
"""
from dataclasses import dataclass, field
from typing import Optional


SICR_DEFAULT_CONFIG: dict = {
    "dpd_threshold": 30,
    "crr_threshold": 5,          # CRR >= 5 triggers SICR
    "pd_ratio_threshold": 2.0,   # PD_current / PD_origination > 2× triggers SICR
}

STAGE2_CL_STATUSES = {"SS", "DF"}


@dataclass
class SICRAssessment:
    loan_id: str
    dpd_trigger: bool
    cl_status_trigger: bool
    watchlist_trigger: bool
    forbearance_trigger: bool
    crr_trigger: bool
    pd_ratio_trigger: bool
    sicr_flag: bool
    pd_current: Optional[float] = None
    pd_at_origination: Optional[float] = None

    @property
    def pd_ratio(self) -> Optional[float]:
        if self.pd_at_origination and self.pd_at_origination > 0:
            return (self.pd_current or 0.0) / self.pd_at_origination
        return None

    @property
    def triggered_factors(self) -> list[str]:
        mapping = {
            "DPD": self.dpd_trigger,
            "CL_STATUS": self.cl_status_trigger,
            "WATCHLIST": self.watchlist_trigger,
            "FORBEARANCE": self.forbearance_trigger,
            "CRR_DOWNGRADE": self.crr_trigger,
            "PD_RATIO": self.pd_ratio_trigger,
        }
        return [k for k, v in mapping.items() if v]


def assess_sicr(
    loan_id: str,
    dpd: int,
    cl_status: Optional[str],
    crr_rating: Optional[int],
    is_watchlist: bool,
    is_forbearance: bool,
    pd_at_origination: Optional[float] = None,
    pd_current: Optional[float] = None,
    config: Optional[dict] = None,
) -> SICRAssessment:
    """
    Evaluate all SICR factors for a single loan account.
    Returns an SICRAssessment with individual factor flags and overall sicr_flag.
    """
    cfg = config or SICR_DEFAULT_CONFIG

    dpd_trig = dpd >= cfg["dpd_threshold"]
    cl_trig = bool(cl_status and cl_status in STAGE2_CL_STATUSES)
    watch_trig = is_watchlist
    forbear_trig = is_forbearance
    crr_trig = crr_rating is not None and crr_rating >= cfg["crr_threshold"]

    pd_trig = False
    if pd_at_origination and pd_current and pd_at_origination > 0:
        pd_trig = (pd_current / pd_at_origination) > cfg["pd_ratio_threshold"]

    sicr = dpd_trig or cl_trig or watch_trig or forbear_trig or crr_trig or pd_trig

    return SICRAssessment(
        loan_id=loan_id,
        dpd_trigger=dpd_trig,
        cl_status_trigger=cl_trig,
        watchlist_trigger=watch_trig,
        forbearance_trigger=forbear_trig,
        crr_trigger=crr_trig,
        pd_ratio_trigger=pd_trig,
        sicr_flag=sicr,
        pd_current=pd_current,
        pd_at_origination=pd_at_origination,
    )
