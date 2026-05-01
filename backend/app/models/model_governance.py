import uuid
from decimal import Decimal
from datetime import datetime
from sqlalchemy import String, Numeric, DateTime, func, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class MLModel(Base):
    __tablename__ = "ml_models"

    model_id: Mapped[str] = mapped_column(String(20), primary_key=True)
    model_name: Mapped[str] = mapped_column(String(200), nullable=False)
    model_type: Mapped[str] = mapped_column(String(10), nullable=False)  # PD | LGD | EAD | MACRO
    method: Mapped[str | None] = mapped_column(String(100), nullable=True)
    version: Mapped[str] = mapped_column(String(20), nullable=False)
    gini_coefficient: Mapped[Decimal | None] = mapped_column(Numeric(5, 4), nullable=True)
    ks_statistic: Mapped[Decimal | None] = mapped_column(Numeric(5, 4), nullable=True)
    approved_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.user_id"), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="DEVELOPMENT")
    # DEVELOPMENT | VALIDATION | PRODUCTION | RETIRED
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    created_by: Mapped[str | None] = mapped_column(String(36), nullable=True)
