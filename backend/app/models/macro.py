from decimal import Decimal
from datetime import datetime
from sqlalchemy import String, Numeric, DateTime, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class MacroScenario(Base):
    __tablename__ = "macro_scenarios"

    scenario_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    reporting_month: Mapped[str] = mapped_column(String(6), nullable=False, index=True)
    scenario_name: Mapped[str] = mapped_column(String(20), nullable=False)  # BASE | OPTIMISTIC | PESSIMISTIC
    weight: Mapped[Decimal] = mapped_column(Numeric(5, 4), nullable=False)
    gdp_growth: Mapped[Decimal | None] = mapped_column(Numeric(6, 4), nullable=True)
    cpi_inflation: Mapped[Decimal | None] = mapped_column(Numeric(6, 4), nullable=True)
    bdt_usd_rate: Mapped[Decimal | None] = mapped_column(Numeric(8, 4), nullable=True)
    bb_repo_rate: Mapped[Decimal | None] = mapped_column(Numeric(6, 4), nullable=True)
    npl_ratio: Mapped[Decimal | None] = mapped_column(Numeric(6, 4), nullable=True)
    remittance_growth: Mapped[Decimal | None] = mapped_column(Numeric(6, 4), nullable=True)
    export_growth: Mapped[Decimal | None] = mapped_column(Numeric(6, 4), nullable=True)
    macro_multiplier: Mapped[Decimal] = mapped_column(Numeric(8, 6), nullable=False, default=Decimal("1.000000"))
    approved_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.user_id"), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="DRAFT")  # DRAFT | APPROVED
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    created_by: Mapped[str | None] = mapped_column(String(36), nullable=True)
