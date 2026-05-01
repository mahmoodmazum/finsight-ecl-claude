from pydantic import BaseModel
from datetime import datetime


class DataSourceOut(BaseModel):
    source_id: str
    source_name: str
    source_type: str
    integration_method: str
    schedule_cron: str | None
    last_run_at: datetime | None
    last_run_status: str | None
    last_records_ingested: int | None
    last_records_failed: int | None
    is_active: bool

    model_config = {"from_attributes": True}


class DataLoadHistoryOut(BaseModel):
    load_id: int
    source_id: str
    started_at: datetime
    completed_at: datetime | None
    status: str
    records_extracted: int | None
    records_loaded: int | None
    records_failed: int | None
    error_summary: str | None

    model_config = {"from_attributes": True}
