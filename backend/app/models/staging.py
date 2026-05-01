from decimal import Decimal
from datetime import datetime
from sqlalchemy import String, Boolean, Integer, SmallInteger, Numeric, DateTime, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class StagingResult(Base):
    __tablename__ = "staging_results"

    staging_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    loan_id: Mapped[str] = mapped_column(String(20), ForeignKey("loan_accounts.loan_id"), nullable=False, index=True)
    reporting_month: Mapped[str] = mapped_column(String(6), nullable=False, index=True)
    stage: Mapped[int] = mapped_column(SmallInteger, nullable=False)  # 1, 2, 3
    ifrs_default_flag: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    sicr_flag: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    dpd_at_staging: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    cl_status_at_staging: Mapped[str | None] = mapped_column(String(10), nullable=True)
    crr_at_staging: Mapped[int | None] = mapped_column(Integer, nullable=True)
    override_flag: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    override_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
    override_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.user_id"), nullable=True)
    override_approved_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.user_id"), nullable=True)
    override_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    created_by: Mapped[str | None] = mapped_column(String(36), nullable=True)


class PDParameter(Base):
    __tablename__ = "pd_parameters"

    pd_param_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    segment_id: Mapped[str] = mapped_column(String(10), ForeignKey("segments.segment_id"), nullable=False, index=True)
    reporting_month: Mapped[str] = mapped_column(String(6), nullable=False, index=True)
    observation_no: Mapped[int] = mapped_column(SmallInteger, nullable=False)  # 1-4
    start_month: Mapped[str] = mapped_column(String(6), nullable=False)
    end_month: Mapped[str] = mapped_column(String(6), nullable=False)
    total_accounts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    default_accounts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    raw_pd: Mapped[Decimal] = mapped_column(Numeric(8, 6), nullable=False, default=Decimal("0"))
    observation_weight: Mapped[Decimal] = mapped_column(Numeric(5, 4), nullable=False, default=Decimal("0"))
    weighted_pd: Mapped[Decimal] = mapped_column(Numeric(8, 6), nullable=False, default=Decimal("0"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    created_by: Mapped[str | None] = mapped_column(String(36), nullable=True)


class TransitionMatrix(Base):
    __tablename__ = "transition_matrix"

    matrix_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    segment_id: Mapped[str] = mapped_column(String(10), ForeignKey("segments.segment_id"), nullable=False, index=True)
    reporting_month: Mapped[str] = mapped_column(String(6), nullable=False, index=True)
    from_state: Mapped[str] = mapped_column(String(5), nullable=False)
    to_state: Mapped[str] = mapped_column(String(5), nullable=False)
    count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    transition_probability: Mapped[Decimal] = mapped_column(Numeric(8, 6), nullable=False, default=Decimal("0"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    created_by: Mapped[str | None] = mapped_column(String(36), nullable=True)


class LGDParameter(Base):
    __tablename__ = "lgd_parameters"

    lgd_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    segment_id: Mapped[str] = mapped_column(String(10), ForeignKey("segments.segment_id"), nullable=False, index=True)
    reporting_month: Mapped[str] = mapped_column(String(6), nullable=False, index=True)
    security_tier: Mapped[str] = mapped_column(String(20), nullable=False)  # OVER_SECURED | PARTIAL | UNSECURED
    lgd_value: Mapped[Decimal] = mapped_column(Numeric(5, 4), nullable=False)
    haircut_pct: Mapped[Decimal] = mapped_column(Numeric(5, 4), nullable=False, default=Decimal("0"))
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    created_by: Mapped[str | None] = mapped_column(String(36), nullable=True)
