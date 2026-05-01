"""Add performance indexes on FK columns and frequently filtered columns.

Revision ID: 0005
Revises: 0004
Create Date: 2026-04-30
"""
from alembic import op

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # loan_accounts (reporting_month and segment_id already indexed in 0002)
    op.create_index("ix_loan_accounts_cl_status", "loan_accounts", ["cl_status"])
    op.create_index("ix_loan_accounts_dpd", "loan_accounts", ["dpd"])

    # staging_results (loan_id and reporting_month already indexed in 0002)
    op.create_index("ix_staging_results_reporting_month_stage", "staging_results", ["reporting_month", "stage"])
    op.create_index("ix_staging_results_override_flag", "staging_results", ["override_flag"])

    # ecl_results
    op.create_index("ix_ecl_results_reporting_month_stage", "ecl_results", ["reporting_month", "stage"])
    op.create_index("ix_ecl_results_run_id_month", "ecl_results", ["run_id", "reporting_month"])

    # provision_runs
    op.create_index("ix_provision_runs_reporting_month_status", "provision_runs", ["reporting_month", "status"])
    op.create_index("ix_provision_runs_initiated_at", "provision_runs", ["initiated_at"])

    # gl_entries
    op.create_index("ix_gl_entries_run_id", "gl_entries", ["run_id"])
    op.create_index("ix_gl_entries_entry_date", "gl_entries", ["entry_date"])
    op.create_index("ix_gl_entries_posted", "gl_entries", ["posted"])

    # macro_scenarios
    op.create_index("ix_macro_scenarios_reporting_month_status", "macro_scenarios", ["reporting_month", "status"])

    # management_overlays
    op.create_index("ix_management_overlays_status", "management_overlays", ["status"])
    op.create_index("ix_management_overlays_effective_from", "management_overlays", ["effective_from"])
    op.create_index("ix_management_overlays_loan_id", "management_overlays", ["loan_id"])
    op.create_index("ix_management_overlays_segment_id", "management_overlays", ["segment_id"])

    # audit_log
    op.create_index("ix_audit_log_event_at", "audit_log", ["event_at"])
    op.create_index("ix_audit_log_user_id", "audit_log", ["user_id"])
    op.create_index("ix_audit_log_entity_type_entity_id", "audit_log", ["entity_type", "entity_id"])

    # data_load_history
    op.create_index("ix_data_load_history_source_id_started_at", "data_load_history", ["source_id", "started_at"])
    op.create_index("ix_data_load_history_status", "data_load_history", ["status"])

    # data_quality_issues
    op.create_index("ix_data_quality_issues_load_id", "data_quality_issues", ["load_id"])
    op.create_index("ix_data_quality_issues_resolved", "data_quality_issues", ["resolved"])

    # pd_parameters
    op.create_index("ix_pd_parameters_reporting_month_segment", "pd_parameters", ["reporting_month", "segment_id"])

    # lgd_parameters
    op.create_index("ix_lgd_parameters_reporting_month_segment", "lgd_parameters", ["reporting_month", "segment_id"])

    # ml_models
    op.create_index("ix_ml_models_status", "ml_models", ["status"])
    op.create_index("ix_ml_models_model_type", "ml_models", ["model_type"])

    # risk_register
    op.create_index("ix_risk_register_status", "risk_register", ["status"])
    op.create_index("ix_risk_register_rating", "risk_register", ["rating"])


def downgrade() -> None:
    op.drop_index("ix_loan_accounts_cl_status", "loan_accounts")
    op.drop_index("ix_loan_accounts_dpd", "loan_accounts")

    op.drop_index("ix_staging_results_reporting_month_stage", "staging_results")
    op.drop_index("ix_staging_results_override_flag", "staging_results")

    op.drop_index("ix_ecl_results_reporting_month_stage", "ecl_results")
    op.drop_index("ix_ecl_results_run_id_month", "ecl_results")

    op.drop_index("ix_provision_runs_reporting_month_status", "provision_runs")
    op.drop_index("ix_provision_runs_initiated_at", "provision_runs")

    op.drop_index("ix_gl_entries_run_id", "gl_entries")
    op.drop_index("ix_gl_entries_entry_date", "gl_entries")
    op.drop_index("ix_gl_entries_posted", "gl_entries")

    op.drop_index("ix_macro_scenarios_reporting_month_status", "macro_scenarios")

    op.drop_index("ix_management_overlays_status", "management_overlays")
    op.drop_index("ix_management_overlays_effective_from", "management_overlays")
    op.drop_index("ix_management_overlays_loan_id", "management_overlays")
    op.drop_index("ix_management_overlays_segment_id", "management_overlays")

    op.drop_index("ix_audit_log_event_at", "audit_log")
    op.drop_index("ix_audit_log_user_id", "audit_log")
    op.drop_index("ix_audit_log_entity_type_entity_id", "audit_log")

    op.drop_index("ix_data_load_history_source_id_started_at", "data_load_history")
    op.drop_index("ix_data_load_history_status", "data_load_history")

    op.drop_index("ix_data_quality_issues_load_id", "data_quality_issues")
    op.drop_index("ix_data_quality_issues_resolved", "data_quality_issues")

    op.drop_index("ix_pd_parameters_reporting_month_segment", "pd_parameters")
    op.drop_index("ix_lgd_parameters_reporting_month_segment", "lgd_parameters")

    op.drop_index("ix_ml_models_status", "ml_models")
    op.drop_index("ix_ml_models_model_type", "ml_models")

    op.drop_index("ix_risk_register_status", "risk_register")
    op.drop_index("ix_risk_register_rating", "risk_register")
