from decimal import Decimal
from datetime import date, datetime
from sqlalchemy import String, Boolean, Integer, Numeric, Date, DateTime, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class LoanAccount(Base):
    __tablename__ = "loan_accounts"

    loan_id: Mapped[str] = mapped_column(String(20), primary_key=True)
    customer_id: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    customer_name: Mapped[str] = mapped_column(String(200), nullable=False)
    segment_id: Mapped[str | None] = mapped_column(String(10), ForeignKey("segments.segment_id"), nullable=True, index=True)
    product_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    outstanding_balance: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=Decimal("0"))
    sanctioned_limit: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=Decimal("0"))
    undrawn_limit: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=Decimal("0"))
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="BDT")
    origination_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    maturity_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    interest_rate: Mapped[Decimal | None] = mapped_column(Numeric(6, 4), nullable=True)
    effective_interest_rate: Mapped[Decimal | None] = mapped_column(Numeric(6, 4), nullable=True)
    cl_status: Mapped[str | None] = mapped_column(String(10), nullable=True)  # STD | SMA | SS | DF | BL | UC
    dpd: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    crr_rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_watchlist: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_forbearance: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    reporting_month: Mapped[str] = mapped_column(String(6), nullable=False, index=True)
    data_source_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("data_sources.source_id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    created_by: Mapped[str | None] = mapped_column(String(36), nullable=True)


class Collateral(Base):
    __tablename__ = "collateral"

    collateral_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    loan_id: Mapped[str] = mapped_column(String(20), ForeignKey("loan_accounts.loan_id"), nullable=False, index=True)
    collateral_type: Mapped[str] = mapped_column(String(50), nullable=False)
    gross_value: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=Decimal("0"))
    haircut_pct: Mapped[Decimal] = mapped_column(Numeric(5, 4), nullable=False, default=Decimal("0"))
    net_value: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=Decimal("0"))
    valuation_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    reporting_month: Mapped[str] = mapped_column(String(6), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    created_by: Mapped[str | None] = mapped_column(String(36), nullable=True)
