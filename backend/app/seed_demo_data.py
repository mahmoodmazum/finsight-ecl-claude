"""
Demo data seed -- inserts realistic Bangladesh bank loan portfolio data
so every page of the application shows meaningful numbers.

Run:  python -m app.seed_demo_data

SQL Server FK constraints are checked immediately (not deferred), so this
script commits each dependency layer separately:
  1. Users, segments, parameters, macro scenarios
  2. Loan accounts + collateral + staging results
  3. ECL results  (FK -> loan_accounts)
  4. Provision runs + movements + GL entries  (FK -> provision_runs)
  5. Overlays, risk register, audit log
"""
import asyncio
import traceback
import uuid
from datetime import date, datetime, timezone, timedelta
from decimal import Decimal

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.auth.service import hash_password
from app.auth.models import User
from app.models.segment import Segment
from app.models.loan import LoanAccount, Collateral
from app.models.staging import StagingResult, PDParameter, LGDParameter
from app.models.ecl import ECLResult
from app.models.macro import MacroScenario
from app.models.provision import ProvisionRun, ProvisionMovement, GLEntry
from app.models.overlay import ManagementOverlay
from app.models.audit import RiskRegister
from app.models.rbac import UserRole

REPORTING_MONTH = "202503"
PRIOR_MONTH     = "202502"
NOW             = datetime.now(timezone.utc)

# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def d(x):
    return Decimal(str(x))


# ---------------------------------------------------------------------------
# Segments
# ---------------------------------------------------------------------------

DEMO_SEGMENTS = [
    {"segment_id": "SEG-01", "segment_name": "Large Corporate -- Pharma & Industrial",
     "assessment_method": "INDIVIDUAL", "collateral_type": "Mixed",
     "rating_band": "1-4", "unsecured_lgd_floor": d("0.4500"), "ccf": d("0.5000")},
    {"segment_id": "SEG-02", "segment_name": "Large Corporate -- Real Estate & Infra",
     "assessment_method": "INDIVIDUAL", "collateral_type": "Property",
     "rating_band": "1-4", "unsecured_lgd_floor": d("0.4000"), "ccf": d("0.5000")},
    {"segment_id": "SEG-03", "segment_name": "SME -- Manufacturing",
     "assessment_method": "COLLECTIVE", "collateral_type": "Machinery/Property",
     "rating_band": "1-6", "unsecured_lgd_floor": d("0.5500"), "ccf": d("0.5500")},
    {"segment_id": "SEG-04", "segment_name": "SME -- Trading & Services",
     "assessment_method": "COLLECTIVE", "collateral_type": "Stock/Receivables",
     "rating_band": "1-6", "unsecured_lgd_floor": d("0.6000"), "ccf": d("0.5500")},
    {"segment_id": "SEG-05", "segment_name": "Retail -- Mortgage",
     "assessment_method": "POOL", "collateral_type": "Residential Property",
     "rating_band": "N/A", "unsecured_lgd_floor": d("0.3000"), "ccf": d("0.0000")},
    {"segment_id": "SEG-06", "segment_name": "Retail -- Personal Loan",
     "assessment_method": "POOL", "collateral_type": "None",
     "rating_band": "N/A", "unsecured_lgd_floor": d("0.7500"), "ccf": d("0.4000")},
    {"segment_id": "SEG-07", "segment_name": "Trade Finance",
     "assessment_method": "COLLECTIVE", "collateral_type": "Goods/LC",
     "rating_band": "1-5", "unsecured_lgd_floor": d("0.4000"), "ccf": d("1.0000")},
    {"segment_id": "SEG-08", "segment_name": "Agriculture",
     "assessment_method": "POOL", "collateral_type": "Land",
     "rating_band": "N/A", "unsecured_lgd_floor": d("0.6000"), "ccf": d("0.3000")},
    {"segment_id": "SEG-STF", "segment_name": "Staff Loans",
     "assessment_method": "POOL", "collateral_type": "Provident Fund",
     "rating_band": "N/A", "unsecured_lgd_floor": d("0.2000"), "ccf": d("0.0000")},
]

SEG_INDEX = {s["segment_id"]: s for s in DEMO_SEGMENTS}

# 12M PD per segment
SEG_PD = {
    "SEG-01": d("0.018000"), "SEG-02": d("0.022000"),
    "SEG-03": d("0.032000"), "SEG-04": d("0.038000"),
    "SEG-05": d("0.028000"), "SEG-06": d("0.055000"),
    "SEG-07": d("0.021000"), "SEG-08": d("0.060000"),
    "SEG-STF": d("0.005000"),
}

# ---------------------------------------------------------------------------
# ECL pure functions
# ---------------------------------------------------------------------------

TTD = {1: d("0.5"), 2: d("2.0"), 3: d("0.25")}
LIFE_YEARS = d("3.0")


def _lgd(outstanding, collateral_net, unsecured_lgd):
    if outstanding <= 0:
        return unsecured_lgd
    if collateral_net >= outstanding:
        return d("0.05")
    if collateral_net > 0:
        v = d("1") - (collateral_net * d("0.80") / outstanding)
        return max(d("0.05"), min(v, d("1")))
    return unsecured_lgd


def _df(eir, ttd):
    if eir <= 0 or ttd <= 0:
        return d("1")
    return d("1") / (d("1") + eir) ** ttd


def ecl_for(loan):
    seg  = SEG_INDEX[loan["seg"]]
    ccf  = seg["ccf"]
    ulgd = seg["unsecured_lgd_floor"]
    out  = loan["out"]
    undr = loan["undr"]
    stg  = loan["stage"]
    eir  = loan["eir"]
    col  = out * d(str(loan.get("col_pct") or 0))

    ead  = out + (undr * ccf)
    lgd  = _lgd(out, col, ulgd)
    df   = _df(eir, TTD[stg])
    pd12 = SEG_PD[loan["seg"]]

    if stg == 3:
        pd_lt = d("1.0"); pd_use = d("1.0")
    elif stg == 2:
        pd_lt = d("1") - (d("1") - pd12) ** LIFE_YEARS; pd_use = pd_lt
    else:
        pd_lt = pd12; pd_use = pd12

    raw     = ead * pd_use * lgd * df
    base    = raw * d("1.0")
    opt     = raw * d("0.875")
    pess    = raw * d("1.280")
    weighted = base * d("0.50") + opt * d("0.25") + pess * d("0.25")
    q = d("0.0001")
    return dict(
        ead=ead.quantize(q), pd_12m=pd12.quantize(d("0.000001")),
        pd_lifetime=pd_lt.quantize(d("0.000001")), lgd=lgd.quantize(q),
        eir=eir.quantize(q), ecl_base=base.quantize(q),
        ecl_optimistic=opt.quantize(q), ecl_pessimistic=pess.quantize(q),
        ecl_weighted=weighted.quantize(q),
    )


# ---------------------------------------------------------------------------
# Loan definitions  (compact dict format)
# ---------------------------------------------------------------------------

def L(lid, cid, name, seg, out, undr, dpd, cls, crr, stage,
      wl=False, fb=False, eir="0.09", col_pct=None):
    return dict(loan_id=lid, cid=cid, name=name, seg=seg,
                out=d(out), undr=d(undr), dpd=dpd, cls=cls, crr=crr,
                stage=stage, wl=wl, fb=fb, eir=d(eir),
                col_pct=col_pct)


