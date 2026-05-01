from decimal import Decimal
from datetime import datetime
from sqlalchemy import String, Boolean, Numeric, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class Segment(Base):
    __tablename__ = "segments"

    segment_id: Mapped[str] = mapped_column(String(10), primary_key=True)
    segment_name: Mapped[str] = mapped_column(String(100), nullable=False)
    assessment_method: Mapped[str] = mapped_column(String(20), nullable=False)  # INDIVIDUAL | COLLECTIVE | POOL
    collateral_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    rating_band: Mapped[str | None] = mapped_column(String(50), nullable=True)
    unsecured_lgd_floor: Mapped[Decimal] = mapped_column(Numeric(5, 4), nullable=False, default=Decimal("0.4500"))
    ccf: Mapped[Decimal] = mapped_column(Numeric(5, 4), nullable=False, default=Decimal("0.5000"))
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    created_by: Mapped[str | None] = mapped_column(String(36), nullable=True)
