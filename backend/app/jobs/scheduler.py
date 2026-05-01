import logging
from datetime import datetime, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from app.config import settings

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler(timezone=settings.SCHEDULER_TIMEZONE)


async def _run_scheduled_job(source_type: str, job_name: str) -> None:
    """Helper: find the active data source and trigger ingestion, with full audit."""
    from sqlalchemy import select
    from app.database import AsyncSessionLocal
    from app.models.data_source import DataSource
    from app.services.ingestion_service import trigger_source_ingestion
    from app.core.audit import write_audit_event

    async with AsyncSessionLocal() as db:
        try:
            result = await db.execute(
                select(DataSource).where(
                    DataSource.source_type == source_type,
                    DataSource.is_active == True,  # noqa: E712
                )
            )
            source = result.scalar_one_or_none()
            if not source:
                logger.warning("[%s] No active data source found for type '%s'", job_name, source_type)
                return

            load_id = await trigger_source_ingestion(source, db, triggered_by="SCHEDULER")

            await write_audit_event(
                db,
                event_type="DATA_LOAD_COMPLETE",
                entity_type="DataSource",
                entity_id=source.source_id,
                user_id="SCHEDULER",
                after_state={"job": job_name, "load_id": load_id, "source": source.source_name},
            )
            await db.commit()
            logger.info("[%s] Scheduled job completed, load_id=%s", job_name, load_id)

        except Exception as exc:
            logger.error("[%s] Scheduled job FAILED: %s", job_name, exc, exc_info=True)
            try:
                from app.core.audit import write_audit_event
                await write_audit_event(
                    db,
                    event_type="DATA_LOAD_FAILED",
                    entity_type="DataSource",
                    entity_id=source_type,
                    user_id="SCHEDULER",
                    after_state={"job": job_name, "error": str(exc)[:500]},
                )
                await db.commit()
            except Exception:
                pass


async def ingest_cbs_data() -> None:
    """Daily 02:00 BDT — Pull loan data from Temenos T24."""
    await _run_scheduled_job("CBS", "ingest_cbs_data")


async def ingest_collateral() -> None:
    """Daily 03:30 BDT — Refresh collateral values."""
    await _run_scheduled_job("COLLATERAL", "ingest_collateral")


async def ingest_ratings() -> None:
    """Daily 06:00 BDT — Pull CRR ratings."""
    await _run_scheduled_job("RATINGS", "ingest_ratings")


async def data_quality_scan() -> None:
    """Daily 07:00 BDT — Validate all records loaded today."""
    logger.info("[data_quality_scan] Scanning today's loads for quality issues (stub)")
    # TODO: Implement full DQ scan against loan_accounts for:
    # - DPD_INCONSISTENCY: dpd > 0 but cl_status = 'STD'
    # - NULL_FIELD: required fields null
    # - DATE_LOGIC: maturity_date < origination_date
    # - REF_INTEGRITY: segment_id not in segments table


async def monthly_ecl_run() -> None:
    """1st of month 08:00 BDT — Auto-trigger full ECL calculation for prior month."""
    from datetime import date
    from dateutil.relativedelta import relativedelta
    prior = date.today().replace(day=1) - relativedelta(months=1)
    reporting_month = prior.strftime("%Y%m")
    logger.info("[monthly_ecl_run] Auto ECL run triggered for month %s (stub)", reporting_month)
    # TODO: Wire to ECLEngine.run_full_ecl() in Phase 3


async def start_scheduler() -> None:
    scheduler.add_job(ingest_cbs_data, CronTrigger(hour=2, minute=0), id="ingest_cbs", replace_existing=True)
    scheduler.add_job(ingest_collateral, CronTrigger(hour=3, minute=30), id="ingest_collateral", replace_existing=True)
    scheduler.add_job(ingest_ratings, CronTrigger(hour=6, minute=0), id="ingest_ratings", replace_existing=True)
    scheduler.add_job(data_quality_scan, CronTrigger(hour=7, minute=0), id="data_quality", replace_existing=True)
    scheduler.add_job(monthly_ecl_run, CronTrigger(day=1, hour=8, minute=0), id="monthly_ecl", replace_existing=True)
    scheduler.start()
    logger.info("APScheduler started with %d jobs", len(scheduler.get_jobs()))


async def stop_scheduler() -> None:
    scheduler.shutdown(wait=False)
    logger.info("APScheduler stopped")
