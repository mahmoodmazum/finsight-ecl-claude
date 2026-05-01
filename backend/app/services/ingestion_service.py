"""
Data ingestion service.
External connector calls (T24, Collateral DB, Rating API) are STUBBED.
They log realistic dummy data and return success until real credentials are configured.
"""
import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import update

from app.models.data_source import DataSource, DataLoadHistory

logger = logging.getLogger(__name__)


async def trigger_source_ingestion(
    source: DataSource,
    db: AsyncSession,
    triggered_by: str,
) -> int:
    """
    Create a load history record, run the stub connector, and update the record.
    Returns the load_id.
    """
    now = datetime.now(timezone.utc)

    # Create RUNNING history record
    history = DataLoadHistory(
        source_id=source.source_id,
        started_at=now,
        status="RUNNING",
        records_extracted=0,
        records_loaded=0,
        records_failed=0,
    )
    db.add(history)
    await db.flush()
    load_id = history.load_id

    try:
        records_loaded, records_failed = await _run_connector(source)

        # Update history record
        history.status = "COMPLETED"
        history.completed_at = datetime.now(timezone.utc)
        history.records_extracted = records_loaded + records_failed
        history.records_loaded = records_loaded
        history.records_failed = records_failed

        # Update data_sources last run info
        await db.execute(
            update(DataSource)
            .where(DataSource.source_id == source.source_id)
            .values(
                last_run_at=datetime.now(timezone.utc),
                last_run_status="SUCCESS",
                last_records_ingested=records_loaded,
                last_records_failed=records_failed,
            )
        )
        logger.info("Ingestion COMPLETED for source '%s': %d loaded, %d failed",
                    source.source_name, records_loaded, records_failed)

    except Exception as exc:
        history.status = "FAILED"
        history.completed_at = datetime.now(timezone.utc)
        history.error_summary = str(exc)[:4000]

        await db.execute(
            update(DataSource)
            .where(DataSource.source_id == source.source_id)
            .values(last_run_at=datetime.now(timezone.utc), last_run_status="FAILED")
        )
        logger.error("Ingestion FAILED for source '%s': %s", source.source_name, exc)

    return load_id


async def _run_connector(source: DataSource) -> tuple[int, int]:
    """
    Dispatch to the appropriate stub connector based on source_type.
    Returns (records_loaded, records_failed).
    """
    connector_map = {
        "CBS": _stub_cbs_connector,
        "COLLATERAL": _stub_collateral_connector,
        "RATINGS": _stub_ratings_connector,
        "MACRO": _stub_macro_connector,
    }
    fn = connector_map.get(source.source_type, _stub_unknown_connector)
    return await fn(source)


async def _stub_cbs_connector(source: DataSource) -> tuple[int, int]:
    """
    STUB: Simulates pulling loan data from Temenos T24 REST API.
    Real implementation would call T24_API_BASE_URL with T24_API_KEY.
    """
    logger.info("[STUB] CBS connector: simulating T24 loan pull for '%s'", source.source_name)
    # TODO: Replace with real T24 API call:
    # async with httpx.AsyncClient() as client:
    #     resp = await client.get(f"{settings.T24_API_BASE_URL}/loans", ...)
    return 1250, 3


async def _stub_collateral_connector(source: DataSource) -> tuple[int, int]:
    """
    STUB: Simulates refreshing collateral values from DB View.
    Real implementation would query COLLATERAL_DB_CONNECTION.
    """
    logger.info("[STUB] Collateral connector: simulating collateral refresh")
    return 980, 0


async def _stub_ratings_connector(source: DataSource) -> tuple[int, int]:
    """
    STUB: Simulates pulling CRR ratings from Internal Rating System.
    Real implementation would call RATING_API_BASE_URL.
    """
    logger.info("[STUB] Ratings connector: simulating CRR rating pull")
    return 650, 5


async def _stub_macro_connector(source: DataSource) -> tuple[int, int]:
    """
    STUB: Macro data is uploaded via file — this connector is a no-op.
    """
    logger.info("[STUB] Macro connector: no-op (data uploaded via CSV)")
    return 0, 0


async def _stub_unknown_connector(source: DataSource) -> tuple[int, int]:
    logger.warning("Unknown source_type '%s' for source '%s'", source.source_type, source.source_name)
    return 0, 0
