"""Seed RBAC permissions, system roles, and assign roles to existing users.

Revision ID: 0004
Revises: 0003
Create Date: 2026-04-29
"""
import uuid
from datetime import datetime, timezone
from alembic import op
import sqlalchemy as sa

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None

# ---------------------------------------------------------------------------
# All permissions  (code, name, description, module, action)
# ---------------------------------------------------------------------------
PERMISSIONS = [
    # dashboard
    ("dashboard:view", "View Dashboard", "Access the main ECL dashboard", "dashboard", "view"),
    # data
    ("data:view", "View Data Sources", "View data ingestion status and history", "data", "view"),
    ("data:trigger", "Trigger Data Load", "Manually trigger a data source load", "data", "trigger"),
    ("data:upload", "Upload Macro Data", "Upload Bangladesh Bank macro CSV", "data", "upload"),
    ("data:quality:view", "View Data Quality", "View quarantined records and quality issues", "data", "view"),
    ("data:quality:resolve", "Resolve Data Issues", "Mark data quality issues as resolved", "data", "edit"),
    # segmentation
    ("segmentation:view", "View Segments", "View segment definitions and rating mapping", "segmentation", "view"),
    ("segmentation:edit", "Edit Segments", "Modify segment parameters and rules", "segmentation", "edit"),
    # staging
    ("staging:view", "View Staging Results", "View account stage classifications", "staging", "view"),
    ("staging:run", "Run Staging Engine", "Re-run the staging classification engine", "staging", "run"),
    ("staging:override:submit", "Submit Stage Override", "Submit a manual stage override request", "staging", "create"),
    ("staging:override:approve", "Approve Stage Override", "Approve or reject a stage override", "staging", "approve"),
    ("staging:migration:view", "View Migration Matrix", "View the stage migration matrix", "staging", "view"),
    # sicr
    ("sicr:view", "View SICR Assessment", "View SICR factor results per account", "sicr", "view"),
    ("sicr:rules:view", "View SICR Rules Config", "View configurable SICR thresholds", "sicr", "view"),
    ("sicr:rules:edit", "Edit SICR Rules", "Modify SICR thresholds (CRO-level action)", "sicr", "edit"),
    # ecl
    ("ecl:view", "View ECL Results", "View account-level and portfolio ECL results", "ecl", "view"),
    ("ecl:run", "Run ECL Calculation", "Trigger a full ECL calculation run", "ecl", "run"),
    ("ecl:parameters:view", "View ECL Parameters", "View LGD floors, CCF, cure periods", "ecl", "view"),
    ("ecl:parameters:edit", "Edit ECL Parameters", "Modify ECL model parameters", "ecl", "edit"),
    ("ecl:portfolio:view", "View Portfolio Summary", "View ECL portfolio summary by segment", "ecl", "view"),
    # macro
    ("macro:view", "View Macro Scenarios", "View macro scenario definitions and indicators", "macro", "view"),
    ("macro:edit", "Edit Macro Scenarios", "Modify macro variable values and weights", "macro", "edit"),
    ("macro:approve", "Approve Macro Scenarios", "Approve macro scenario for use in ECL run", "macro", "approve"),
    ("macro:sensitivity:view", "View Sensitivity Analysis", "View ECL sensitivity across scenarios", "macro", "view"),
    # provision
    ("provision:view", "View Provision Runs", "View provision run history and status", "provision", "view"),
    ("provision:movement:view", "View ECL Waterfall", "View ECL movement waterfall", "provision", "view"),
    ("provision:gl:view", "View GL Entries", "View auto-generated journal entries", "provision", "view"),
    ("provision:dualrun:view", "View Dual Run", "View IFRS 9 vs BB BRPD comparison", "provision", "view"),
    ("provision:approve", "Approve Provision Run", "Approve a provision run (CRO action)", "provision", "approve"),
    ("provision:lock", "Lock Provision Run", "Lock a provision run (immutable after lock)", "provision", "edit"),
    # overlays
    ("overlays:view", "View Overlays", "View active and historical overlays", "overlays", "view"),
    ("overlays:submit", "Submit Overlay", "Submit a management overlay for approval", "overlays", "create"),
    ("overlays:approve", "Approve Overlay", "Approve or reject a submitted overlay", "overlays", "approve"),
    ("overlays:expire", "Expire Overlay", "Force-expire an active overlay", "overlays", "delete"),
    # reports
    ("reports:view", "View Report Library", "View available reports and their status", "reports", "view"),
    ("reports:generate", "Generate Reports", "Trigger report generation", "reports", "run"),
    ("reports:export", "Export / Download Reports", "Download generated report files", "reports", "export"),
    ("reports:bb:view", "View BB Regulatory Forms", "View BB CL-1 to CL-5 status", "reports", "view"),
    ("reports:ifrs7:view", "View IFRS 7 Disclosures", "View IFRS 7 credit risk disclosure data", "reports", "view"),
    # governance
    ("governance:view", "View Model Library", "View model registry and backtesting results", "governance", "view"),
    ("governance:model:create", "Register New Model", "Add a new model to the registry", "governance", "create"),
    ("governance:model:edit", "Edit Model Details", "Modify model metadata and status", "governance", "edit"),
    ("governance:roadmap:view", "View Implementation Roadmap", "View the 5-phase implementation roadmap", "governance", "view"),
    ("governance:roadmap:edit", "Edit Roadmap Status", "Update phase milestones and status", "governance", "edit"),
    ("governance:backtesting:view", "View Backtesting Results", "View model backtesting and validation results", "governance", "view"),
    # audit
    ("audit:log:view", "View Audit Log", "View the immutable system audit log", "audit", "view"),
    ("audit:register:view", "View Risk Register", "View the implementation risk register", "audit", "view"),
    ("audit:register:edit", "Edit Risk Register", "Create and update risk register entries", "audit", "edit"),
    # admin
    ("admin:users:view", "View Users", "View all system users", "admin", "view"),
    ("admin:users:create", "Create User", "Create a new user account", "admin", "create"),
    ("admin:users:edit", "Edit User", "Modify user details", "admin", "edit"),
    ("admin:users:deactivate", "Deactivate User", "Deactivate / reactivate a user account", "admin", "edit"),
    ("admin:roles:view", "View Roles", "View all roles and their permissions", "admin", "view"),
    ("admin:roles:create", "Create Role", "Create a new custom role", "admin", "create"),
    ("admin:roles:edit", "Edit Role", "Modify role name/description", "admin", "edit"),
    ("admin:roles:delete", "Delete Role", "Delete a non-system role", "admin", "delete"),
    ("admin:roles:permissions", "Manage Role Permissions", "Assign or remove permissions from a role", "admin", "edit"),
    ("admin:users:roles", "Manage User Roles", "Assign or remove roles from a user", "admin", "edit"),
]

