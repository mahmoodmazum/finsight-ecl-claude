"""add staging_runs table

Revision ID: 0002
Revises: 0001
Create Date: 2026-05-13
"""
from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "staging_runs",
        sa.Column("run_id", sa.String(36), primary_key=True),
        sa.Column("reporting_month", sa.String(6), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="PENDING"),
        sa.Column("accounts_staged", sa.Integer(), nullable=True),
        sa.Column("stage1_count", sa.Integer(), nullable=True),
        sa.Column("stage2_count", sa.Integer(), nullable=True),
        sa.Column("stage3_count", sa.Integer(), nullable=True),
        sa.Column("initiated_by", sa.String(36), nullable=False),
        sa.Column("initiated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error_message", sa.String(500), nullable=True),
    )
    op.create_index("ix_staging_runs_reporting_month", "staging_runs", ["reporting_month"])
    op.create_index("ix_staging_runs_status", "staging_runs", ["status"])


def downgrade() -> None:
    op.drop_table("staging_runs")
