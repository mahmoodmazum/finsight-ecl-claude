"""create all remaining domain tables

Revision ID: 0002
Revises: 0001
Create Date: 2026-04-29
"""
from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # -------------------------------------------------------------------------
    # segments — no FK deps
    # -------------------------------------------------------------------------
    op.create_table(
        "segments",
        sa.Column("segment_id", sa.String(10), primary_key=True),
        sa.Column("segment_name", sa.String(100), nullable=False),
        sa.Column("assessment_method", sa.String(20), nullable=False),
        sa.Column("collateral_type", sa.String(100), nullable=True),
        sa.Column("rating_band", sa.String(50), nullable=True),
        sa.Column("unsecured_lgd_floor", sa.Numeric(5, 4), nullable=False, server_default="0.4500"),
        sa.Column("ccf", sa.Numeric(5, 4), nullable=False, server_default="0.5000"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", sa.String(36), nullable=True),
    )

    # -------------------------------------------------------------------------
    # data_sources — no FK deps
    # -------------------------------------------------------------------------
    op.create_table(
        "data_sources",
        sa.Column("source_id", sa.String(36), primary_key=True),
        sa.Column("source_name", sa.String(100), nullable=False),
        sa.Column("source_type", sa.String(50), nullable=False),
        sa.Column("integration_method", sa.String(50), nullable=False),
        sa.Column("schedule_cron", sa.String(50), nullable=True),
        sa.Column("last_run_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_run_status", sa.String(20), nullable=True),
        sa.Column("last_records_ingested", sa.Integer(), nullable=True),
        sa.Column("last_records_failed", sa.Integer(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", sa.String(36), nullable=True),
    )

    # -------------------------------------------------------------------------
    # loan_accounts — depends on segments, data_sources
    # -------------------------------------------------------------------------
    op.create_table(
        "loan_accounts",
        sa.Column("loan_id", sa.String(20), primary_key=True),
        sa.Column("customer_id", sa.String(20), nullable=False),
        sa.Column("customer_name", sa.String(200), nullable=False),
        sa.Column("segment_id", sa.String(10), sa.ForeignKey("segments.segment_id"), nullable=True),
        sa.Column("product_code", sa.String(20), nullable=True),
        sa.Column("outstanding_balance", sa.Numeric(18, 4), nullable=False, server_default="0"),
        sa.Column("sanctioned_limit", sa.Numeric(18, 4), nullable=False, server_default="0"),
        sa.Column("undrawn_limit", sa.Numeric(18, 4), nullable=False, server_default="0"),
        sa.Column("currency", sa.String(3), nullable=False, server_default="BDT"),
        sa.Column("origination_date", sa.Date(), nullable=True),
        sa.Column("maturity_date", sa.Date(), nullable=True),
        sa.Column("interest_rate", sa.Numeric(6, 4), nullable=True),
        sa.Column("effective_interest_rate", sa.Numeric(6, 4), nullable=True),
        sa.Column("cl_status", sa.String(10), nullable=True),
        sa.Column("dpd", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("crr_rating", sa.Integer(), nullable=True),
        sa.Column("is_watchlist", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("is_forbearance", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("reporting_month", sa.String(6), nullable=False),
        sa.Column("data_source_id", sa.String(36), sa.ForeignKey("data_sources.source_id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", sa.String(36), nullable=True),
    )
    op.create_index("ix_loan_accounts_customer_id", "loan_accounts", ["customer_id"])
    op.create_index("ix_loan_accounts_segment_id", "loan_accounts", ["segment_id"])
    op.create_index("ix_loan_accounts_reporting_month", "loan_accounts", ["reporting_month"])

    # -------------------------------------------------------------------------
    # collateral — depends on loan_accounts
    # -------------------------------------------------------------------------
    op.create_table(
        "collateral",
        sa.Column("collateral_id", sa.String(36), primary_key=True),
        sa.Column("loan_id", sa.String(20), sa.ForeignKey("loan_accounts.loan_id"), nullable=False),
        sa.Column("collateral_type", sa.String(50), nullable=False),
        sa.Column("gross_value", sa.Numeric(18, 4), nullable=False, server_default="0"),
        sa.Column("haircut_pct", sa.Numeric(5, 4), nullable=False, server_default="0"),
        sa.Column("net_value", sa.Numeric(18, 4), nullable=False, server_default="0"),
        sa.Column("valuation_date", sa.Date(), nullable=True),
        sa.Column("reporting_month", sa.String(6), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", sa.String(36), nullable=True),
    )
    op.create_index("ix_collateral_loan_id", "collateral", ["loan_id"])
    op.create_index("ix_collateral_reporting_month", "collateral", ["reporting_month"])

    # -------------------------------------------------------------------------
    # staging_results — depends on loan_accounts, users
    # -------------------------------------------------------------------------
    op.create_table(
        "staging_results",
        sa.Column("staging_id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("loan_id", sa.String(20), sa.ForeignKey("loan_accounts.loan_id"), nullable=False),
        sa.Column("reporting_month", sa.String(6), nullable=False),
        sa.Column("stage", sa.SmallInteger(), nullable=False),
        sa.Column("ifrs_default_flag", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("sicr_flag", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("dpd_at_staging", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("cl_status_at_staging", sa.String(10), nullable=True),
        sa.Column("crr_at_staging", sa.Integer(), nullable=True),
        sa.Column("override_flag", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("override_reason", sa.String(500), nullable=True),
        sa.Column("override_by", sa.String(36), sa.ForeignKey("users.user_id"), nullable=True),
        sa.Column("override_approved_by", sa.String(36), sa.ForeignKey("users.user_id"), nullable=True),
        sa.Column("override_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", sa.String(36), nullable=True),
    )
    op.create_index("ix_staging_results_loan_id", "staging_results", ["loan_id"])
    op.create_index("ix_staging_results_reporting_month", "staging_results", ["reporting_month"])

    # -------------------------------------------------------------------------
    # pd_parameters — depends on segments
    # -------------------------------------------------------------------------
    op.create_table(
        "pd_parameters",
        sa.Column("pd_param_id", sa.String(36), primary_key=True),
        sa.Column("segment_id", sa.String(10), sa.ForeignKey("segments.segment_id"), nullable=False),
        sa.Column("reporting_month", sa.String(6), nullable=False),
        sa.Column("observation_no", sa.SmallInteger(), nullable=False),
        sa.Column("start_month", sa.String(6), nullable=False),
        sa.Column("end_month", sa.String(6), nullable=False),
        sa.Column("total_accounts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("default_accounts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("raw_pd", sa.Numeric(8, 6), nullable=False, server_default="0"),
        sa.Column("observation_weight", sa.Numeric(5, 4), nullable=False, server_default="0"),
        sa.Column("weighted_pd", sa.Numeric(8, 6), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", sa.String(36), nullable=True),
    )
    op.create_index("ix_pd_parameters_segment_id", "pd_parameters", ["segment_id"])
    op.create_index("ix_pd_parameters_reporting_month", "pd_parameters", ["reporting_month"])

    # -------------------------------------------------------------------------
    # transition_matrix — depends on segments
    # -------------------------------------------------------------------------
    op.create_table(
        "transition_matrix",
        sa.Column("matrix_id", sa.String(36), primary_key=True),
        sa.Column("segment_id", sa.String(10), sa.ForeignKey("segments.segment_id"), nullable=False),
        sa.Column("reporting_month", sa.String(6), nullable=False),
        sa.Column("from_state", sa.String(5), nullable=False),
        sa.Column("to_state", sa.String(5), nullable=False),
        sa.Column("count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("transition_probability", sa.Numeric(8, 6), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", sa.String(36), nullable=True),
    )
    op.create_index("ix_transition_matrix_segment_id", "transition_matrix", ["segment_id"])

    # -------------------------------------------------------------------------
    # lgd_parameters — depends on segments
    # -------------------------------------------------------------------------
    op.create_table(
        "lgd_parameters",
        sa.Column("lgd_id", sa.String(36), primary_key=True),
        sa.Column("segment_id", sa.String(10), sa.ForeignKey("segments.segment_id"), nullable=False),
        sa.Column("reporting_month", sa.String(6), nullable=False),
        sa.Column("security_tier", sa.String(20), nullable=False),
        sa.Column("lgd_value", sa.Numeric(5, 4), nullable=False),
        sa.Column("haircut_pct", sa.Numeric(5, 4), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", sa.String(36), nullable=True),
    )
    op.create_index("ix_lgd_parameters_segment_id", "lgd_parameters", ["segment_id"])

    # -------------------------------------------------------------------------
    # macro_scenarios — depends on users
    # -------------------------------------------------------------------------
    op.create_table(
        "macro_scenarios",
        sa.Column("scenario_id", sa.String(36), primary_key=True),
        sa.Column("reporting_month", sa.String(6), nullable=False),
        sa.Column("scenario_name", sa.String(20), nullable=False),
        sa.Column("weight", sa.Numeric(5, 4), nullable=False),
        sa.Column("gdp_growth", sa.Numeric(6, 4), nullable=True),
        sa.Column("cpi_inflation", sa.Numeric(6, 4), nullable=True),
        sa.Column("bdt_usd_rate", sa.Numeric(8, 4), nullable=True),
        sa.Column("bb_repo_rate", sa.Numeric(6, 4), nullable=True),
        sa.Column("npl_ratio", sa.Numeric(6, 4), nullable=True),
        sa.Column("remittance_growth", sa.Numeric(6, 4), nullable=True),
        sa.Column("export_growth", sa.Numeric(6, 4), nullable=True),
        sa.Column("macro_multiplier", sa.Numeric(8, 6), nullable=False, server_default="1.000000"),
        sa.Column("approved_by", sa.String(36), sa.ForeignKey("users.user_id"), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="DRAFT"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", sa.String(36), nullable=True),
    )
    op.create_index("ix_macro_scenarios_reporting_month", "macro_scenarios", ["reporting_month"])

    # -------------------------------------------------------------------------
    # provision_runs — depends on users
    # -------------------------------------------------------------------------
    op.create_table(
        "provision_runs",
        sa.Column("run_id", sa.String(36), primary_key=True),
        sa.Column("reporting_month", sa.String(6), nullable=False),
        sa.Column("run_type", sa.String(20), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="DRAFT"),
        sa.Column("total_ecl", sa.Numeric(18, 4), nullable=False, server_default="0"),
        sa.Column("total_stage1_ecl", sa.Numeric(18, 4), nullable=False, server_default="0"),
        sa.Column("total_stage2_ecl", sa.Numeric(18, 4), nullable=False, server_default="0"),
        sa.Column("total_stage3_ecl", sa.Numeric(18, 4), nullable=False, server_default="0"),
        sa.Column("initiated_by", sa.String(36), sa.ForeignKey("users.user_id"), nullable=True),
        sa.Column("approved_by", sa.String(36), sa.ForeignKey("users.user_id"), nullable=True),
        sa.Column("initiated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("locked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", sa.String(36), nullable=True),
    )
    op.create_index("ix_provision_runs_reporting_month", "provision_runs", ["reporting_month"])

    # Trigger: locked provision runs cannot be updated
    op.execute("""
        CREATE TRIGGER trg_provision_runs_no_update_locked
        ON provision_runs
        AFTER UPDATE
        AS
        BEGIN
            IF EXISTS (
                SELECT 1 FROM deleted d
                WHERE d.status = 'LOCKED'
                AND (
                    d.total_ecl != (SELECT total_ecl FROM inserted WHERE run_id = d.run_id)
                    OR d.status != (SELECT status FROM inserted WHERE run_id = d.run_id)
                )
            )
            BEGIN
                RAISERROR('Locked provision runs cannot be modified.', 16, 1)
                ROLLBACK TRANSACTION
            END
        END
    """)

    # -------------------------------------------------------------------------
    # ecl_results — depends on loan_accounts, provision_runs
    # -------------------------------------------------------------------------
    op.create_table(
        "ecl_results",
        sa.Column("ecl_id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("loan_id", sa.String(20), sa.ForeignKey("loan_accounts.loan_id"), nullable=False),
        sa.Column("reporting_month", sa.String(6), nullable=False),
        sa.Column("stage", sa.SmallInteger(), nullable=False),
        sa.Column("ead", sa.Numeric(18, 4), nullable=False, server_default="0"),
        sa.Column("pd_12m", sa.Numeric(8, 6), nullable=False, server_default="0"),
        sa.Column("pd_lifetime", sa.Numeric(8, 6), nullable=False, server_default="0"),
        sa.Column("lgd", sa.Numeric(5, 4), nullable=False, server_default="0"),
        sa.Column("eir", sa.Numeric(6, 4), nullable=False, server_default="0"),
        sa.Column("ecl_base", sa.Numeric(18, 4), nullable=False, server_default="0"),
        sa.Column("ecl_optimistic", sa.Numeric(18, 4), nullable=False, server_default="0"),
        sa.Column("ecl_pessimistic", sa.Numeric(18, 4), nullable=False, server_default="0"),
        sa.Column("ecl_weighted", sa.Numeric(18, 4), nullable=False, server_default="0"),
        sa.Column("pd_at_origination", sa.Numeric(8, 6), nullable=True),
        sa.Column("run_id", sa.String(36), sa.ForeignKey("provision_runs.run_id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", sa.String(36), nullable=True),
    )
    op.create_index("ix_ecl_results_loan_id", "ecl_results", ["loan_id"])
    op.create_index("ix_ecl_results_reporting_month", "ecl_results", ["reporting_month"])
    op.create_index("ix_ecl_results_run_id", "ecl_results", ["run_id"])

    # -------------------------------------------------------------------------
    # provision_movement — depends on provision_runs
    # -------------------------------------------------------------------------
    op.create_table(
        "provision_movement",
        sa.Column("movement_id", sa.String(36), primary_key=True),
        sa.Column("run_id", sa.String(36), sa.ForeignKey("provision_runs.run_id"), nullable=False),
        sa.Column("movement_type", sa.String(50), nullable=False),
        sa.Column("amount", sa.Numeric(18, 4), nullable=False),
        sa.Column("account_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("notes", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", sa.String(36), nullable=True),
    )
    op.create_index("ix_provision_movement_run_id", "provision_movement", ["run_id"])

    # -------------------------------------------------------------------------
    # gl_entries — depends on provision_runs
    # -------------------------------------------------------------------------
    op.create_table(
        "gl_entries",
        sa.Column("entry_id", sa.String(36), primary_key=True),
        sa.Column("run_id", sa.String(36), sa.ForeignKey("provision_runs.run_id"), nullable=False),
        sa.Column("entry_date", sa.Date(), nullable=False),
        sa.Column("dr_account", sa.String(50), nullable=False),
        sa.Column("cr_account", sa.String(50), nullable=False),
        sa.Column("amount", sa.Numeric(18, 4), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default="BDT"),
        sa.Column("description", sa.String(200), nullable=True),
        sa.Column("entry_type", sa.String(30), nullable=False),
        sa.Column("posted", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("posted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", sa.String(36), nullable=True),
    )
    op.create_index("ix_gl_entries_run_id", "gl_entries", ["run_id"])

    # -------------------------------------------------------------------------
    # management_overlays — depends on loan_accounts, segments, users
    # -------------------------------------------------------------------------
    op.create_table(
        "management_overlays",
        sa.Column("overlay_id", sa.String(36), primary_key=True),
        sa.Column("loan_id", sa.String(20), sa.ForeignKey("loan_accounts.loan_id"), nullable=True),
        sa.Column("segment_id", sa.String(10), sa.ForeignKey("segments.segment_id"), nullable=True),
        sa.Column("overlay_type", sa.String(50), nullable=False),
        sa.Column("adjustment_factor", sa.Numeric(8, 6), nullable=False),
        sa.Column("rationale", sa.String(1000), nullable=False),
        sa.Column("effective_from", sa.String(6), nullable=False),
        sa.Column("effective_to", sa.String(6), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="PENDING"),
        sa.Column("submitted_by", sa.String(36), sa.ForeignKey("users.user_id"), nullable=True),
        sa.Column("approved_by", sa.String(36), sa.ForeignKey("users.user_id"), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", sa.String(36), nullable=True),
    )
    op.create_index("ix_management_overlays_loan_id", "management_overlays", ["loan_id"])
    op.create_index("ix_management_overlays_segment_id", "management_overlays", ["segment_id"])
    op.create_index("ix_management_overlays_status", "management_overlays", ["status"])

    # -------------------------------------------------------------------------
    # data_load_history — depends on data_sources
    # -------------------------------------------------------------------------
    op.create_table(
        "data_load_history",
        sa.Column("load_id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("source_id", sa.String(36), sa.ForeignKey("data_sources.source_id"), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("records_extracted", sa.Integer(), nullable=True),
        sa.Column("records_loaded", sa.Integer(), nullable=True),
        sa.Column("records_failed", sa.Integer(), nullable=True),
        sa.Column("error_summary", sa.String(4000), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_data_load_history_source_id", "data_load_history", ["source_id"])

    # -------------------------------------------------------------------------
    # data_quality_issues — depends on data_load_history
    # -------------------------------------------------------------------------
    op.create_table(
        "data_quality_issues",
        sa.Column("issue_id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("load_id", sa.BigInteger(), sa.ForeignKey("data_load_history.load_id"), nullable=False),
        sa.Column("loan_id", sa.String(20), nullable=True),
        sa.Column("field_name", sa.String(100), nullable=True),
        sa.Column("error_type", sa.String(50), nullable=False),
        sa.Column("error_detail", sa.String(500), nullable=True),
        sa.Column("is_quarantined", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("resolved", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_data_quality_issues_load_id", "data_quality_issues", ["load_id"])

    # -------------------------------------------------------------------------
    # ml_models — depends on users
    # -------------------------------------------------------------------------
    op.create_table(
        "ml_models",
        sa.Column("model_id", sa.String(20), primary_key=True),
        sa.Column("model_name", sa.String(200), nullable=False),
        sa.Column("model_type", sa.String(10), nullable=False),
        sa.Column("method", sa.String(100), nullable=True),
        sa.Column("version", sa.String(20), nullable=False),
        sa.Column("gini_coefficient", sa.Numeric(5, 4), nullable=True),
        sa.Column("ks_statistic", sa.Numeric(5, 4), nullable=True),
        sa.Column("approved_by", sa.String(36), sa.ForeignKey("users.user_id"), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="DEVELOPMENT"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", sa.String(36), nullable=True),
    )

    # -------------------------------------------------------------------------
    # risk_register — depends on users
    # -------------------------------------------------------------------------
    op.create_table(
        "risk_register",
        sa.Column("risk_id", sa.String(36), primary_key=True),
        sa.Column("risk_title", sa.String(200), nullable=False),
        sa.Column("description", sa.String(1000), nullable=True),
        sa.Column("category", sa.String(50), nullable=False),
        sa.Column("rating", sa.String(10), nullable=False),
        sa.Column("mitigation", sa.String(500), nullable=True),
        sa.Column("owner", sa.String(36), sa.ForeignKey("users.user_id"), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="OPEN"),
        sa.Column("target_date", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", sa.String(36), nullable=True),
    )


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_provision_runs_no_update_locked")
    for table in [
        "risk_register", "ml_models", "data_quality_issues", "data_load_history",
        "management_overlays", "gl_entries", "provision_movement", "ecl_results",
        "provision_runs", "macro_scenarios", "lgd_parameters", "transition_matrix",
        "pd_parameters", "staging_results", "collateral", "loan_accounts",
        "data_sources", "segments",
    ]:
        op.drop_table(table)
