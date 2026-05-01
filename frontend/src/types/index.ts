// Auth
export interface RoleRef {
  role_id: string
  name: string
  description: string | null
  is_system: boolean
}

export interface User {
  user_id: string
  email: string
  full_name: string
  role: string           // legacy column
  is_active: boolean
  last_login: string | null
  roles: RoleRef[]
  permissions: string[]
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  user: User
}

// Admin — Users
export interface AdminUser {
  user_id: string
  email: string
  full_name: string
  role: string
  is_active: boolean
  last_login: string | null
  created_at: string
  roles: string[]
}

export interface AdminUserPage {
  items: AdminUser[]
  total: number
  page: number
  page_size: number
}

export interface UserCreatePayload {
  email: string
  full_name: string
  password: string
  role?: string
}

export interface UserUpdatePayload {
  full_name?: string
  email?: string
}

export interface UserRoleAssign {
  role_id: string
  expires_at?: string | null
}

// Admin — Roles
export interface AdminRole {
  role_id: string
  name: string
  description: string | null
  is_system: boolean
  is_active: boolean
  created_at: string
}

export interface AdminRoleCreate {
  name: string
  description?: string
}

export interface AdminRoleUpdate {
  name?: string
  description?: string
  is_active?: boolean
}

// Admin — Permissions
export interface AdminPermission {
  permission_id: string
  code: string
  name: string
  description: string | null
  module: string
  action: string
}

// Pagination
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

// Dashboard
export interface DashboardSummary {
  month: string
  total_ecl: number
  stage1_ead: number
  stage2_ead: number
  stage3_ead: number
  stage1_ecl: number
  stage2_ecl: number
  stage3_ecl: number
  stage1_pct: number
  stage2_pct: number
  stage3_pct: number
  ecl_by_segment: SegmentECL[]
  scenario_weights: ScenarioWeight[]
  recent_runs: ProvisionRunSummary[]
}

export interface SegmentECL {
  segment_id: string
  segment_name: string
  ecl: number
  ecl_weighted: number
  ead: number
}

export interface ScenarioWeight {
  scenario_name: string
  weight: number
  macro_multiplier: number
}

export interface ProvisionRunSummary {
  run_id: string
  reporting_month: string
  run_type: string
  status: string
  total_ecl: number
  initiated_at: string
}

// Staging
export interface StagingResult {
  staging_id: number
  loan_id: string
  reporting_month: string
  stage: 1 | 2 | 3
  ifrs_default_flag: boolean
  sicr_flag: boolean
  dpd_at_staging: number
  cl_status_at_staging: string | null
  crr_at_staging: number | null
  override_flag: boolean
  override_reason: string | null
  override_by: string | null
  override_approved_by: string | null
  override_at: string | null
}

// ECL
export interface ECLResult {
  ecl_id: number
  loan_id: string
  reporting_month: string
  stage: 1 | 2 | 3
  ead: number
  pd_12m: number
  pd_lifetime: number
  lgd: number
  eir: number
  ecl_base: number
  ecl_optimistic: number
  ecl_pessimistic: number
  ecl_weighted: number
}

// Macro
export interface MacroScenario {
  scenario_id: string
  reporting_month: string
  scenario_name: 'BASE' | 'OPTIMISTIC' | 'PESSIMISTIC'
  weight: number
  gdp_growth: number
  cpi_inflation: number
  bdt_usd_rate: number
  bb_repo_rate: number
  npl_ratio: number
  remittance_growth: number
  export_growth: number
  macro_multiplier: number
  status: string
}

// Provision
export interface ProvisionRun {
  run_id: string
  reporting_month: string
  run_type: string
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'LOCKED'
  total_ecl: number
  total_stage1_ecl: number
  total_stage2_ecl: number
  total_stage3_ecl: number
  initiated_at: string
  approved_at: string | null
  locked_at: string | null
}

// Audit
export interface AuditLog {
  log_id: number
  event_type: string
  entity_type: string
  entity_id: string
  user_id: string
  user_ip: string
  before_state: string | null
  after_state: string | null
  event_at: string
  notes: string | null
}

// Segment
export interface Segment {
  segment_id: string
  segment_name: string
  assessment_method: string
  collateral_type: string | null
  rating_band: string | null
  unsecured_lgd_floor: number
  ccf: number
  is_active: boolean
  created_at: string
}

export interface PDParameter {
  pd_param_id: string
  segment_id: string
  reporting_month: string
  observation_no: number
  start_month: string
  end_month: string
  total_accounts: number
  default_accounts: number
  raw_pd: number
  observation_weight: number
  weighted_pd: number
}

export interface LGDParameter {
  lgd_id: string
  segment_id: string
  reporting_month: string
  security_tier: string
  lgd_value: number
  haircut_pct: number
  is_active: boolean
}

// Data Ingestion
export interface DataSource {
  source_id: string
  source_name: string
  source_type: string
  integration_method: string
  schedule_cron: string | null
  last_run_at: string | null
  last_run_status: string | null
  last_records_ingested: number | null
  last_records_failed: number | null
  is_active: boolean
}

export interface DataLoadHistory {
  load_id: number
  source_id: string
  started_at: string
  completed_at: string | null
  status: string
  records_extracted: number | null
  records_loaded: number | null
  records_failed: number | null
  error_summary: string | null
}

