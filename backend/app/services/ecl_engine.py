"""
ECL Engine — IFRS 9 Section 5.5 full calculation orchestrator.

Runs as a background task triggered by POST /ecl/run.
Opens its own DB session and updates ProvisionRun.status throughout.

Calculation flow:
  1.  Load loan_accounts for the reporting month
  2.  Run staging engine  -> assign stages + write staging_results
  3.  Load PD parameters  -> compute weighted PD per segment
  4.  Load LGD parameters -> build per-segment LGD tier map
  5.  Load segments       -> CCF and unsecured LGD floor
  6.  Load macro scenarios -> multipliers per scenario
  7.  Load collateral     -> net collateral per loan
  8.  Load management overlays -> PD / LGD adjustment factors
  9.  Delete previous ECL results for this run
  10. Compute ECL per loan (EAD x PD x LGD x DF x macro_multiplier)
  11. Compute provision movement waterfall vs prior month
  12. Generate GL journal entries
  13. Write audit log entry
"""
import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.database import AsyncSessionLocal
from app.models.loan import LoanAccount, Collateral
from app.models.staging import StagingResult, PDParameter, LGDParameter
from app.models.macro import MacroScenario
from app.models.ecl import ECLResult
from app.models.provision import ProvisionRun, ProvisionMovement, GLEntry
from app.models.overlay import ManagementOverlay
from app.models.segment import Segment
from app.core.audit import write_audit_event
from app.services.staging_engine import run_staging
from app.services.lgd_engine import compute_lgd, compute_ead, compute_discount_factor
from app.services.macro_engine import compute_weighted_ecl


# Fallback EIR when loan record has none
DEFAULT_EIR = Decimal("0.0900")

# Remaining life used for Stage 2 PD lifetime calc when maturity date unknown
DEFAULT_REMAINING_LIFE_YEARS = Decimal("3.0")

# Time-to-default (years) for discount factor per stage
TTD_STAGE1 = Decimal("0.5")    # 6-month average on 12-month horizon
TTD_STAGE2 = Decimal("2.0")    # Midpoint of typical remaining life
TTD_STAGE3 = Decimal("0.25")   # Near-term (already in default)


