import uuid
from decimal import Decimal
from datetime import datetime
from sqlalchemy import String, Numeric, DateTime, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class ManagementOverlay(Base):
    __tablename__ = "management_overlays"

    overlay_id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    loan_id: Mapped[str | None] = mapped_column(String(20), ForeignKey("loan_accounts.loan_id"), nullable=True, index=True)
    segment_id: Mapped[str | None] = mapped_column(String(10), ForeignKey("segments.segment_id"), nullable=True, index=True)
    overlay_type: Mapped[str] = mapped_column(String(50), nullable=False)
    # CURE_RATE | SEGMENT_FACTOR | RATING | STAGE | PD_CAP_FLOOR |
    # LGD_HAIRCUT | SCENARIO_WEIGHT | SECTOR | PORTFOLIO
    adjustment_factor: Mapped[Decimal] = mapped_column(Numeric(8, 6), nullable=False)
    rationale: Mapped[str] = mapped_column(String(1000), nullable=False)
    effective_from: Mapped[str] = mapped_column(String(6), nullable=False)
    effective_to: Mapped[str | None] = mapped_column(String(6), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="PENDING")  # PENDING | APPROVED | REJECTED | EXPIRED
    submitted_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.user_id"), nullable=True)
    approved_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.user_id"), nullable=True)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    created_by: Mapped[str | None] = mapped_column(String(36), nullable=True)