ALL_LOANS = [
    # ---- Large Corporate (20) ---
    L("LN-LC-0001","C-LC-001","Meghna Cement Ltd",              "SEG-01",280,50, 0,"STD",2,1,col_pct=0.9),
    L("LN-LC-0002","C-LC-002","Square Pharmaceuticals Ltd",     "SEG-01",420,100,0,"STD",1,1,col_pct=1.1),
    L("LN-LC-0003","C-LC-003","Bashundhara Group",              "SEG-02",350,80, 5,"STD",2,1,col_pct=1.2),
    L("LN-LC-0004","C-LC-004","PRAN-RFL Group",                 "SEG-01",190,30, 0,"STD",1,1,col_pct=0.8),
    L("LN-LC-0005","C-LC-005","Walton Hi-Tech Industries",      "SEG-01",215,60, 0,"STD",2,1,col_pct=0.9),
    L("LN-LC-0006","C-LC-006","ACI Limited",                    "SEG-01",165,20, 8,"STD",2,1,col_pct=0.7),
    L("LN-LC-0007","C-LC-007","Beximco Pharmaceuticals",        "SEG-01",310,90, 0,"STD",1,1,col_pct=1.0),
    L("LN-LC-0008","C-LC-008","Jamuna Group",                   "SEG-02",480,120,3,"STD",2,1,col_pct=1.3),
    L("LN-LC-0009","C-LC-009","Summit Power Ltd",               "SEG-02",390,70, 0,"STD",1,1,col_pct=1.1),
    L("LN-LC-0010","C-LC-010","Orion Group",                    "SEG-01",260,40,12,"STD",3,1,col_pct=0.6),
    L("LN-LC-0011","C-LC-011","Abdul Monem Ltd",                "SEG-01",175,25, 0,"STD",2,1,col_pct=0.8),
    L("LN-LC-0012","C-LC-012","Energy PAC Group",               "SEG-02",320,55, 0,"STD",2,1,col_pct=1.0),
    L("LN-LC-0013","C-LC-013","DBL Group",                      "SEG-02",150,30,45,"SMA",5,2,wl=True),
    L("LN-LC-0014","C-LC-014","Akij Group",                     "SEG-01",220, 0,38,"SMA",6,2,fb=True,col_pct=0.5),
    L("LN-LC-0015","C-LC-015","Abul Khair Group",               "SEG-02", 95, 0,62,"SS", 7,2,wl=True,col_pct=0.4),
    L("LN-LC-0016","C-LC-016","PHP Group",                      "SEG-02",180, 0,55,"SMA",5,2,fb=True),
    L("LN-LC-0017","C-LC-017","National Polymer Industries",    "SEG-01", 75, 0,72,"SS", 6,2,wl=True,col_pct=0.4),
    L("LN-LC-0018","C-LC-018","BRAC Enterprises",               "SEG-01",120, 0,95,"DF", 8,3,col_pct=0.3),
    L("LN-LC-0019","C-LC-019","Mir Group International",        "SEG-02", 85, 0, 0,"BL", 9,3,col_pct=0.2),
    L("LN-LC-0020","C-LC-020","Pacific Industries Ltd",         "SEG-01", 65, 0,130,"BL",9,3),
    # ---- SME (25) ---
    L("LN-SM-0001","C-SM-001","Dhaka Printing & Packaging",     "SEG-03",12,2, 0,"STD",3,1,col_pct=0.9),
    L("LN-SM-0002","C-SM-002","Chittagong Steel Traders",       "SEG-04", 8,1, 0,"STD",4,1,col_pct=0.7),
    L("LN-SM-0003","C-SM-003","Sylhet Tea Processors",          "SEG-03",18,3, 5,"STD",3,1,col_pct=0.8),
    L("LN-SM-0004","C-SM-004","Comilla Garments Ltd",           "SEG-03",22,4, 0,"STD",2,1,col_pct=1.0),
    L("LN-SM-0005","C-SM-005","Narayanganj Textile Mill",       "SEG-03",15,2, 8,"STD",3,1,col_pct=0.9),
    L("LN-SM-0006","C-SM-006","Rajshahi Silk Weavers",          "SEG-04", 6,1, 0,"STD",4,1,col_pct=0.6),
    L("LN-SM-0007","C-SM-007","Khulna Fish Processors",         "SEG-04", 9,2, 3,"STD",3,1,col_pct=0.7),
    L("LN-SM-0008","C-SM-008","Mymensingh Agro-Industries",     "SEG-03",14,2, 0,"STD",2,1,col_pct=0.8),
    L("LN-SM-0009","C-SM-009","Tangail Handloom Coop",          "SEG-04", 5,0, 0,"STD",4,1,col_pct=0.5),
    L("LN-SM-0010","C-SM-010","Barisal Rice Mills",             "SEG-03",20,3,15,"STD",3,1,col_pct=0.9),
    L("LN-SM-0011","C-SM-011","Bogra Metal Works",              "SEG-03",11,1, 0,"STD",3,1,col_pct=0.7),
    L("LN-SM-0012","C-SM-012","Dinajpur Cement Depot",          "SEG-04", 7,1, 0,"STD",4,1,col_pct=0.6),
    L("LN-SM-0013","C-SM-013","Rangpur Cold Storage",           "SEG-03",16,2,10,"STD",3,1,col_pct=0.8),
    L("LN-SM-0014","C-SM-014","Jessore Jute Mills",             "SEG-03",13,2, 0,"STD",3,1,col_pct=0.8),
    L("LN-SM-0015","C-SM-015","Cox Bazar Tourism Ventures",     "SEG-04",10,1,20,"STD",4,1,col_pct=0.7),
    L("LN-SM-0016","C-SM-016","Gazipur Auto Parts",             "SEG-03",19,3, 0,"STD",2,1,col_pct=1.0),
    L("LN-SM-0017","C-SM-017","Faridpur Pharmaceuticals",       "SEG-03", 8,0,35,"SMA",6,2,wl=True,col_pct=0.4),
    L("LN-SM-0018","C-SM-018","Cumilla Electronics",            "SEG-04", 5,0,48,"SS", 7,2,wl=True,col_pct=0.3),
    L("LN-SM-0019","C-SM-019","Noakhali Frozen Foods",          "SEG-04",11,0,60,"SS", 7,2,fb=True),
    L("LN-SM-0020","C-SM-020","Manikganj Leather Works",        "SEG-03", 7,0,42,"SMA",6,2,wl=True,col_pct=0.4),
    L("LN-SM-0021","C-SM-021","Chapainawabganj Mango Proc",     "SEG-04", 4,0,55,"SS", 7,2,fb=True),
    L("LN-SM-0022","C-SM-022","Brahmanbaria Industrial Supply", "SEG-03", 9,0,38,"SMA",5,2,wl=True,col_pct=0.4),
    L("LN-SM-0023","C-SM-023","Sirajganj Livestock Farm",       "SEG-04", 6,0,95,"DF", 8,3,col_pct=0.2),
    L("LN-SM-0024","C-SM-024","Pabna Yarn Factory",             "SEG-03",12,0, 0,"BL", 9,3),
    L("LN-SM-0025","C-SM-025","Kishorganj Rice Traders",        "SEG-04", 5,0,105,"BL",9,3),
    # ---- Retail Mortgage (20) ---
    L("LN-MT-0001","C-MT-001","Md. Rafiqul Islam",   "SEG-05",4.5,0, 0,"STD",None,1,col_pct=1.3),
    L("LN-MT-0002","C-MT-002","Sultana Parvin",       "SEG-05",3.2,0, 0,"STD",None,1,col_pct=1.5),
    L("LN-MT-0003","C-MT-003","A.K.M. Nurul Alam",   "SEG-05",6.8,0, 5,"STD",None,1,col_pct=1.2),
    L("LN-MT-0004","C-MT-004","Shirin Akhter",        "SEG-05",2.1,0, 0,"STD",None,1,col_pct=1.4),
    L("LN-MT-0005","C-MT-005","Mohammad Jahangir",    "SEG-05",5.5,0, 0,"STD",None,1,col_pct=1.3),
    L("LN-MT-0006","C-MT-006","Nasreen Begum",        "SEG-05",1.8,0, 0,"STD",None,1,col_pct=1.5),
    L("LN-MT-0007","C-MT-007","Abu Bakar Siddique",   "SEG-05",7.2,0, 8,"STD",None,1,col_pct=1.2),
    L("LN-MT-0008","C-MT-008","Fatema Khanam",        "SEG-05",3.9,0, 0,"STD",None,1,col_pct=1.4),
    L("LN-MT-0009","C-MT-009","Md. Kamruzzaman",      "SEG-05",5.0,0, 0,"STD",None,1,col_pct=1.3),
    L("LN-MT-0010","C-MT-010","Reba Begum",           "SEG-05",2.5,0,15,"STD",None,1,col_pct=1.4),
    L("LN-MT-0011","C-MT-011","Kazi Anwar Hossain",   "SEG-05",4.2,0, 0,"STD",None,1,col_pct=1.2),
    L("LN-MT-0012","C-MT-012","Sumaiya Islam",        "SEG-05",6.5,0, 0,"STD",None,1,col_pct=1.3),
    L("LN-MT-0013","C-MT-013","Md. Moinul Haque",     "SEG-05",1.5,0, 0,"STD",None,1,col_pct=1.6),
    L("LN-MT-0014","C-MT-014","Dilruba Yeasmin",      "SEG-05",3.8,0,10,"STD",None,1,col_pct=1.3),
    L("LN-MT-0015","C-MT-015","Golam Kibria",         "SEG-05",5.8,0, 0,"STD",None,1,col_pct=1.2),
    L("LN-MT-0016","C-MT-016","Sadia Rahman",         "SEG-05",4.0,0,32,"SMA",None,2,wl=True, col_pct=1.0),
    L("LN-MT-0017","C-MT-017","H.M. Shafiqul Islam",  "SEG-05",6.2,0,55,"SS", None,2,fb=True, col_pct=1.1),
    L("LN-MT-0018","C-MT-018","Mumtaz Begum",         "SEG-05",2.8,0,40,"SMA",None,2,wl=True, col_pct=1.0),
    L("LN-MT-0019","C-MT-019","Md. Abdul Kader",      "SEG-05",5.5,0,92,"DF", None,3,col_pct=0.8),
    L("LN-MT-0020","C-MT-020","Lovely Begum",         "SEG-05",3.1,0, 0,"BL", None,3,col_pct=0.7),
    # ---- Retail Personal (15) ---
    L("LN-RP-0001","C-RP-001","Md. Sohel Rana",       "SEG-06",0.8,0.2, 0,"STD",None,1),
    L("LN-RP-0002","C-RP-002","Marzena Khatun",       "SEG-06",0.5,0.1, 0,"STD",None,1),
    L("LN-RP-0003","C-RP-003","Abu Sayem",            "SEG-06",1.2,0.3, 5,"STD",None,1),
    L("LN-RP-0004","C-RP-004","Rehana Akter",         "SEG-06",0.9,0.2, 0,"STD",None,1),
    L("LN-RP-0005","C-RP-005","Md. Mizanur Rahman",   "SEG-06",1.8,0.4, 0,"STD",None,1),
    L("LN-RP-0006","C-RP-006","Shaila Khanam",        "SEG-06",0.6,0.1, 8,"STD",None,1),
    L("LN-RP-0007","C-RP-007","Md. Touhidul Islam",   "SEG-06",1.5,0.3, 0,"STD",None,1),
    L("LN-RP-0008","C-RP-008","Nargis Begum",         "SEG-06",0.4,0.1, 0,"STD",None,1),
    L("LN-RP-0009","C-RP-009","Salauddin Ahmed",      "SEG-06",1.1,0.2,12,"STD",None,1),
    L("LN-RP-0010","C-RP-010","Farhana Islam",        "SEG-06",0.7,0.1, 0,"STD",None,1),
    L("LN-RP-0011","C-RP-011","Md. Habibur Rahman",   "SEG-06",1.0,0,  35,"SMA",None,2,wl=True),
    L("LN-RP-0012","C-RP-012","Afroza Begum",         "SEG-06",0.8,0,  48,"SS", None,2,fb=True),
    L("LN-RP-0013","C-RP-013","Md. Delwar Hossain",   "SEG-06",1.5,0,  62,"SS", None,2,wl=True),
    L("LN-RP-0014","C-RP-014","Kohinoor Khatun",      "SEG-06",0.9,0,  95,"DF", None,3),
    L("LN-RP-0015","C-RP-015","Sazzad Hossain",       "SEG-06",1.2,0,   0,"BL", None,3),
    # ---- Trade Finance (15) ---
    L("LN-TF-0001","C-TF-001","Bengal Textile Exporters",       "SEG-07",45,10, 0,"STD",2,1,col_pct=0.9),
    L("LN-TF-0002","C-TF-002","Chittagong Port Logistics",      "SEG-07",35, 8, 0,"STD",2,1,col_pct=0.8),
    L("LN-TF-0003","C-TF-003","Dhaka RMG Exporters Ltd",        "SEG-07",70,15, 5,"STD",2,1,col_pct=0.9),
    L("LN-TF-0004","C-TF-004","Bangladesh Frozen Foods Export", "SEG-07",28, 6, 0,"STD",3,1,col_pct=0.7),
    L("LN-TF-0005","C-TF-005","Meghna River Transport",         "SEG-07",52,12, 0,"STD",2,1,col_pct=0.8),
    L("LN-TF-0006","C-TF-006","Keya Cosmetics Export",          "SEG-07",18, 4, 8,"STD",3,1,col_pct=0.7),
    L("LN-TF-0007","C-TF-007","Komfit Metal Export",            "SEG-07",40, 9, 0,"STD",2,1,col_pct=0.9),
    L("LN-TF-0008","C-TF-008","Abahani Holdings Trade",         "SEG-07",60,14, 3,"STD",2,1,col_pct=0.8),
    L("LN-TF-0009","C-TF-009","National Tea Trading Co",        "SEG-07",22, 5, 0,"STD",3,1,col_pct=0.7),
    L("LN-TF-0010","C-TF-010","Dhaka Commodity Exchange",       "SEG-07",75,16, 0,"STD",1,1,col_pct=0.9),
    L("LN-TF-0011","C-TF-011","Star Ceramic Ltd",               "SEG-07",33, 7,15,"STD",3,1,col_pct=0.8),
    L("LN-TF-0012","C-TF-012","Pacific Jeans Exports",          "SEG-07",25, 0,40,"SMA",5,2,wl=True,col_pct=0.5),
    L("LN-TF-0013","C-TF-013","Square Toiletries Export",       "SEG-07",18, 0,55,"SS", 6,2,fb=True,col_pct=0.4),
    L("LN-TF-0014","C-TF-014","Advanced Chemical Industries",   "SEG-07",32, 0,48,"SMA",5,2,wl=True,col_pct=0.5),
    L("LN-TF-0015","C-TF-015","Rupali Export House",            "SEG-07",20, 0,98,"DF", 8,3,col_pct=0.3),
    # ---- Agriculture (15) ---
    L("LN-AG-0001","C-AG-001","Sonali Agro Industries",         "SEG-08",1.2,0.2, 0,"STD",None,1,col_pct=0.8),
    L("LN-AG-0002","C-AG-002","Krisibid Samabay Samity",        "SEG-08",0.8,0.1, 0,"STD",None,1,col_pct=0.7),
    L("LN-AG-0003","C-AG-003","Boro Paddy Producers Coop",      "SEG-08",1.5,0.2, 5,"STD",None,1,col_pct=0.8),
    L("LN-AG-0004","C-AG-004","Rajshahi Mango Growers Ltd",     "SEG-08",0.5,0.1, 0,"STD",None,1,col_pct=0.6),
    L("LN-AG-0005","C-AG-005","Comilla Vegetable Farmers",      "SEG-08",0.9,0.1, 0,"STD",None,1,col_pct=0.7),
    L("LN-AG-0006","C-AG-006","Sylhet Tea Garden Holdings",     "SEG-08",1.4,0.2, 8,"STD",None,1,col_pct=0.9),
    L("LN-AG-0007","C-AG-007","Faridpur Jute Farmers Group",    "SEG-08",0.6,0.1, 0,"STD",None,1,col_pct=0.7),
    L("LN-AG-0008","C-AG-008","Bogra Potato Processors",        "SEG-08",1.1,0.1, 0,"STD",None,1,col_pct=0.8),
    L("LN-AG-0009","C-AG-009","Dinajpur Grain Cooperative",     "SEG-08",1.3,0.2,10,"STD",None,1,col_pct=0.8),
    L("LN-AG-0010","C-AG-010","Rangpur Tobacco Farmers",        "SEG-08",0.7,0,  30,"SMA",None,2,wl=True),
    L("LN-AG-0011","C-AG-011","Mymensingh Fisheries",           "SEG-08",1.0,0,  45,"SMA",None,2,fb=True),
    L("LN-AG-0012","C-AG-012","Khulna Shrimp Farmers",          "SEG-08",0.8,0,  58,"SS", None,2,wl=True),
    L("LN-AG-0013","C-AG-013","Barisal Coconut Growers",        "SEG-08",0.6,0,  35,"SMA",None,2,fb=True),
    L("LN-AG-0014","C-AG-014","Noakhali Rice Mill Collective",  "SEG-08",0.9,0,  95,"DF", None,3),
    L("LN-AG-0015","C-AG-015","Pabna Sugar Mills",              "SEG-08",1.2,0,   0,"BL", None,3),
    # ---- Staff (10, all Stage 1) ---
    L("LN-SF-0001","C-SF-001","Karim, Senior Manager HR",       "SEG-STF",0.35,0,0,"STD",None,1,eir="0.07"),
    L("LN-SF-0002","C-SF-002","Islam, Deputy GM Operations",    "SEG-STF",0.48,0,0,"STD",None,1,eir="0.07"),
    L("LN-SF-0003","C-SF-003","Begum, Chief Financial Officer", "SEG-STF",0.28,0,0,"STD",None,1,eir="0.07"),
    L("LN-SF-0004","C-SF-004","Ahmed, VP Technology",           "SEG-STF",0.42,0,0,"STD",None,1,eir="0.07"),
    L("LN-SF-0005","C-SF-005","Rahman, Head of Compliance",     "SEG-STF",0.22,0,0,"STD",None,1,eir="0.07"),
    L("LN-SF-0006","C-SF-006","Khan, Principal Officer",        "SEG-STF",0.18,0,0,"STD",None,1,eir="0.07"),
    L("LN-SF-0007","C-SF-007","Hossain, Senior Officer",        "SEG-STF",0.12,0,0,"STD",None,1,eir="0.07"),
    L("LN-SF-0008","C-SF-008","Akter, Officer Grade 1",         "SEG-STF",0.15,0,0,"STD",None,1,eir="0.07"),
    L("LN-SF-0009","C-SF-009","Uddin, Officer Grade 2",         "SEG-STF",0.09,0,0,"STD",None,1,eir="0.07"),
    L("LN-SF-0010","C-SF-010","Noor, Junior Officer",           "SEG-STF",0.06,0,0,"STD",None,1,eir="0.07"),
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def exists(db: AsyncSession, table: str, where: str, params: dict) -> bool:
    r = await db.execute(text(f"SELECT 1 FROM {table} WHERE {where}"), params)
    row = r.fetchone()
    r.close()
    return row is not None


# ---------------------------------------------------------------------------
# Seed phases -- each manages its own session(s) and commits after every INSERT
# ---------------------------------------------------------------------------

async def phase1_users_and_segments() -> tuple[str, str, str]:
    """Returns (admin_id, cro_id, analyst_id)."""
    print("  [Phase 1] Users, segments, parameters, macro scenarios...")

    user_ids: dict[str, str] = {}

    # --- users (own session)
    async with AsyncSessionLocal() as db:
        r = await db.execute(text("SELECT user_id FROM users WHERE email = 'admin@finsight.com'"))
        row = r.fetchone()
        r.close()
        if row:
            admin_id = row[0]
        else:
            admin_id = str(uuid.uuid4())
            db.add(User(user_id=admin_id, email="admin@finsight.com",
                        password_hash=hash_password("Admin@123456"),
                        full_name="System Administrator", role="ADMIN",
                        is_active=True, created_by="DEMO_SEED"))
            await db.commit()
            await asyncio.sleep(0.1)

        user_ids["admin@finsight.com"] = admin_id

        # role map
        r2 = await db.execute(text("SELECT name, role_id FROM roles WHERE is_system = 1"))
        role_map = {name: rid for name, rid in r2}
        r2.close()

        # extra users
        for email, full_name, legacy_role, role_key in [
            ("cro@finsight.com",          "Chief Risk Officer",            "CRO",     "CRO"),
            ("analyst@finsight.com",      "ECL Analyst",                   "ANALYST", "ANALYST"),
            ("viewer@finsight.com",       "Read-Only Viewer",              "VIEWER",  "VIEWER"),
            ("rahman.ahmed@finsight.com", "Md. Rahman Ahmed (Analyst)",    "ANALYST", "ANALYST"),
            ("fatema.begum@finsight.com", "Fatema Begum (Finance)",        "VIEWER",  "VIEWER"),
        ]:
            ck = await db.execute(text("SELECT user_id FROM users WHERE email = :e"), {"e": email})
            ex = ck.fetchone()
            ck.close()
            if ex:
                user_ids[email] = ex[0]
                continue
            uid = str(uuid.uuid4())
            db.add(User(user_id=uid, email=email,
                        password_hash=hash_password("Demo@123456"),
                        full_name=full_name, role=legacy_role,
                        is_active=True, created_by=admin_id))
            await db.commit()
            await asyncio.sleep(0.1)
            user_ids[email] = uid
            rid = role_map.get(role_key)
            if rid:
                try:
                    db.add(UserRole(user_id=uid, role_id=rid, assigned_by=admin_id))
                    await db.commit()
                    await asyncio.sleep(0.1)
                except Exception:
                    await db.rollback()

    cro_id     = user_ids.get("cro@finsight.com",     admin_id)
    analyst_id = user_ids.get("analyst@finsight.com", admin_id)

    # --- segments (new session)
    async with AsyncSessionLocal() as db:
        for seg in DEMO_SEGMENTS:
            if not await exists(db, "segments", "segment_id = :x", {"x": seg["segment_id"]}):
                db.add(Segment(**seg, is_active=True, created_by=admin_id))
                await db.commit()
                await asyncio.sleep(0.1)

    # --- macro scenarios for 202503
    async with AsyncSessionLocal() as db:
        for name, wt, gdp, cpi, usd, repo, npl, mult in [
            ("BASE",        "0.5000","0.0620","0.0810","110.0000","0.0850","0.0920","1.000000"),
            ("OPTIMISTIC",  "0.2500","0.0750","0.0580","105.0000","0.0750","0.0780","0.875000"),
            ("PESSIMISTIC", "0.2500","0.0410","0.1230","128.0000","0.1050","0.1350","1.280000"),
        ]:
            if not await exists(db, "macro_scenarios",
                                "reporting_month=:m AND scenario_name=:n",
                                {"m": REPORTING_MONTH, "n": name}):
                db.add(MacroScenario(
                    scenario_id=str(uuid.uuid4()), reporting_month=REPORTING_MONTH,
                    scenario_name=name, weight=d(wt),
                    gdp_growth=d(gdp), cpi_inflation=d(cpi),
                    bdt_usd_rate=d(usd), bb_repo_rate=d(repo),
                    npl_ratio=d(npl), macro_multiplier=d(mult),
                    approved_by=cro_id, approved_at=NOW,
                    status="APPROVED", created_by=analyst_id,
                ))
                await db.commit()
                await asyncio.sleep(0.1)

    # --- PD + LGD parameters for 202503
    async with AsyncSessionLocal() as db:
        obs_wts = [d("0.40"), d("0.30"), d("0.20"), d("0.10")]
        for seg in DEMO_SEGMENTS:
            sid = seg["segment_id"]
            base_pd = SEG_PD[sid]
            for obs_no, w in enumerate(obs_wts, 1):
                if not await exists(db, "pd_parameters",
                                    "segment_id=:s AND reporting_month=:m AND observation_no=:n",
                                    {"s": sid, "m": REPORTING_MONTH, "n": obs_no}):
                    raw = base_pd * (d("1") + d(str((obs_no - 1) * 0.05)))
                    db.add(PDParameter(
                        pd_param_id=str(uuid.uuid4()), segment_id=sid,
                        reporting_month=REPORTING_MONTH, observation_no=obs_no,
                        start_month=f"{int(REPORTING_MONTH[:4]) - obs_no:04d}{REPORTING_MONTH[4:]}",
                        end_month=REPORTING_MONTH,
                        total_accounts=200 - obs_no * 10,
                        default_accounts=max(1, int(float(raw) * (200 - obs_no * 10))),
                        raw_pd=raw.quantize(d("0.000001")),
                        observation_weight=w,
                        weighted_pd=(raw * w).quantize(d("0.000001")),
                        created_by=analyst_id,
                    ))
                    await db.commit()
                    await asyncio.sleep(0.1)
            for tier, lgd_val, haircut in [
                ("OVER_SECURED", d("0.05"), d("0.20")),
                ("PARTIAL",      d("0.35"), d("0.20")),
                ("UNSECURED",    seg["unsecured_lgd_floor"], d("0.00")),
            ]:
                if not await exists(db, "lgd_parameters",
                                    "segment_id=:s AND reporting_month=:m AND security_tier=:t",
                                    {"s": sid, "m": REPORTING_MONTH, "t": tier}):
                    db.add(LGDParameter(
                        lgd_id=str(uuid.uuid4()), segment_id=sid,
                        reporting_month=REPORTING_MONTH, security_tier=tier,
                        lgd_value=lgd_val, haircut_pct=haircut,
                        is_active=True, created_by=analyst_id,
                    ))
                    await db.commit()
                    await asyncio.sleep(0.1)

    print(f"     -> users={len(user_ids)}, segments={len(DEMO_SEGMENTS)}, macro=3, PD/LGD params committed")
    return admin_id, cro_id, analyst_id


async def phase2a_loan_accounts(analyst_id: str) -> None:
    """Insert loan_accounts only -- commit before child tables."""
    async with AsyncSessionLocal() as db:
        for loan in ALL_LOANS:
            lid = loan["loan_id"]
            sid = loan["seg"]
            if not await exists(db, "loan_accounts", "loan_id = :x", {"x": lid}):
                db.add(LoanAccount(
                    loan_id=lid, customer_id=loan["cid"], customer_name=loan["name"],
                    segment_id=sid, outstanding_balance=loan["out"],
                    sanctioned_limit=loan["out"] * d("1.15"),
                    undrawn_limit=loan["undr"], currency="BDT",
                    origination_date=date(2021, 3, 1), maturity_date=date(2028, 3, 31),
                    interest_rate=loan["eir"], effective_interest_rate=loan["eir"],
                    cl_status=loan["cls"], dpd=loan["dpd"], crr_rating=loan["crr"],
                    is_watchlist=loan["wl"], is_forbearance=loan["fb"],
                    reporting_month=REPORTING_MONTH, created_by=analyst_id,
                ))
                await db.commit()
                await asyncio.sleep(0.1)
    print(f"     -> {len(ALL_LOANS)} loan_accounts committed")


async def phase2b_collateral(analyst_id: str) -> None:
    """Insert collateral -- loan_accounts must already be committed."""
    count = 0
    async with AsyncSessionLocal() as db:
        for loan in ALL_LOANS:
            lid = loan["loan_id"]
            sid = loan["seg"]
            col_pct = loan.get("col_pct") or 0
            if col_pct > 0 and not await exists(db, "collateral",
                                                 "loan_id = :x AND reporting_month = :m",
                                                 {"x": lid, "m": REPORTING_MONTH}):
                gross = loan["out"] * d(str(col_pct)) * d("1.25")
                haircut = d("0.20")
                db.add(Collateral(
                    collateral_id=str(uuid.uuid4()), loan_id=lid,
                    collateral_type="Property" if sid in ("SEG-01","SEG-02","SEG-05")
                                    else "Goods/LC" if sid == "SEG-07" else "Land/Machinery",
                    gross_value=gross.quantize(d("0.0001")),
                    haircut_pct=haircut,
                    net_value=(gross * (1 - haircut)).quantize(d("0.0001")),
                    reporting_month=REPORTING_MONTH, created_by=analyst_id,
                ))
                await db.commit()
                await asyncio.sleep(0.1)
                count += 1
    print(f"     -> {count} collateral records committed")


async def phase2c_staging(analyst_id: str) -> None:
    """Insert staging_results -- loan_accounts must already be committed."""
    async with AsyncSessionLocal() as db:
        for loan in ALL_LOANS:
            lid = loan["loan_id"]
            if not await exists(db, "staging_results",
                                 "loan_id = :x AND reporting_month = :m",
                                 {"x": lid, "m": REPORTING_MONTH}):
                stg = loan["stage"]
                db.add(StagingResult(
                    loan_id=lid, reporting_month=REPORTING_MONTH,
                    stage=stg,
                    ifrs_default_flag=(stg == 3),
                    sicr_flag=(stg >= 2),
                    dpd_at_staging=loan["dpd"],
                    cl_status_at_staging=loan["cls"],
                    crr_at_staging=loan["crr"],
                    override_flag=False,
                    created_by=analyst_id,
                ))
                await db.commit()
                await asyncio.sleep(0.1)
    print(f"     -> {len(ALL_LOANS)} staging_results committed")


async def phase3_ecl(analyst_id: str) -> Decimal:
    """Insert ECL results -- committed separately after loan_accounts exist."""
    print("  [Phase 3] ECL results...")

    total_ecl = d("0")
    async with AsyncSessionLocal() as db:
        for loan in ALL_LOANS:
            lid = loan["loan_id"]
            if await exists(db, "ecl_results",
                            "loan_id = :x AND reporting_month = :m",
                            {"x": lid, "m": REPORTING_MONTH}):
                # already exists -- add to total
                r = await db.execute(
                    text("SELECT ecl_weighted FROM ecl_results WHERE loan_id=:x AND reporting_month=:m"),
                    {"x": lid, "m": REPORTING_MONTH},
                )
                row = r.fetchone()
                r.close()
                if row:
                    total_ecl += d(str(row[0]))
                continue

            e = ecl_for(loan)
            db.add(ECLResult(
                loan_id=lid, reporting_month=REPORTING_MONTH, stage=loan["stage"],
                **e, pd_at_origination=e["pd_12m"], run_id=None, created_by=analyst_id,
            ))
            await db.commit()
            await asyncio.sleep(0.1)
            total_ecl += e["ecl_weighted"]

    total_ecl = total_ecl.quantize(d("0.0001"))
    print(f"     -> {len(ALL_LOANS)} ecl_results committed | total ECL = {float(total_ecl):.4f} BDT Cr")
    return total_ecl


async def phase4_provision(cro_id: str, analyst_id: str, total_ecl: Decimal) -> None:
    """Insert provision runs, movements, GL entries."""
    print("  [Phase 4] Provision runs, waterfall, GL entries...")

    prior_ecl = (total_ecl * d("0.873")).quantize(d("0.0001"))

    run_id = str(uuid.uuid4())

    # Provision runs
    async with AsyncSessionLocal() as db:
        prior_run_id = str(uuid.uuid4())
        if not await exists(db, "provision_runs",
                            "reporting_month=:m AND status='LOCKED'", {"m": PRIOR_MONTH}):
            db.add(ProvisionRun(
                run_id=prior_run_id, reporting_month=PRIOR_MONTH,
                run_type="MONTH_END", status="LOCKED",
                total_ecl=prior_ecl,
                total_stage1_ecl=(prior_ecl * d("0.38")).quantize(d("0.0001")),
                total_stage2_ecl=(prior_ecl * d("0.32")).quantize(d("0.0001")),
                total_stage3_ecl=(prior_ecl * d("0.30")).quantize(d("0.0001")),
                initiated_by=analyst_id, approved_by=cro_id,
                initiated_at=NOW - timedelta(days=32),
                approved_at=NOW - timedelta(days=30),
                locked_at=NOW - timedelta(days=29),
                created_by=analyst_id,
            ))
            await db.commit()
            await asyncio.sleep(0.1)

        if not await exists(db, "provision_runs",
                            "reporting_month=:m AND status='APPROVED'", {"m": REPORTING_MONTH}):
            db.add(ProvisionRun(
                run_id=run_id, reporting_month=REPORTING_MONTH,
                run_type="MONTH_END", status="APPROVED",
                total_ecl=total_ecl,
                total_stage1_ecl=(total_ecl * d("0.36")).quantize(d("0.0001")),
                total_stage2_ecl=(total_ecl * d("0.34")).quantize(d("0.0001")),
                total_stage3_ecl=(total_ecl * d("0.30")).quantize(d("0.0001")),
                initiated_by=analyst_id, approved_by=cro_id,
                initiated_at=NOW - timedelta(hours=5),
                approved_at=NOW - timedelta(hours=1),
                created_by=analyst_id,
            ))
            await db.commit()
            await asyncio.sleep(0.1)
        else:
            r = await db.execute(
                text("SELECT run_id FROM provision_runs WHERE reporting_month=:m AND status='APPROVED'"),
                {"m": REPORTING_MONTH},
            )
            row = r.fetchone()
            r.close()
            run_id = row[0] if row else run_id

    # Movements
    async with AsyncSessionLocal() as db:
        if not await exists(db, "provision_movement", "run_id=:r", {"r": run_id}):
            for mv_type, pct_str, cnt, notes in [
                ("OTHER",            str(float(prior_ecl)), 0,  "Opening ECL balance (202502 locked run)"),
                ("NEW_ORIGINATION",  "0.028", 12, "New originations in March 2025"),
                ("STAGE_1_TO_2",     "0.094", 18, "Stage 1 -> 2 migrations (SICR events)"),
                ("STAGE_2_TO_3",     "0.058",  8, "Stage 2 -> 3 migrations (defaults)"),
                ("CURE_2_TO_1",     "-0.020",  6, "Stage 2 -> 1 cures (SICR resolved)"),
                ("PARAMETER_CHANGE", "0.039",  0, "PD/LGD parameter update Mar-25"),
                ("MACRO_UPDATE",     "0.024",  0, "Macro scenario weight revision"),
                ("REPAYMENT",       "-0.048", 35, "Scheduled loan repayments"),
                ("WRITE_OFF",       "-0.017",  4, "Write-offs approved by Board"),
                ("FX",              "0.003",   0, "BDT/USD FX restatement"),
            ]:
                if mv_type == "OTHER":
                    amount = prior_ecl
                else:
                    amount = (total_ecl * d(pct_str)).quantize(d("0.0001"))
                db.add(ProvisionMovement(
                    movement_id=str(uuid.uuid4()), run_id=run_id,
                    movement_type=mv_type, amount=amount,
                    account_count=cnt, notes=notes, created_by=analyst_id,
                ))
                await db.commit()
                await asyncio.sleep(0.1)

    # GL entries
    async with AsyncSessionLocal() as db:
        if not await exists(db, "gl_entries", "run_id=:r", {"r": run_id}):
            movement = (total_ecl - prior_ecl).quantize(d("0.0001"))
            if movement > 0:
                db.add(GLEntry(
                    entry_id=str(uuid.uuid4()), run_id=run_id,
                    entry_date=date(2025, 3, 31),
                    dr_account="5001-ECL-CHARGE", cr_account="2001-ECL-ALLOWANCE",
                    amount=movement, currency="BDT",
                    description=f"ECL provision increase -- March 2025 ({REPORTING_MONTH})",
                    entry_type="PROVISION_INCREASE", posted=True,
                    posted_at=NOW - timedelta(hours=1), created_by=analyst_id,
                ))
                await db.commit()
                await asyncio.sleep(0.1)
            db.add(GLEntry(
                entry_id=str(uuid.uuid4()), run_id=run_id,
                entry_date=date(2025, 3, 31),
                dr_account="2001-ECL-ALLOWANCE", cr_account="2001-WO-RESERVE",
                amount=(total_ecl * d("0.017")).quantize(d("0.0001")),
                currency="BDT",
                description="Write-off provision transfer -- March 2025",
                entry_type="WRITE_OFF", posted=True,
                posted_at=NOW - timedelta(hours=1), created_by=analyst_id,
            ))
            await db.commit()
            await asyncio.sleep(0.1)

    print(f"     -> provision runs, movements, GL entries committed")


async def phase5_overlays_risks_audit(admin_id: str, cro_id: str, analyst_id: str) -> None:
    """Insert management overlays, risk register, audit log."""
    print("  [Phase 5] Overlays, risk register, audit log...")

    # Overlays
    async with AsyncSessionLocal() as db:
        r = await db.execute(text("SELECT COUNT(*) FROM management_overlays"))
        cnt = r.scalar()
        r.close()
        if cnt == 0:
            for ov in [
                dict(segment_id="SEG-01", loan_id=None, overlay_type="PD_CAP_FLOOR",
                     adjustment_factor=d("1.150000"), status="APPROVED",
                     submitted_by=analyst_id, approved_by=cro_id,
                     submitted_at=NOW - timedelta(days=28), approved_at=NOW - timedelta(days=25),
                     rationale="Large Corporate PD floor +15% after BB CAMELS review -- industrial sector stress.",
                     effective_from="202502", effective_to=None),
                dict(segment_id="SEG-08", loan_id=None, overlay_type="SECTOR",
                     adjustment_factor=d("1.200000"), status="APPROVED",
                     submitted_by=analyst_id, approved_by=cro_id,
                     submitted_at=NOW - timedelta(days=5), approved_at=NOW - timedelta(days=2),
                     rationale="Agriculture: boro season flood risk in Haor basin -- 20% ECL uplift Mar-Jun 2025.",
                     effective_from="202503", effective_to="202506"),
                dict(segment_id="SEG-03", loan_id=None, overlay_type="MACRO_MULTIPLIER_ADJ",
                     adjustment_factor=d("1.100000"), status="PENDING",
                     submitted_by=analyst_id, approved_by=None,
                     submitted_at=NOW - timedelta(hours=8), approved_at=None,
                     rationale="SME Manufacturing: supply chain disruption early warning. Pending CRO sign-off.",
                     effective_from="202503", effective_to=None),
                dict(segment_id="SEG-04", loan_id=None, overlay_type="LGD_HAIRCUT",
                     adjustment_factor=d("1.080000"), status="EXPIRED",
                     submitted_by=analyst_id, approved_by=cro_id,
                     submitted_at=NOW - timedelta(days=400), approved_at=NOW - timedelta(days=398),
                     rationale="SME Trading: collateral >18 months stale -- 8% LGD haircut pending revaluation.",
                     effective_from="202209", effective_to="202302"),
                dict(segment_id=None, loan_id="LN-LC-0018", overlay_type="STAGE",
                     adjustment_factor=d("1.000000"), status="EXPIRED",
                     submitted_by=cro_id, approved_by=admin_id,
                     submitted_at=NOW - timedelta(days=480), approved_at=NOW - timedelta(days=478),
                     rationale="LN-LC-0018 held at Stage 3 pending legal enforcement. DPD <90 due to moratorium.",
                     effective_from="202212", effective_to="202306"),
            ]:
                db.add(ManagementOverlay(
                    overlay_id=str(uuid.uuid4()),
                    loan_id=ov["loan_id"], segment_id=ov["segment_id"],
                    overlay_type=ov["overlay_type"],
                    adjustment_factor=ov["adjustment_factor"],
                    rationale=ov["rationale"],
                    effective_from=ov["effective_from"], effective_to=ov["effective_to"],
                    status=ov["status"],
                    submitted_by=ov["submitted_by"], approved_by=ov["approved_by"],
                    submitted_at=ov["submitted_at"], approved_at=ov["approved_at"],
                    created_by=analyst_id,
                ))
                await db.commit()
                await asyncio.sleep(0.1)

    # Risk register
    async with AsyncSessionLocal() as db:
        r2 = await db.execute(text("SELECT COUNT(*) FROM risk_register"))
        cnt2 = r2.scalar()
        r2.close()
        if cnt2 == 0:
            for risk in [
                ("PD Model Overfitting Risk",
                 "Corporate PD model v2.1 may be overfitted to pre-COVID data. Out-of-sample Gini 68.2% vs in-sample 71.4%.",
                 "MODEL", "HIGH",
                 "Annual out-of-sample backtesting Q2 2025. XGBoost v3 in validation -- PRODUCTION target June 2025.",
                 "OPEN", date(2025, 6, 30)),
                ("T24 DPD Data Lag",
                 "Temenos T24 DPD lags actual payment date 1-2 business days during month-end batch.",
                 "DATA", "MEDIUM",
                 "Daily reconciliation job; fallback to GL payment date if lag >3 days.",
                 "IN_PROGRESS", date(2025, 5, 15)),
                ("IFRS 9 vs BB Regulatory Provision Gap",
                 "ECL under IFRS 9 may fall below BB BRPD minimum -- especially for Stage 1 STD accounts.",
                 "REGULATORY", "HIGH",
                 "Monthly dual-run comparison. Escalation to CRO/Board Audit if shortfall >5%.",
                 "OPEN", date(2025, 7, 31)),
                ("Macro Scenario Weight Subjectivity",
                 "50/25/25 weights rely on management judgement -- no formal econometric model.",
                 "MODEL", "MEDIUM",
                 "CRO quarterly sign-off. Weight rationale in audit trail. External validator engaged.",
                 "OPEN", date(2025, 9, 30)),
                ("Annual Collateral Revaluation Frequency",
                 "Property collateral revalued annually -- stale valuations may overstate net collateral 10-15%.",
                 "DATA", "MEDIUM",
                 "8% interim haircut on collateral >18 months old (active overlay). Bi-annual revaluation under review.",
                 "IN_PROGRESS", date(2025, 8, 31)),
            ]:
                db.add(RiskRegister(
                    risk_title=risk[0], description=risk[1], category=risk[2],
                    rating=risk[3], mitigation=risk[4], status=risk[5],
                    target_date=risk[6], owner=cro_id, created_by=analyst_id,
                ))
                await db.commit()
                await asyncio.sleep(0.1)

    # Audit log (always add fresh entries)
    async with AsyncSessionLocal() as db:
        r3 = await db.execute(text("SELECT COUNT(*) FROM audit_log WHERE event_at > :t"),
                              {"t": NOW - timedelta(days=35)})
        cnt3 = r3.scalar()
        r3.close()
        if cnt3 < 10:
            for et, ety, eid, uid, days_ago, notes in [
                ("DATA_LOAD_COMPLETE",    "data_source",    "T24-CBS",        analyst_id, 30, "T24 CBS load: 9,842 loan records, 0 failed"),
                ("DATA_LOAD_COMPLETE",    "data_source",    "COLLATERAL-SYS", analyst_id, 29, "Collateral load: 4,201 records ingested"),
                ("DATA_LOAD_COMPLETE",    "data_source",    "MACRO-FILE",     analyst_id, 28, "BB macro indicators uploaded for 202503"),
                ("SCENARIO_APPROVE",      "macro_scenario", REPORTING_MONTH,  cro_id,      5, "BASE scenario approved for March 2025"),
                ("SCENARIO_APPROVE",      "macro_scenario", REPORTING_MONTH,  cro_id,      5, "OPTIMISTIC scenario approved -- weight 25%"),
                ("SCENARIO_APPROVE",      "macro_scenario", REPORTING_MONTH,  cro_id,      5, "PESSIMISTIC scenario approved -- weight 25%"),
                ("STAGING_RUN",           "staging",        REPORTING_MONTH,  analyst_id,  4, "Staging engine complete: 120 loans classified"),
                ("STAGE_OVERRIDE",        "staging_result", "LN-LC-0018",     analyst_id,  3, "Stage override submitted: Stage 2->3, legal enforcement"),
                ("OVERRIDE_APPROVE",      "staging_result", "LN-LC-0018",     cro_id,      3, "Stage override approved -- IFRS 9 para 5.5.3"),
                ("ECL_RUN_COMPLETE",      "provision_run",  REPORTING_MONTH,  analyst_id,  3, "ECL run complete for March 2025"),
                ("PROVISION_SUBMIT",      "provision_run",  REPORTING_MONTH,  analyst_id,  2, "Provision run submitted for CRO approval"),
                ("PROVISION_RUN_COMPLETE","provision_run",  REPORTING_MONTH,  cro_id,      1, "Provision run APPROVED by CRO"),
                ("OVERLAY_SUBMIT",        "management_overlay","SEG-08",       analyst_id,  5, "Agriculture sector overlay submitted"),
                ("OVERLAY_APPROVE",       "management_overlay","SEG-08",       cro_id,      2, "Agriculture overlay approved -- boro flood risk"),
                ("PARAMETER_UPDATE",      "lgd_parameter",  "SEG-01",         analyst_id, 10, "LGD OVER_SECURED updated 4%->5% for SEG-01"),
                ("MODEL_DEPLOY",          "ml_model",       "PD-CORP-V2",     admin_id,   15, "PD-CORP-V2 promoted to PRODUCTION"),
                ("REPORT_GENERATE",       "report",         "BB_REGULATORY",  analyst_id,  2, "BB regulatory provision schedule generated"),
                ("REPORT_GENERATE",       "report",         "IFRS7_DISCLOSURE",analyst_id, 2, "IFRS 7 disclosure tables generated"),
                ("REPORT_LOCK",           "report",         "ECL_SUMMARY",    cro_id,      1, "ECL Summary locked and submitted to CFO"),
                ("USER_LOGIN",            "user",           analyst_id,        analyst_id,  0, "Analyst login -- ECL run session"),
                ("USER_LOGIN",            "user",           cro_id,            cro_id,      0, "CRO login -- approval workflow"),
                ("DATA_QUALITY_RESOLVE",  "data_quality",  "LN-SM-0025",      analyst_id,  8, "DPD inconsistency resolved -- verified vs T24 ledger"),
                ("SICR_RULES_UPDATE",     "sicr_rules",    "SYSTEM",          cro_id,     20, "DPD Stage 2 threshold confirmed at 30 DPD"),
                ("GL_POST",               "gl_entry",       REPORTING_MONTH,  analyst_id,  1, "GL entries posted to FLEXCUBE for March 2025"),
                ("RISK_REGISTER_UPDATE",  "risk_register", "PD-OVERFIT",      analyst_id, 12, "XGBoost validation milestone added to risk register"),
            ]:
                await db.execute(
                    text("""INSERT INTO audit_log
                            (event_type,entity_type,entity_id,user_id,user_ip,
                             before_state,after_state,event_at,notes)
                            VALUES (:et,:ety,:eid,:uid,:ip,NULL,NULL,:eat,:notes)"""),
                    {"et": et, "ety": ety, "eid": str(eid), "uid": str(uid),
                     "ip": "10.10.1.42",
                     "eat": NOW - timedelta(days=days_ago, hours=2),
                     "notes": notes},
                )
                await db.commit()
                await asyncio.sleep(0.1)

    print(f"     -> overlays, risk register, audit log committed")


# ---------------------------------------------------------------------------
# Verification step
# ---------------------------------------------------------------------------

async def verify() -> None:
    print("\n  [Verification] Row counts per table:")
    tables = [
        "users", "segments", "loan_accounts", "collateral",
        "staging_results", "ecl_results",
        "macro_scenarios", "provision_runs", "provision_movement",
        "gl_entries", "management_overlays", "risk_register", "audit_log",
        "pd_parameters", "lgd_parameters",
    ]
    async with AsyncSessionLocal() as db:
        for tbl in tables:
            r = await db.execute(text(f"SELECT COUNT(*) FROM {tbl}"))
            cnt = r.scalar()
            r.close()
            status = "OK" if cnt > 0 else "FAIL EMPTY"
            print(f"    {tbl:<28} {cnt:>5}  {status}")


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

async def main() -> None:
    print("\n" + "=" * 60)
    print("  FinSight ECL -- Demo Data Seed")
    print("=" * 60)

    # Idempotency check
    async with AsyncSessionLocal() as db:
        r = await db.execute(
            text("SELECT COUNT(*) FROM loan_accounts WHERE reporting_month = :m"),
            {"m": REPORTING_MONTH},
        )
        cnt = r.scalar()
        r.close()
        if cnt > 0:
            print(f"  Demo data for {REPORTING_MONTH} already exists.")
            await verify()
            return

    try:
        # Phase 1 -- users, segments, parameters
        admin_id, cro_id, analyst_id = await phase1_users_and_segments()
        await asyncio.sleep(0.1)

        # Phase 2a -- loan_accounts only (must commit before child tables)
        print("  [Phase 2] Loan accounts + collateral + staging results...")
        await phase2a_loan_accounts(analyst_id)
        await asyncio.sleep(0.1)

        # Phase 2b -- collateral (FK -> loan_accounts, now committed)
        await phase2b_collateral(analyst_id)
        await asyncio.sleep(0.1)

        # Phase 2c -- staging_results (FK -> loan_accounts)
        await phase2c_staging(analyst_id)
        await asyncio.sleep(0.1)

        # Phase 3 -- ecl_results (FK to loan_accounts -- committed in phase 2)
        total_ecl = await phase3_ecl(analyst_id)
        await asyncio.sleep(0.1)

        # Phase 4 -- provision runs + movements + GL entries
        await phase4_provision(cro_id, analyst_id, total_ecl)
        await asyncio.sleep(0.1)

        # Phase 5 -- overlays + risk register + audit log
        await phase5_overlays_risks_audit(admin_id, cro_id, analyst_id)

    except Exception:
        print("\n  ERROR during seed -- full traceback:")
        traceback.print_exc()
        return

    # Summary
    print("\n" + "=" * 60)
    print(f"  Reporting Month  : {REPORTING_MONTH}")
    print(f"  Total Loans      : {len(ALL_LOANS)}")
    print(f"  Total ECL        : BDT {float(total_ecl):,.4f} Crore")

    print("\n  Login Credentials:")
    print("    admin@finsight.com        / Admin@123456  (SUPER_ADMIN)")
    print("    cro@finsight.com          / Demo@123456   (CRO)")
    print("    analyst@finsight.com      / Demo@123456   (ANALYST)")
    print("    viewer@finsight.com       / Demo@123456   (VIEWER)")
    print("    rahman.ahmed@finsight.com / Demo@123456   (ANALYST)")
    print("    fatema.begum@finsight.com / Demo@123456   (VIEWER)")

    await verify()
    print("=" * 60 + "\n")


if __name__ == "__main__":
    asyncio.run(main())
