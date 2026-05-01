import uuid
from decimal import Decimal
from datetime import date, datetime
from sqlalchemy import String, Numeric, DateTime, Date, Integer, Boolean, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class ProvisionRun(Base):
    __tablename__ = "provision_runs"

    run_id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    reporting_month: Mapped[str] = mapped_column(String(6), nullable=False, index=True)
    run_type: Mapped[str] = mapped_column(String(20), nullable=False)  # MONTH_END | INTRAMONTH | TEST
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="DRAFT")  # DRAFT | PENDING_APPROVAL | APPROVED | LOCKED
    total_ecl: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=Decimal("0"))
    total_stage1_ecl: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=Decimal("0"))
    total_stage2_ecl: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=Decimal("0"))
    total_stage3_ecl: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=Decimal("0"))
    initiated_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.user_id"), nullable=True)
    approved_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.user_id"), nullable=True)
    initiated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    locked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    created_by: Mapped[str | None] = mapped_column(String(36), nullable=True)


class ProvisionMovement(Base):
    __tablename__ = "provision_movement"

    movement_id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    run_id: Mapped[str] = mapped_column(String(36), ForeignKey("provision_runs.run_id"), nullable=False, index=True)
    movement_type: Mapped[str] = mapped_column(String(50), nullable=False)
    # NEW_ORIGINATION | STAGE_1_TO_2 | STAGE_2_TO_3 | CURE_2_TO_1 |
    # PARAMETER_CHANGE | MACRO_UPDATE | REPAYMENT | WRITE_OFF | FX | OTHER
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    account_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    created_by: Mapped[str | None] = mapped_column(String(36), nullable=True)


class GLEntry(Base):
    __tablename__ = "gl_entries"

    entry_id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    run_id: Mapped[str] = mapped_column(String(36), ForeignKey("provision_runs.run_id"), nullable=False, index=True)
    entry_date: Mapped[date] = mapped_column(Date, nullable=False)
    dr_account: Mapped[str] = mapped_column(String(50), nullable=False)
    cr_account: Mapped[str] = mapped_column(String(50), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="BDT")
    description: Mapped[str | None] = mapped_column(String(200), nullable=True)
    entry_type: Mapped[str] = mapped_column(String(30), nullable=False)  # PROVISION_INCREASE | PROVISION_RELEASE | WRITE_OFF
    posted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    posted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    created_by: Mapped[str | None] = mapped_column(String(36), nullable=True)
