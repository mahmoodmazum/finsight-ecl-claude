import { useReportingMonthStore } from '../../stores/reportingMonthStore'
import { useState } from 'react'
import { SectionHeader } from '../shared/SectionHeader'
import { StageBadge } from '../shared/StageBadge'
import { DataTable, type ColumnDef } from '../shared/DataTable'
import { useSICRAssessment, useSICRFactorSummary, useSICRRulesConfig } from '../../hooks/useSICR'
import type { SICRAssessmentRow } from '../../types'
import { COLORS, STYLES, badgeStyle } from '../../styles/design-system'

type Tab = 'assessment' | 'summary' | 'rules'

const TABS = [
  { key: 'assessment', label: 'Assessment Results' },
  { key: 'summary',    label: 'Factor Summary' },
  { key: 'rules',      label: 'Rules Config' },
]

export function SICRAssessment() {
  const [tab, setTab]       = useState<Tab>('assessment')
  const month               = useReportingMonthStore((s) => s.selectedMonth)
  const [sicrOnly, setSicrOnly] = useState(false)
  const [page, setPage]     = useState(1)

  const { data: assessment, isLoading: assLoading } = useSICRAssessment(month, sicrOnly, page, 100)
  const { data: summary, isLoading: sumLoading }    = useSICRFactorSummary(month)
  const { data: rules, isLoading: rulesLoading }    = useSICRRulesConfig()

  const columns: ColumnDef<SICRAssessmentRow>[] = [
    { key: 'loan_id', header: 'Loan ID', render: (r) => <span style={{ fontFamily: 'monospace', fontSize: 11, color: COLORS.primary, fontWeight: 600 }}>{r.loan_id}</span> },
    { key: 'stage', header: 'Stage', render: (r) => <StageBadge stage={r.stage as 1|2|3} /> },
    { key: 'dpd_at_staging', header: 'DPD', render: (r) => <span style={{ color: r.dpd_at_staging >= 30 ? COLORS.warning : COLORS.text, fontWeight: r.dpd_at_staging >= 30 ? 700 : 400 }}>{r.dpd_at_staging}</span> },
    { key: 'cl_status_at_staging', header: 'CL Status', render: (r) => r.cl_status_at_staging ?? '—' },
    { key: 'crr_at_staging', header: 'CRR', render: (r) => r.crr_at_staging != null
      ? <span style={{ color: r.crr_at_staging >= 5 ? COLORS.danger : COLORS.text, fontWeight: r.crr_at_staging >= 5 ? 600 : 400 }}>{r.crr_at_staging}</span>
      : '—' },
    { key: 'sicr_flag', header: 'SICR Flag', render: (r) => r.sicr_flag
      ? <span style={badgeStyle(COLORS.danger)}>SICR</span>
      : <span style={{ ...badgeStyle(COLORS.success) }}>Pass</span> },
    { key: 'ifrs_default_flag', header: 'Default', render: (r) => r.ifrs_default_flag
      ? <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.danger }}>Default</span>
      : <span style={{ color: COLORS.textMuted }}>—</span> },
    { key: 'override_flag', header: 'Override', render: (r) => r.override_flag
      ? <span style={badgeStyle(COLORS.primary)}>Yes</span>
      : <span style={{ color: COLORS.textMuted }}>—</span> },
  ]

  const summaryItems = summary ? [
    { label: 'Total Assessed',  value: summary.total_assessed, color: COLORS.text },
    { label: 'SICR Triggered',  value: summary.sicr_count,     color: COLORS.warning },
    { label: 'Defaults',        value: summary.default_count,  color: COLORS.danger },
    { label: 'Overrides',       value: summary.override_count, color: COLORS.primary },
    { label: 'Stage 1',         value: summary.stage1_count,   color: COLORS.stage1 },
    { label: 'Stage 2',         value: summary.stage2_count,   color: COLORS.stage2 },
    { label: 'Stage 3',         value: summary.stage3_count,   color: COLORS.stage3 },
    { label: 'DPD-triggered',   value: summary.dpd_trigger_count, color: COLORS.warning },
  ] : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SectionHeader title="SICR Assessment" subtitle="Significant Increase in Credit Risk indicators" />

      <div style={{ display: 'flex', gap: 2, borderBottom: `1px solid ${COLORS.border}` }}>
        {TABS.map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key as Tab)} style={{
            padding: '8px 18px', fontSize: 13, fontWeight: 600, border: 'none',
            background: 'transparent', color: tab === key ? COLORS.primary : COLORS.textMuted,
            borderBottom: `2px solid ${tab === key ? COLORS.primary : 'transparent'}`,
            cursor: 'pointer', marginBottom: -1,
          }}>{label}</button>
        ))}
      </div>

      {tab === 'assessment' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: COLORS.text, cursor: 'pointer' }}>
            <input type="checkbox" checked={sicrOnly} onChange={(e) => { setSicrOnly(e.target.checked); setPage(1) }} />
            Show SICR-triggered only
          </label>
          <DataTable columns={columns} data={assessment?.items ?? []} totalCount={assessment?.total ?? 0}
            page={page} pageSize={100} onPageChange={setPage} isLoading={assLoading}
            rowKey={(r) => r.staging_id} emptyMessage="No SICR assessment data for this month." />
        </div>
      )}

      {tab === 'summary' && (
        <div>
          {sumLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 10 }} />)}
            </div>
          ) : !summary ? (
            <div style={{ ...STYLES.card, textAlign: 'center', color: COLORS.textMuted }}>No summary data available.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              {summaryItems.map(({ label, value, color }) => (
                <div key={label} style={STYLES.card}>
                  <p style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{label}</p>
                  <p style={{ fontSize: 26, fontWeight: 700, color }}>{value.toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'rules' && (
        <div>
          {rulesLoading ? (
            <div className="skeleton" style={{ height: 240, borderRadius: 10 }} />
          ) : !rules ? (
            <div style={{ ...STYLES.card, textAlign: 'center', color: COLORS.textMuted }}>No rules config available.</div>
          ) : (
            <div style={{ ...STYLES.card, padding: 0, overflow: 'hidden' }}>
              {[
                { label: 'DPD Stage 2 Threshold',   value: `${rules.dpd_stage2_threshold} days` },
                { label: 'DPD Stage 3 Threshold',   value: `${rules.dpd_stage3_threshold} days` },
                { label: 'CRR Stage 2 Threshold',   value: `Rating ≥ ${rules.crr_stage2_threshold}` },
                { label: 'CL Status → Stage 2',     value: rules.cl_status_stage2.join(', ') },
                { label: 'CL Status → Stage 3',     value: rules.cl_status_stage3.join(', ') },
                { label: 'PD Ratio Threshold',       value: `${rules.pd_ratio_threshold}×` },
                { label: 'Watchlist triggers SICR',  value: rules.watchlist_triggers_sicr ? 'Yes' : 'No' },
                { label: 'Forbearance triggers SICR', value: rules.forbearance_triggers_sicr ? 'Yes' : 'No' },
              ].map(({ label, value }, idx) => (
                <div key={label} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 20px', borderBottom: idx < 7 ? `1px solid ${COLORS.border}` : undefined,
                  background: idx % 2 === 0 ? '#FFF' : '#FAFBFE',
                }}>
                  <span style={{ fontSize: 13, color: COLORS.textMuted }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
