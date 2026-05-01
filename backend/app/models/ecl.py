from decimal import Decimal
from datetime import datetime
from sqlalchemy import String, SmallInteger, Numeric, DateTime, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class ECLResult(Base):
    __tablename__ = "ecl_results"

    ecl_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    loan_id: Mapped[str] = mapped_column(String(20), ForeignKey("loan_accounts.loan_id"), nullable=False, index=True)
    reporting_month: Mapped[str] = mapped_column(String(6), nullable=False, index=True)
    stage: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    ead: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=Decimal("0"))
    pd_12m: Mapped[Decimal] = mapped_column(Numeric(8, 6), nullable=False, default=Decimal("0"))
    pd_lifetime: Mapped[Decimal] = mapped_column(Numeric(8, 6), nullable=False, default=Decimal("0"))
    lgd: Mapped[Decimal] = mapped_column(Numeric(5, 4), nullable=False, default=Decimal("0"))
    eir: Mapped[Decimal] = mapped_column(Numeric(6, 4), nullable=False, default=Decimal("0"))
    ecl_base: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=Decimal("0"))
    ecl_optimistic: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=Decimal("0"))
    ecl_pessimistic: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=Decimal("0"))
    ecl_weighted: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=Decimal("0"))
    pd_at_origination: Mapped[Decimal | None] = mapped_column(Numeric(8, 6), nullable=True)
    run_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("provision_runs.run_id"), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    created_by: Mapped[str | None] = mapped_column(String(36), nullable=True)