# ---------------------------------------------------------------------------
# CRO permissions
# ---------------------------------------------------------------------------
CRO_PERMS = {
    "dashboard:view",
    "data:view", "data:quality:view",
    "segmentation:view", "segmentation:edit",
    "staging:view", "staging:run", "staging:override:submit", "staging:override:approve", "staging:migration:view",
    "sicr:view", "sicr:rules:view", "sicr:rules:edit",
    "ecl:view", "ecl:run", "ecl:parameters:view", "ecl:parameters:edit", "ecl:portfolio:view",
    "macro:view", "macro:edit", "macro:approve", "macro:sensitivity:view",
    "provision:view", "provision:movement:view", "provision:gl:view", "provision:dualrun:view",
    "provision:approve", "provision:lock",
    "overlays:view", "overlays:submit", "overlays:approve", "overlays:expire",
    "reports:view", "reports:generate", "reports:export", "reports:bb:view", "reports:ifrs7:view",
    "governance:view", "governance:model:create", "governance:model:edit",
    "governance:roadmap:view", "governance:roadmap:edit", "governance:backtesting:view",
    "audit:log:view", "audit:register:view", "audit:register:edit",
    "admin:users:view",
}

ANALYST_PERMS = {
    "dashboard:view",
    "data:view", "data:trigger", "data:upload", "data:quality:view",
    "segmentation:view",
    "staging:view", "staging:run", "staging:override:submit", "staging:migration:view",
    "sicr:view", "sicr:rules:view",
    "ecl:view", "ecl:run", "ecl:parameters:view", "ecl:portfolio:view",
    "macro:view", "macro:edit", "macro:sensitivity:view",
    "provision:view", "provision:movement:view", "provision:gl:view", "provision:dualrun:view",
    "overlays:view", "overlays:submit",
    "reports:view", "reports:generate", "reports:export", "reports:bb:view", "reports:ifrs7:view",
    "governance:view", "governance:roadmap:view", "governance:backtesting:view",
    "audit:log:view", "audit:register:view",
}