class ECLEngine:
    """IFRS 9 ECL calculation engine."""

    async def run_full_ecl(self, run_id: str, month: str, initiated_by: str) -> None:
        """
        Background task entry point.  Opens its own DB session.
        Updates ProvisionRun.status: RUNNING -> DRAFT (success) or FAILED.
        """
        async with AsyncSessionLocal() as db:
            try:
                await self._set_status(db, run_id, "RUNNING")
                await db.commit()

                totals = await self._execute(db, run_id, month, initiated_by)
                await db.commit()

                await self._set_status(db, run_id, "DRAFT", totals=totals)
                await db.commit()

            except Exception:
                try:
                    await db.rollback()
                    async with AsyncSessionLocal() as err_db:
                        await self._set_status(err_db, run_id, "FAILED")
                        await err_db.commit()
                except Exception:
                    pass
                raise

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    async def _set_status(
        self,
        db: AsyncSession,
        run_id: str,
        status: str,
        totals: Optional[dict] = None,
    ) -> None:
        result = await db.execute(
            select(ProvisionRun).where(ProvisionRun.run_id == run_id)
        )
        run = result.scalar_one()
        run.status = status
        if totals:
            run.total_ecl = totals["total_ecl"]
            run.total_stage1_ecl = totals["total_stage1_ecl"]
            run.total_stage2_ecl = totals["total_stage2_ecl"]
            run.total_stage3_ecl = totals["total_stage3_ecl"]

    async def _execute(
        self, db: AsyncSession, run_id: str, month: str, initiated_by: str
    ) -> dict:
        # --- 1. Load loans -----------------------------------------------
        loan_result = await db.execute(
            select(LoanAccount).where(LoanAccount.reporting_month == month)
        )
        loans = loan_result.scalars().all()

        # --- 2. Staging engine -------------------------------------------
        staging_results = await run_staging(month, db, initiated_by, loans=loans)
        await db.flush()

        # Merge with any existing manual overrides (not deleted by staging engine)
        staging_map: dict[str, StagingResult] = {
            sr.loan_id: sr for sr in staging_results
        }
        override_result = await db.execute(
            select(StagingResult).where(
                StagingResult.reporting_month == month,
                StagingResult.override_flag == True,  # noqa: E712
            )
        )
        for sr in override_result.scalars():
            staging_map[sr.loan_id] = sr

        # --- 3. PD parameters -> weighted PD per segment -----------------
        pd_result = await db.execute(
            select(PDParameter).where(PDParameter.reporting_month == month)
        )
        segment_pd: dict[str, Decimal] = {}
        for p in pd_result.scalars():
            segment_pd[p.segment_id] = (
                segment_pd.get(p.segment_id, Decimal("0")) + p.weighted_pd
            )

        # --- 4. LGD parameters -------------------------------------------
        lgd_result = await db.execute(
            select(LGDParameter).where(
                LGDParameter.reporting_month == month,
                LGDParameter.is_active == True,  # noqa: E712
            )
        )
        lgd_map: dict[str, dict[str, Decimal]] = {}
        for lp in lgd_result.scalars():
            lgd_map.setdefault(lp.segment_id, {})[lp.security_tier] = lp.lgd_value

        # --- 5. Segments (CCF + unsecured LGD floor) ---------------------
        seg_result = await db.execute(
            select(Segment).where(Segment.is_active == True)  # noqa: E712
        )
        segments: dict[str, Segment] = {
            s.segment_id: s for s in seg_result.scalars().all()
        }

        # --- 6. Macro scenarios ------------------------------------------
        macro_result = await db.execute(
            select(MacroScenario).where(
                MacroScenario.reporting_month == month,
                MacroScenario.status == "APPROVED",
            )
        )
        scenarios = macro_result.scalars().all()
        scenario_map: dict[str, MacroScenario] = {
            s.scenario_name: s for s in scenarios
        }
        base = scenario_map.get("BASE")
        optimistic = scenario_map.get("OPTIMISTIC")
        pessimistic = scenario_map.get("PESSIMISTIC")

        # --- 7. Collateral (sum net_value per loan) ----------------------
        col_result = await db.execute(
            select(Collateral).where(Collateral.reporting_month == month)
        )
        collateral_map: dict[str, Decimal] = {}
        for c in col_result.scalars():
            collateral_map[c.loan_id] = (
                collateral_map.get(c.loan_id, Decimal("0")) + c.net_value
            )

        # --- 8. Active approved overlays ---------------------------------
        overlay_result = await db.execute(
            select(ManagementOverlay).where(
                ManagementOverlay.status == "APPROVED",
                ManagementOverlay.effective_from <= month,
            ).filter(
                (ManagementOverlay.effective_to == None)  # noqa: E711
                | (ManagementOverlay.effective_to >= month)
            )
        )
        loan_pd_adj: dict[str, Decimal] = {}
        seg_pd_adj: dict[str, Decimal] = {}
        loan_lgd_adj: dict[str, Decimal] = {}
        seg_lgd_adj: dict[str, Decimal] = {}
        for ov in overlay_result.scalars():
            if ov.overlay_type == "PD_CAP_FLOOR":
                if ov.loan_id:
                    loan_pd_adj[ov.loan_id] = ov.adjustment_factor
                elif ov.segment_id:
                    seg_pd_adj[ov.segment_id] = ov.adjustment_factor
            elif ov.overlay_type == "LGD_HAIRCUT":
                if ov.loan_id:
                    loan_lgd_adj[ov.loan_id] = ov.adjustment_factor
                elif ov.segment_id:
                    seg_lgd_adj[ov.segment_id] = ov.adjustment_factor

        # --- 9. Clear previous ECL results for this run ------------------
        await db.execute(
            delete(ECLResult).where(
                ECLResult.reporting_month == month,
                ECLResult.run_id == run_id,
            )
        )
        await db.flush()

        # --- 10. Compute ECL per loan ------------------------------------
        total_ecl = Decimal("0")
        total_s1 = Decimal("0")
        total_s2 = Decimal("0")
        total_s3 = Decimal("0")

        for loan in loans:
            sr = staging_map.get(loan.loan_id)
            if not sr:
                continue

            stage = sr.stage
            seg_id = loan.segment_id or "RETAIL"
            segment = segments.get(seg_id)
            ccf = segment.ccf if segment else Decimal("0.5")
            unsecured_lgd = (
                segment.unsecured_lgd_floor if segment else Decimal("0.45")
            )

            # EAD
            ead = compute_ead(loan.outstanding_balance, loan.undrawn_limit, ccf)

            # PD from cohort model (recency-weighted average)
            pd_12m = segment_pd.get(seg_id, Decimal("0.02"))

            # Apply PD overlay (multiplicative)
            pd_adj = loan_pd_adj.get(loan.loan_id) or seg_pd_adj.get(seg_id)
            if pd_adj:
                pd_12m = min(Decimal("1"), pd_12m * pd_adj)

            if stage == 3:
                pd_lifetime = Decimal("1.0")
                pd_used = Decimal("1.0")
            elif stage == 2:
                remaining_life = DEFAULT_REMAINING_LIFE_YEARS
                if loan.maturity_date and loan.origination_date:
                    total_life = (
                        (loan.maturity_date - loan.origination_date).days / 365.25
                    )
                    elapsed = (
                        (date.today() - loan.origination_date).days / 365.25
                    )
                    remaining_life = Decimal(str(round(max(0.5, total_life - elapsed), 4)))
                pd_lifetime = Decimal("1") - (Decimal("1") - pd_12m) ** remaining_life
                pd_used = pd_lifetime
            else:
                # Stage 1: 12-month ECL
                pd_lifetime = Decimal("1") - (Decimal("1") - pd_12m) ** Decimal("1")
                pd_used = pd_12m

            # LGD
            collateral_net = collateral_map.get(loan.loan_id, Decimal("0"))
            lgd = compute_lgd(loan.outstanding_balance, collateral_net, unsecured_lgd)

            lgd_adj = loan_lgd_adj.get(loan.loan_id) or seg_lgd_adj.get(seg_id)
            if lgd_adj:
                lgd = min(Decimal("1"), lgd * lgd_adj)

            # Discount factor
            eir = loan.effective_interest_rate or loan.interest_rate or DEFAULT_EIR
            ttd = {1: TTD_STAGE1, 2: TTD_STAGE2, 3: TTD_STAGE3}[stage]
            df = compute_discount_factor(eir, ttd)

            # ECL per macro scenario
            ecl_raw = ead * pd_used * lgd * df
            m_base = base.macro_multiplier if base else Decimal("1")
            m_opt = optimistic.macro_multiplier if optimistic else Decimal("1")
            m_pess = pessimistic.macro_multiplier if pessimistic else Decimal("1")

            ecl_base = ecl_raw * m_base
            ecl_opt = ecl_raw * m_opt
            ecl_pess = ecl_raw * m_pess

            ecl_weighted = (
                compute_weighted_ecl(
                    {"BASE": ecl_base, "OPTIMISTIC": ecl_opt, "PESSIMISTIC": ecl_pess},
                    scenarios,
                )
                if scenarios
                else ecl_base
            )

            pd_at_orig = segment_pd.get(seg_id)

            db.add(ECLResult(
                loan_id=loan.loan_id,
                reporting_month=month,
                stage=stage,
                ead=ead.quantize(Decimal("0.0001")),
                pd_12m=pd_12m.quantize(Decimal("0.000001")),
                pd_lifetime=pd_lifetime.quantize(Decimal("0.000001")),
                lgd=lgd.quantize(Decimal("0.0001")),
                eir=eir.quantize(Decimal("0.0001")),
                ecl_base=ecl_base.quantize(Decimal("0.0001")),
                ecl_optimistic=ecl_opt.quantize(Decimal("0.0001")),
                ecl_pessimistic=ecl_pess.quantize(Decimal("0.0001")),
                ecl_weighted=ecl_weighted.quantize(Decimal("0.0001")),
                pd_at_origination=(
                    pd_at_orig.quantize(Decimal("0.000001")) if pd_at_orig else None
                ),
                run_id=run_id,
                created_by=initiated_by,
            ))

            total_ecl += ecl_weighted
            if stage == 1:
                total_s1 += ecl_weighted
            elif stage == 2:
                total_s2 += ecl_weighted
            else:
                total_s3 += ecl_weighted

        await db.flush()

        # --- 11. Provision movement waterfall ----------------------------
        await self._provision_movement(
            db, run_id, month, total_ecl, len(loans), initiated_by
        )

        # --- 12. GL entries ----------------------------------------------
        await self._gl_entries(db, run_id, month, total_ecl, initiated_by)

        # --- 13. Audit log -----------------------------------------------
        await write_audit_event(
            db=db,
            event_type="ECL_RUN_COMPLETE",
            entity_type="provision_run",
            entity_id=run_id,
            user_id=initiated_by,
            after_state={
                "run_id": run_id,
                "month": month,
                "total_ecl": str(total_ecl.quantize(Decimal("0.0001"))),
                "loan_count": len(loans),
                "stage1_ecl": str(total_s1.quantize(Decimal("0.0001"))),
                "stage2_ecl": str(total_s2.quantize(Decimal("0.0001"))),
                "stage3_ecl": str(total_s3.quantize(Decimal("0.0001"))),
            },
            notes=f"Full ECL calculation completed for reporting month {month}",
        )

        return {
            "total_ecl": total_ecl.quantize(Decimal("0.0001")),
            "total_stage1_ecl": total_s1.quantize(Decimal("0.0001")),
            "total_stage2_ecl": total_s2.quantize(Decimal("0.0001")),
            "total_stage3_ecl": total_s3.quantize(Decimal("0.0001")),
        }

    # ------------------------------------------------------------------

    async def _prior_month_ecl(self, db: AsyncSession, month: str) -> Decimal:
        """Fetch total ECL from the most recent locked/approved run of prior month."""
        year, mon = int(month[:4]), int(month[4:])
        prior = f"{year - 1:04d}12" if mon == 1 else f"{year:04d}{mon - 1:02d}"

        result = await db.execute(
            select(ProvisionRun)
            .where(
                ProvisionRun.reporting_month == prior,
                ProvisionRun.status.in_(["LOCKED", "APPROVED"]),
            )
            .order_by(ProvisionRun.initiated_at.desc())
            .limit(1)
        )
        prior_run = result.scalar_one_or_none()
        return prior_run.total_ecl if prior_run else Decimal("0")

    async def _provision_movement(
        self,
        db: AsyncSession,
        run_id: str,
        month: str,
        total_ecl: Decimal,
        loan_count: int,
        created_by: str,
    ) -> None:
        opening = await self._prior_month_ecl(db, month)
        net_movement = total_ecl - opening

        for movement_type, amount, notes in [
            ("OTHER", opening, "Opening ECL balance (prior month locked/approved run)"),
            (
                "PARAMETER_CHANGE",
                net_movement,
                f"Net ECL movement for reporting month {month}",
            ),
        ]:
            db.add(ProvisionMovement(
                movement_id=str(uuid.uuid4()),
                run_id=run_id,
                movement_type=movement_type,
                amount=amount.quantize(Decimal("0.0001")),
                account_count=loan_count if movement_type != "OTHER" else 0,
                notes=notes,
                created_by=created_by,
            ))

    async def _gl_entries(
        self,
        db: AsyncSession,
        run_id: str,
        month: str,
        total_ecl: Decimal,
        created_by: str,
    ) -> None:
        opening = await self._prior_month_ecl(db, month)
        movement = total_ecl - opening

        if movement == Decimal("0"):
            return

        if movement > Decimal("0"):
            entry_type = "PROVISION_INCREASE"
            dr_account = "5001-ECL-CHARGE"
            cr_account = "2001-ECL-ALLOWANCE"
            description = f"ECL provision increase - {month}"
            amount = movement
        else:
            entry_type = "PROVISION_RELEASE"
            dr_account = "2001-ECL-ALLOWANCE"
            cr_account = "5001-ECL-CHARGE"
            description = f"ECL provision release - {month}"
            amount = abs(movement)

        db.add(GLEntry(
            entry_id=str(uuid.uuid4()),
            run_id=run_id,
            entry_date=date.today(),
            dr_account=dr_account,
            cr_account=cr_account,
            amount=amount.quantize(Decimal("0.0001")),
            currency="BDT",
            description=description,
            entry_type=entry_type,
            posted=False,
            created_by=created_by,
        ))
