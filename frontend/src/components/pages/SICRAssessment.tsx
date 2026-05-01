import { useReportingMonthStore } from '../../stores/reportingMonthStore'
import { useState } from 'react'
import { format } from 'date-fns'
import { SectionHeader } from '../shared/SectionHeader'
import { StageBadge } from '../shared/StageBadge'
import { DataTable, type ColumnDef } from '../shared/DataTable'
import { useSICRAssessment, useSICRFactorSummary, useSICRRulesConfig } from '../../hooks/useSICR'
import type { SICRAssessmentRow } from '../../types'


type Tab = 'assessment' | 'summary' | 'rules'

export function SICRAssessment() {
  const [tab, setTab] = useState<Tab>('assessment')
  const month = useReportingMonthStore((s) => s.selectedMonth)
  const [sicrOnly, setSicrOnly] = useState(false)
  const [page, setPage] = useState(1)

  const { data: assessment, isLoading: assLoading } = useSICRAssessment(month, sicrOnly, page, 100)
  const { data: summary, isLoading: sumLoading } = useSICRFactorSummary(month)
  const { data: rules, isLoading: rulesLoading } = useSICRRulesConfig()

  const columns: ColumnDef<SICRAssessmentRow>[] = [
    { key: 'loan_id', header: 'Loan ID', render: (r) => <code className="text-xs font-mono">{r.loan_id}</code> },
    { key: 'stage', header: 'Stage', render: (r) => <StageBadge stage={r.stage as 1|2|3} size="sm" /> },
    { key: 'dpd_at_staging', header: 'DPD', render: (r) => <span className={r.dpd_at_staging >= 30 ? 'text-amber-700 font-semibold' : ''}>{r.dpd_at_staging}</span> },
    { key: 'cl_status_at_staging', header: 'CL Status', render: (r) => r.cl_status_at_staging ?? '—' },
    { key: 'crr_at_staging', header: 'CRR', render: (r) => r.crr_at_staging != null ? <span className={r.crr_at_staging >= 5 ? 'text-red-600 font-medium' : ''}>{r.crr_at_staging}</span> : '—' },
    {
      key: 'sicr_flag', header: 'SICR Flag',
      render: (r) => r.sicr_flag
        ? <span className="inline-flex items-center text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">SICR</span>
        : <span className="text-xs text-green-600">Pass</span>,
    },
    {
      key: 'ifrs_default_flag', header: 'Default',
      render: (r) => r.ifrs_default_flag
        ? <span className="text-xs font-semibold text-red-700">Default</span>
        : <span className="text-xs text-gray-400">—</span>,
    },
    {
      key: 'override_flag', header: 'Override',
      render: (r) => r.override_flag
        ? <span className="text-xs font-medium text-purple-700">Yes</span>
        : <span className="text-xs text-gray-400">—</span>,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SectionHeader title="SICR Assessment" subtitle="Significant Increase in Credit Risk indicators" />
      </div>

      <div className="flex gap-1 border-b border-app-border">
        {([
          { key: 'assessment', label: 'Assessment Results' },
          { key: 'summary', label: 'Factor Summary' },
          { key: 'rules', label: 'Rules Config' },
        ] as { key: Tab; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === key ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'assessment' && (
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={sicrOnly} onChange={(e) => { setSicrOnly(e.target.checked); setPage(1) }} className="rounded" />
            Show SICR-triggered only
          </label>
          <DataTable
            columns={columns}
            data={assessment?.items ?? []}
            totalCount={assessment?.total ?? 0}
            page={page}
            pageSize={100}
            onPageChange={setPage}
            isLoading={assLoading}
            rowKey={(r) => r.staging_id}
            emptyMessage="No SICR assessment data for this month."
          />
        </div>
      )}

      {tab === 'summary' && (
        <div>
          {sumLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : !summary ? (
            <div className="bg-white rounded-xl border border-app-border p-8 text-center text-sm text-gray-400">No summary data available.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Total Assessed', value: summary.total_assessed, color: 'text-gray-900' },
                { label: 'SICR Triggered', value: summary.sicr_count, color: 'text-amber-700' },
                { label: 'Defaults', value: summary.default_count, color: 'text-red-600' },
                { label: 'Overrides', value: summary.override_count, color: 'text-purple-700' },
                { label: 'Stage 1', value: summary.stage1_count, color: 'text-green-700' },
                { label: 'Stage 2', value: summary.stage2_count, color: 'text-amber-700' },
                { label: 'Stage 3', value: summary.stage3_count, color: 'text-red-600' },
                { label: 'DPD-triggered', value: summary.dpd_trigger_count, color: 'text-orange-700' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white rounded-xl border border-app-border p-4">
                  <p className="text-xs text-gray-500 mb-1">{label}</p>
                  <p className={`text-2xl font-bold ${color}`}>{value.toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'rules' && (
        <div>
          {rulesLoading ? (
            <div className="h-64 bg-gray-50 rounded-xl animate-pulse" />
          ) : !rules ? (
            <div className="bg-white rounded-xl border border-app-border p-8 text-center text-sm text-gray-400">No rules config available.</div>
          ) : (
            <div className="bg-white rounded-xl border border-app-border divide-y divide-app-border">
              {[
                { label: 'DPD Stage 2 Threshold', value: `${rules.dpd_stage2_threshold} days` },
                { label: 'DPD Stage 3 Threshold', value: `${rules.dpd_stage3_threshold} days` },
                { label: 'CRR Stage 2 Threshold', value: `Rating ≥ ${rules.crr_stage2_threshold}` },
                { label: 'CL Status → Stage 2', value: rules.cl_status_stage2.join(', ') },
                { label: 'CL Status → Stage 3', value: rules.cl_status_stage3.join(', ') },
                { label: 'PD Ratio Threshold', value: `${rules.pd_ratio_threshold}×` },
                { label: 'Watchlist triggers SICR', value: rules.watchlist_triggers_sicr ? 'Yes' : 'No' },
                { label: 'Forbearance triggers SICR', value: rules.forbearance_triggers_sicr ? 'Yes' : 'No' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between px-5 py-3">
                  <span className="text-sm text-gray-600">{label}</span>
                  <span className="text-sm font-medium text-gray-900">{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