VIEWER_PERMS = {
    "dashboard:view",
    "segmentation:view", "staging:view", "staging:migration:view",
    "sicr:view", "sicr:rules:view",
    "ecl:view", "ecl:parameters:view", "ecl:portfolio:view",
    "macro:view", "macro:sensitivity:view",
    "provision:view", "provision:movement:view", "provision:gl:view", "provision:dualrun:view",
    "overlays:view",
    "reports:view", "reports:bb:view", "reports:ifrs7:view",
    "governance:view", "governance:roadmap:view", "governance:backtesting:view",
    "audit:log:view", "audit:register:view",
}


def upgrade() -> None:
    conn = op.get_bind()
    now = datetime.now(timezone.utc)

    # ---- Insert all permissions ----------------------------------------
    perm_id_map: dict[str, str] = {}
    for code, name, desc, module, action in PERMISSIONS:
        pid = str(uuid.uuid4())
        perm_id_map[code] = pid
        conn.execute(
            sa.text(
                "INSERT INTO permissions (permission_id, code, name, description, module, action, created_at) "
                "VALUES (:pid, :code, :name, :desc, :module, :action, :now)"
            ),
            {"pid": pid, "code": code, "name": name, "desc": desc,
             "module": module, "action": action, "now": now},
        )

    # ---- Insert system roles ------------------------------------------
    all_perm_codes = {p[0] for p in PERMISSIONS}

    roles = [
        ("SUPER_ADMIN", "Full system access — all permissions", all_perm_codes),
        ("CRO", "Chief Risk Officer — approval and oversight permissions", CRO_PERMS),
        ("ANALYST", "ECL Analyst — calculation and reporting permissions", ANALYST_PERMS),
        ("VIEWER", "Read-only access to all modules", VIEWER_PERMS),
    ]

    role_id_map: dict[str, str] = {}
    for role_name, role_desc, perms in roles:
        rid = str(uuid.uuid4())
        role_id_map[role_name] = rid
        conn.execute(
            sa.text(
                "INSERT INTO roles (role_id, name, description, is_system, is_active, created_at, updated_at) "
                "VALUES (:rid, :name, :desc, 1, 1, :now, :now)"
            ),
            {"rid": rid, "name": role_name, "desc": role_desc, "now": now},
        )
        # Assign permissions to role
        for code in perms:
            pid = perm_id_map.get(code)
            if pid:
                conn.execute(
                    sa.text(
                        "INSERT INTO role_permissions (role_id, permission_id, granted_at) "
                        "VALUES (:rid, :pid, :now)"
                    ),
                    {"rid": rid, "pid": pid, "now": now},
                )

    # ---- Assign roles to existing users based on users.role column ----
    # Map legacy role names to new system role names
    legacy_map = {
        "ADMIN": "SUPER_ADMIN",
        "CRO": "CRO",
        "ANALYST": "ANALYST",
        "VIEWER": "VIEWER",
    }

    users_result = conn.execute(sa.text("SELECT user_id, role FROM users"))
    for row in users_result:
        user_id, legacy_role = row[0], row[1]
        new_role_name = legacy_map.get(legacy_role)
        if new_role_name:
            rid = role_id_map.get(new_role_name)
            if rid:
                conn.execute(
                    sa.text(
                        "INSERT INTO user_roles (user_id, role_id, assigned_at) "
                        "VALUES (:uid, :rid, :now)"
                    ),
                    {"uid": user_id, "rid": rid, "now": now},
                )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("DELETE FROM user_roles"))
    conn.execute(sa.text("DELETE FROM role_permissions"))
    conn.execute(sa.text("DELETE FROM roles WHERE is_system = 1"))
    conn.execute(sa.text("DELETE FROM permissions"))