export interface DataQualityIssue {
  issue_id: number
  load_id: number
  loan_id: string | null
  field_name: string | null
  error_type: string
  error_detail: string | null
  is_quarantined: boolean
  resolved: boolean
}

// SICR
export interface SICRAssessmentRow {
  staging_id: number
  loan_id: string
  reporting_month: string
  stage: number
  sicr_flag: boolean
  ifrs_default_flag: boolean
  dpd_at_staging: number
  cl_status_at_staging: string | null
  crr_at_staging: number | null
  override_flag: boolean
}

export interface SICRFactorSummary {
  reporting_month: string
  total_assessed: number
  sicr_count: number
  default_count: number
  stage1_count: number
  stage2_count: number
  stage3_count: number
  override_count: number
  dpd_trigger_count: number
}

export interface SICRRulesConfig {
  dpd_stage2_threshold: number
  dpd_stage3_threshold: number
  crr_stage2_threshold: number
  cl_status_stage2: string[]
  cl_status_stage3: string[]
  pd_ratio_threshold: number
  watchlist_triggers_sicr: boolean
  forbearance_triggers_sicr: boolean
}

// ECL
export interface ECLRunResponse {
  run_id: string
  reporting_month: string
  run_type: string
  status: string
  initiated_at: string
}

export interface ECLRunStatus {
  run_id: string
  reporting_month: string
  run_type: string
  status: string
  total_ecl: number | null
  total_stage1_ecl: number | null
  total_stage2_ecl: number | null
  total_stage3_ecl: number | null
  initiated_at: string
  approved_at: string | null
}

export interface ECLResultRow {
  ecl_id: number
  loan_id: string
  reporting_month: string
  stage: number
  ead: number
  pd_12m: number
  pd_lifetime: number
  lgd: number
  eir: number
  ecl_base: number
  ecl_optimistic: number
  ecl_pessimistic: number
  ecl_weighted: number
}

export interface SegmentSummary {
  segment_id: string
  loan_count: number
  total_ead: number
  avg_pd_12m: number
  avg_lgd: number
  total_ecl_weighted: number
  stage1_ecl: number
  stage2_ecl: number
  stage3_ecl: number
}

export interface PortfolioSummary {
  reporting_month: string
  total_loans: number
  total_ead: number
  total_ecl: number
  stage1_ecl: number
  stage2_ecl: number
  stage3_ecl: number
  stage1_count: number
  stage2_count: number
  stage3_count: number
  by_segment: SegmentSummary[]
}

export interface LGDParameterUpdate {
  lgd_id: string
  lgd_value: number
  haircut_pct: number
}

export interface ParametersResponse {
  reporting_month: string
  lgd_parameters: LGDParameter[]
}

// Provision
export interface ProvisionMovement {
  movement_id: string
  run_id: string
  movement_type: string
  amount: number
  account_count: number
  notes: string | null
}

export interface GLEntry {
  entry_id: string
  run_id: string
  entry_date: string
  dr_account: string
  cr_account: string
  amount: number
  currency: string
  description: string | null
  entry_type: string
  posted: boolean
  posted_at: string | null
}

// Management Overlays
export interface ManagementOverlay {
  overlay_id: string
  loan_id: string | null
  segment_id: string | null
  overlay_type: string
  adjustment_factor: number
  rationale: string
  effective_from: string
  effective_to: string | null
  status: string
  submitted_by: string | null
  approved_by: string | null
  submitted_at: string
  approved_at: string | null
}

export interface OverlayCreate {
  loan_id?: string
  segment_id?: string
  overlay_type: string
  adjustment_factor: number
  rationale: string
  effective_from: string
  effective_to?: string
}

// Model Governance
export interface MLModel {
  model_id: string
  model_name: string
  model_type: string
  method: string | null
  version: string
  gini_coefficient: number | null
  ks_statistic: number | null
  approved_by: string | null
  approved_at: string | null
  status: string
  notes: string | null
  created_at: string
}

export interface MLModelCreate {
  model_id: string
  model_name: string
  model_type: string
  method?: string
  version: string
  gini_coefficient?: number
  ks_statistic?: number
  notes?: string
}

// Risk Register
export interface RiskRegister {
  risk_id: string
  risk_title: string
  description: string | null
  category: string
  rating: string
  mitigation: string | null
  owner: string | null
  status: string
  target_date: string | null
  created_at: string
}

export interface RiskCreate {
  risk_title: string
  description?: string
  category: string
  rating: string
  mitigation?: string
  owner?: string
  target_date?: string
}

// Reports
export interface ReportDefinition {
  report_id: string
  report_name: string
  description: string
  category: string
  parameters: string[]
}

export interface BBRegulatoryRow {
  reporting_month: string
  stage: number
  total_outstanding: number
  total_provision: number
  provision_coverage_pct: number
}

export interface IFRS7DisclosureRow {
  stage: number
  loan_count: number
  gross_ead: number
  ecl_weighted: number
  ecl_rate_pct: number
}

// Macro sensitivity
export interface SensitivityRow {
  scenario_name: string
  macro_multiplier: number
  weight: number
  weighted_contribution: number
}

export interface SensitivityResponse {
  reporting_month: string
  total_weighted_multiplier: number
  rows: SensitivityRow[]
}
