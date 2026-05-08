import { useReportingMonthStore } from '../../stores/reportingMonthStore'
import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { SectionHeader } from '../shared/SectionHeader'
import { StageBadge } from '../shared/StageBadge'
import { MetricCard } from '../shared/MetricCard'
import { DataTable, type ColumnDef } from '../shared/DataTable'
import { useTriggerECLRun, useECLRunStatus, useECLResults, usePortfolioSummary, useECLParameters } from '../../hooks/useECLCalc'
import { usePermissions } from '../../hooks/usePermissions'
import type { ECLResultRow, SegmentSummary } from '../../types'
import { COLORS, STYLES, idCell, badgeStyle } from '../../styles/design-system'

function fmt(v: number) { return `৳${Number(v).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Cr` }
function pct(v: number) { return `${(Number(v) * 100).toFixed(2)}%` }

type Tab = 'results' | 'summary' | 'parameters'

export function ECLCalc() {
  const [tab, setTab]               = useState<Tab>('results')
  const month                       = useReportingMonthStore((s) => s.selectedMonth)
  const [runType, setRunType]       = useState('MONTH_END')
  const [stageFilter, setStageFilter] = useState<number | undefined>()
  const [page, setPage]             = useState(1)
  const [activeRunId, setActiveRunId] = useState<string | null>(null)
  const { can }                     = usePermissions()

  const { data: results, isLoading: resLoading }       = useECLResults(month, undefined, stageFilter, page, 100)
  const { data: summary, isLoading: sumLoading }       = usePortfolioSummary(month)
  const { data: parameters, isLoading: paramLoading }  = useECLParameters(month)
  const triggerRun                                     = useTriggerECLRun()
  const { data: runStatus }                            = useECLRunStatus(activeRunId ?? '', !!activeRunId)

  async function handleRunECL() {
    const res = await triggerRun.mutateAsync({ month, run_type: runType })
    setActiveRunId(res.run_id)
  }

  const TABS = [
    { key: 'results',    label: 'Results' },
    { key: 'summary',    label: 'Portfolio Summary' },
    { key: 'parameters', label: 'LGD Parameters' },
  ]

  const filterBtnStyle = (active: boolean): React.CSSProperties => ({
    ...active ? STYLES.btnPrimary : STYLES.btnGhost,
    padding: '4px 14px', fontSize: 11,
  })

  const resultsColumns: ColumnDef<ECLResultRow>[] = [
    { key: 'loan_id', header: 'Loan ID', render: (r) => <span style={idCell}>{r.loan_id}</span> },
    { key: 'stage', header: 'Stage', render: (r) => <StageBadge stage={r.stage as 1|2|3} /> },
    { key: 'ead', header: 'EAD', render: (r) => fmt(r.ead), headerClassName: 'text-right', className: 'text-right' },
    { key: 'pd_12m', header: 'PD 12M', render: (r) => pct(r.pd_12m), headerClassName: 'text-right', className: 'text-right' },
    { key: 'lgd', header: 'LGD', render: (r) => pct(r.lgd), headerClassName: 'text-right', className: 'text-right' },
    { key: 'ecl_weighted', header: 'ECL (Weighted)', render: (r) => <span style={{ fontWeight: 700, color: COLORS.primary }}>{fmt(r.ecl_weighted)}</span>, headerClassName: 'text-right', className: 'text-right' },
    { key: 'ecl_base', header: 'ECL (Base)', render: (r) => fmt(r.ecl_base), headerClassName: 'text-right', className: 'text-right' },
    { key: 'ecl_optimistic', header: 'ECL (Opt.)', render: (r) => fmt(r.ecl_optimistic), headerClassName: 'text-right', className: 'text-right' },
    { key: 'ecl_pessimistic', header: 'ECL (Pess.)', render: (r) => fmt(r.ecl_pessimistic), headerClassName: 'text-right', className: 'text-right' },
  ]

  const segmentColumns: ColumnDef<SegmentSummary>[] = [
    { key: 'segment_id', header: 'Segment', render: (r) => <span style={idCell}>{r.segment_id}</span> },
    { key: 'loan_count', header: 'Loans', render: (r) => r.loan_count.toLocaleString(), headerClassName: 'text-right', className: 'text-right' },
    { key: 'total_ead', header: 'Total EAD', render: (r) => fmt(r.total_ead), headerClassName: 'text-right', className: 'text-right' },
    { key: 'avg_pd_12m', header: 'Avg PD 12M', render: (r) => pct(r.avg_pd_12m), headerClassName: 'text-right', className: 'text-right' },
    { key: 'avg_lgd', header: 'Avg LGD', render: (r) => pct(r.avg_lgd), headerClassName: 'text-right', className: 'text-right' },
    { key: 'total_ecl_weighted', header: 'Total ECL', render: (r) => <span style={{ fontWeight: 700, color: COLORS.primary }}>{fmt(r.total_ecl_weighted)}</span>, headerClassName: 'text-right', className: 'text-right' },
  ]

  const bannerColor = runStatus?.status === 'COMPLETED'
    ? { background: '#F0FFF4', borderLeft: `4px solid ${COLORS.success}`, color: COLORS.text }
    : runStatus?.status === 'FAILED'
    ? { background: '#FFF5F5', borderLeft: `4px solid ${COLORS.danger}`, color: COLORS.text }
    : { background: COLORS.teal + '15', borderLeft: `4px solid ${COLORS.teal}`, color: COLORS.text }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SectionHeader
        title="ECL Calculation"
        subtitle="IFRS 9 Expected Credit Loss results"
        actions={can('ecl:run') ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select value={runType} onChange={(e) => setRunType(e.target.value)} style={{ ...STYLES.input, width: 'auto' }}>
              {['MONTH_END', 'INTRAMONTH', 'TEST'].map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <button onClick={handleRunECL} disabled={triggerRun.isPending}
              style={{ ...STYLES.btnPrimary, opacity: triggerRun.isPending ? 0.6 : 1 }}>
              {triggerRun.isPending ? 'Starting…' : 'Run ECL'}
            </button>
          </div>
        ) : undefined}
      />

      {activeRunId && runStatus && (
        <div style={{ ...bannerColor, borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
          <span>
            ECL Run <code style={{ fontFamily: 'monospace', fontSize: 11 }}>{activeRunId.slice(0,8)}…</code> — Status: <strong>{runStatus.status}</strong>
            {runStatus.total_ecl != null && ` | Total ECL: ${fmt(runStatus.total_ecl)}`}
          </span>
          <button onClick={() => setActiveRunId(null)} style={{ ...STYLES.btnGhost, padding: '3px 10px', fontSize: 11 }}>Dismiss</button>
        </div>
      )}

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

      {tab === 'results' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[undefined, 1, 2, 3].map((s) => (
              <button key={s ?? 'all'} onClick={() => { setStageFilter(s); setPage(1) }} style={filterBtnStyle(stageFilter === s)}>
                {s == null ? 'All Stages' : `Stage ${s}`}
              </button>
            ))}
          </div>
          <DataTable columns={resultsColumns} data={results?.items ?? []} totalCount={results?.total ?? 0}
            page={page} pageSize={100} onPageChange={setPage} isLoading={resLoading}
            rowKey={(r) => r.ecl_id} emptyMessage="No ECL results for this month. Run the ECL engine first." />
        </div>
      )}

      {tab === 'summary' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            <MetricCard title="Total ECL" value={summary ? fmt(summary.total_ecl) : '—'} variant="primary" loading={sumLoading} />
            <MetricCard title="Stage 1 ECL" value={summary ? fmt(summary.stage1_ecl) : '—'} subtitle={summary ? `${summary.stage1_count.toLocaleString()} loans` : ''} variant="stage1" loading={sumLoading} />
            <MetricCard title="Stage 2 ECL" value={summary ? fmt(summary.stage2_ecl) : '—'} subtitle={summary ? `${summary.stage2_count.toLocaleString()} loans` : ''} variant="stage2" loading={sumLoading} />
            <MetricCard title="Stage 3 ECL" value={summary ? fmt(summary.stage3_ecl) : '—'} subtitle={summary ? `${summary.stage3_count.toLocaleString()} loans` : ''} variant="stage3" loading={sumLoading} />
          </div>

          {!sumLoading && summary && summary.by_segment.length > 0 && (
            <div style={STYLES.card}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 16 }}>ECL by Segment</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={summary.by_segment} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                  <XAxis dataKey="segment_id" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `৳${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Bar dataKey="total_ecl_weighted" name="ECL" fill={COLORS.primary} radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <DataTable columns={segmentColumns} data={summary?.by_segment ?? []} totalCount={summary?.by_segment.length ?? 0}
            page={1} pageSize={summary?.by_segment.length ?? 10} onPageChange={() => {}}
            isLoading={sumLoading} rowKey={(r) => r.segment_id} emptyMessage="No segment data available." />
        </div>
      )}

      {tab === 'parameters' && (
        <div>
          {paramLoading ? (
            <div className="skeleton" style={{ height: 240, borderRadius: 10 }} />
          ) : !parameters || parameters.lgd_parameters.length === 0 ? (
            <div style={{ ...STYLES.card, textAlign: 'center', color: COLORS.textMuted }}>No LGD parameters found for this month.</div>
          ) : (
            <div style={{ ...STYLES.card, padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Segment', 'Security Tier', 'LGD Value', 'Haircut %', 'Active'].map((h) => (
                      <th key={h} style={STYLES.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parameters.lgd_parameters.map((p, idx) => (
                    <tr key={p.lgd_id} style={{ background: idx % 2 === 0 ? '#FFF' : '#FAFBFE' }}>
                      <td style={STYLES.td}><span style={idCell}>{p.segment_id}</span></td>
                      <td style={STYLES.td}>{p.security_tier}</td>
                      <td style={{ ...STYLES.td, fontWeight: 700 }}>{pct(p.lgd_value)}</td>
                      <td style={STYLES.td}>{pct(p.haircut_pct)}</td>
                      <td style={STYLES.td}>
                        {p.is_active
                          ? <span style={badgeStyle(COLORS.success)}>Yes</span>
                          : <span style={{ color: COLORS.textMuted }}>No</span>}
                      </td>
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
