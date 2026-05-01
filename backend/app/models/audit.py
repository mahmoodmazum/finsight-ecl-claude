import uuid
from datetime import date, datetime
from sqlalchemy import String, DateTime, Date, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class RiskRegister(Base):
    __tablename__ = "risk_register"

    risk_id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    risk_title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False)  # MODEL | DATA | OPERATIONAL | REGULATORY
    rating: Mapped[str] = mapped_column(String(10), nullable=False)  # HIGH | MEDIUM | LOW
    mitigation: Mapped[str | None] = mapped_column(String(500), nullable=True)
    owner: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.user_id"), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="OPEN")  # OPEN | MITIGATED | CLOSED
    target_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    created_by: Mapped[str | None] = mapped_column(String(36), nullable=True)
