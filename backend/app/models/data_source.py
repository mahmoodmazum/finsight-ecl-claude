from datetime import datetime
from sqlalchemy import String, Boolean, Integer, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class DataSource(Base):
    __tablename__ = "data_sources"

    source_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    source_name: Mapped[str] = mapped_column(String(100), nullable=False)
    source_type: Mapped[str] = mapped_column(String(50), nullable=False)  # CBS | COLLATERAL | RATINGS | MACRO
    integration_method: Mapped[str] = mapped_column(String(50), nullable=False)  # REST_API | DB_VIEW | FILE_UPLOAD
    schedule_cron: Mapped[str | None] = mapped_column(String(50), nullable=True)
    last_run_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_run_status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    last_records_ingested: Mapped[int | None] = mapped_column(Integer, nullable=True)
    last_records_failed: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    created_by: Mapped[str | None] = mapped_column(String(36), nullable=True)


class DataLoadHistory(Base):
    __tablename__ = "data_load_history"

    load_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    source_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False)  # RUNNING | COMPLETED | FAILED
    records_extracted: Mapped[int | None] = mapped_column(Integer, nullable=True)
    records_loaded: Mapped[int | None] = mapped_column(Integer, nullable=True)
    records_failed: Mapped[int | None] = mapped_column(Integer, nullable=True)
    error_summary: Mapped[str | None] = mapped_column(String(4000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class DataQualityIssue(Base):
    __tablename__ = "data_quality_issues"

    issue_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    load_id: Mapped[int] = mapped_column(nullable=False, index=True)
    loan_id: Mapped[str | None] = mapped_column(String(20), nullable=True)
    field_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    error_type: Mapped[str] = mapped_column(String(50), nullable=False)  # DPD_INCONSISTENCY | NULL_FIELD | DATE_LOGIC | REF_INTEGRITY
    error_detail: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_quarantined: Mapped[bool] = mapped_column(nullable=False, default=False)
    resolved: Mapped[bool] = mapped_column(nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
