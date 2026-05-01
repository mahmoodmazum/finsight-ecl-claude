import { useReportingMonthStore } from '../../stores/reportingMonthStore'
import { useState } from 'react'
import { format } from 'date-fns'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { SectionHeader } from '../shared/SectionHeader'
import { StageBadge } from '../shared/StageBadge'
import { MetricCard } from '../shared/MetricCard'
import { DataTable, type ColumnDef } from '../shared/DataTable'
import { useTriggerECLRun, useECLRunStatus, useECLResults, usePortfolioSummary, useECLParameters } from '../../hooks/useECLCalc'
import { usePermissions } from '../../hooks/usePermissions'
import type { ECLResultRow, SegmentSummary } from '../../types'

function fmt(v: number) { return `৳${Number(v).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Cr` }
function pct(v: number) { return `${(Number(v) * 100).toFixed(2)}%` }

type Tab = 'results' | 'summary' | 'parameters'

export function ECLCalc() {
  const [tab, setTab] = useState<Tab>('results')
  const month = useReportingMonthStore((s) => s.selectedMonth)
  const [runType, setRunType] = useState('MONTH_END')
  const [stageFilter, setStageFilter] = useState<number | undefined>()
  const [page, setPage] = useState(1)
  const [activeRunId, setActiveRunId] = useState<string | null>(null)
  const { can } = usePermissions()

  const { data: results, isLoading: resLoading } = useECLResults(month, undefined, stageFilter, page, 100)
  const { data: summary, isLoading: sumLoading } = usePortfolioSummary(month)
  const { data: parameters, isLoading: paramLoading } = useECLParameters(month)
  const triggerRun = useTriggerECLRun()
  const { data: runStatus } = useECLRunStatus(activeRunId ?? '', !!activeRunId)

  async function handleRunECL() {
    const res = await triggerRun.mutateAsync({ month, run_type: runType })
    setActiveRunId(res.run_id)
  }

  const resultsColumns: ColumnDef<ECLResultRow>[] = [
    { key: 'loan_id', header: 'Loan ID', render: (r) => <code className="text-xs font-mono">{r.loan_id}</code> },
    { key: 'stage', header: 'Stage', render: (r) => <StageBadge stage={r.stage as 1|2|3} size="sm" /> },
    { key: 'ead', header: 'EAD', render: (r) => fmt(r.ead), headerClassName: 'text-right', className: 'text-right' },
    { key: 'pd_12m', header: 'PD 12M', render: (r) => pct(r.pd_12m), headerClassName: 'text-right', className: 'text-right' },
    { key: 'lgd', header: 'LGD', render: (r) => pct(r.lgd), headerClassName: 'text-right', className: 'text-right' },
    { key: 'ecl_weighted', header: 'ECL (Weighted)', render: (r) => <span className="font-medium">{fmt(r.ecl_weighted)}</span>, headerClassName: 'text-right', className: 'text-right' },
    { key: 'ecl_base', header: 'ECL (Base)', render: (r) => fmt(r.ecl_base), headerClassName: 'text-right', className: 'text-right' },
    { key: 'ecl_optimistic', header: 'ECL (Opt.)', render: (r) => fmt(r.ecl_optimistic), headerClassName: 'text-right', className: 'text-right' },
    { key: 'ecl_pessimistic', header: 'ECL (Pess.)', render: (r) => fmt(r.ecl_pessimistic), headerClassName: 'text-right', className: 'text-right' },
  ]

  const segmentColumns: ColumnDef<SegmentSummary>[] = [
    { key: 'segment_id', header: 'Segment', render: (r) => <code className="text-xs font-medium text-primary bg-primary/5 px-2 py-0.5 rounded">{r.segment_id}</code> },
    { key: 'loan_count', header: 'Loans', render: (r) => r.loan_count.toLocaleString(), headerClassName: 'text-right', className: 'text-right' },
    { key: 'total_ead', header: 'Total EAD', render: (r) => fmt(r.total_ead), headerClassName: 'text-right', className: 'text-right' },
    { key: 'avg_pd_12m', header: 'Avg PD 12M', render: (r) => pct(r.avg_pd_12m), headerClassName: 'text-right', className: 'text-right' },
    { key: 'avg_lgd', header: 'Avg LGD', render: (r) => pct(r.avg_lgd), headerClassName: 'text-right', className: 'text-right' },
    { key: 'total_ecl_weighted', header: 'Total ECL', render: (r) => <span className="font-medium">{fmt(r.total_ecl_weighted)}</span>, headerClassName: 'text-right', className: 'text-right' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SectionHeader title="ECL Calculation" subtitle="IFRS 9 Expected Credit Loss results" />
        <div className="flex flex-wrap items-center gap-2">
          {can('ecl:run') && (
            <>
              <select
                value={runType}
                onChange={(e) => setRunType(e.target.value)}
                className="px-3 py-1.5 text-sm border border-app-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {['MONTH_END', 'INTRAMONTH', 'TEST'].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <button
                onClick={handleRunECL}
                disabled={triggerRun.isPending}
                className="px-4 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
              >
                {triggerRun.isPending ? 'Starting…' : 'Run ECL'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Active run status banner */}
      {activeRunId && runStatus && (
        <div className={`rounded-lg border px-4 py-3 text-sm flex items-center justify-between ${
          runStatus.status === 'COMPLETED' ? 'bg-green-50 border-green-200 text-green-800'
          : runStatus.status === 'FAILED' ? 'bg-red-50 border-red-200 text-red-800'
          : 'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          <span>
            ECL Run <code className="font-mono text-xs">{activeRunId.slice(0,8)}…</code> — Status: <strong>{runStatus.status}</strong>
            {runStatus.total_ecl != null && ` | Total ECL: ${fmt(runStatus.total_ecl)}`}
          </span>
          <button onClick={() => setActiveRunId(null)} className="text-xs underline">Dismiss</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-app-border">
        {([
          { key: 'results', label: 'Results' },
          { key: 'summary', label: 'Portfolio Summary' },
          { key: 'parameters', label: 'LGD Parameters' },
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

      {tab === 'results' && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {[undefined, 1, 2, 3].map((s) => (
              <button
                key={s ?? 'all'}
                onClick={() => { setStageFilter(s); setPage(1) }}
                className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                  stageFilter === s ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-app-border hover:bg-gray-50'
                }`}
              >
                {s == null ? 'All Stages' : `Stage ${s}`}
              </button>
            ))}
          </div>
          <DataTable
            columns={resultsColumns}
            data={results?.items ?? []}
            totalCount={results?.total ?? 0}
            page={page}
            pageSize={100}
            onPageChange={setPage}
            isLoading={resLoading}
            rowKey={(r) => r.ecl_id}
            emptyMessage="No ECL results for this month. Run the ECL engine first."
          />
        </div>
      )}

      {tab === 'summary' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <MetricCard title="Total ECL" value={summary ? fmt(summary.total_ecl) : '—'} variant="primary" loading={sumLoading} />
            <MetricCard title="Stage 1 ECL" value={summary ? fmt(summary.stage1_ecl) : '—'} subtitle={summary ? `${summary.stage1_count.toLocaleString()} loans` : ''} variant="stage1" loading={sumLoading} />
            <MetricCard title="Stage 2 ECL" value={summary ? fmt(summary.stage2_ecl) : '—'} subtitle={summary ? `${summary.stage2_count.toLocaleString()} loans` : ''} variant="stage2" loading={sumLoading} />
            <MetricCard title="Stage 3 ECL" value={summary ? fmt(summary.stage3_ecl) : '—'} subtitle={summary ? `${summary.stage3_count.toLocaleString()} loans` : ''} variant="stage3" loading={sumLoading} />
          </div>

          {!sumLoading && summary && summary.by_segment.length > 0 && (
            <div className="bg-white rounded-xl border border-app-border p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">ECL by Segment</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={summary.by_segment} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F4" />
                  <XAxis dataKey="segment_id" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `৳${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Bar dataKey="total_ecl_weighted" name="ECL" fill="#136fff" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <DataTable
            columns={segmentColumns}
            data={summary?.by_segment ?? []}
            totalCount={summary?.by_segment.length ?? 0}
            page={1}
            pageSize={summary?.by_segment.length ?? 10}
            onPageChange={() => {}}
            isLoading={sumLoading}
            rowKey={(r) => r.segment_id}
            emptyMessage="No segment data available."
          />
        </div>
      )}

      {tab === 'parameters' && (
        <div>
          {paramLoading ? (
            <div className="h-64 bg-gray-50 rounded-xl animate-pulse" />
          ) : !parameters || parameters.lgd_parameters.length === 0 ? (
            <div className="bg-white rounded-xl border border-app-border p-8 text-center text-sm text-gray-400">No LGD parameters found for this month.</div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-app-border">
              <table className="min-w-full divide-y divide-app-border">
                <thead className="bg-gray-50">
                  <tr>
                    {['Segment', 'Security Tier', 'LGD Value', 'Haircut %', 'Active'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-app-border">
                  {parameters.lgd_parameters.map((p) => (
                    <tr key={p.lgd_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm"><code className="text-xs font-medium text-primary">{p.segment_id}</code></td>
                      <td className="px-4 py-3 text-sm">{p.security_tier}</td>
                      <td className="px-4 py-3 text-sm font-medium">{pct(p.lgd_value)}</td>
                      <td className="px-4 py-3 text-sm">{pct(p.haircut_pct)}</td>
                      <td className="px-4 py-3 text-sm">{p.is_active ? <span className="text-green-600">Yes</span> : <span className="text-gray-400">No</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
