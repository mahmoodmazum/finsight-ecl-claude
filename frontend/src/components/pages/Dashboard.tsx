import { useReportingMonthStore } from '../../stores/reportingMonthStore'
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { MetricCard } from '../shared/MetricCard'
import { SectionHeader } from '../shared/SectionHeader'
import { StatusBadge } from '../shared/StatusBadge'
import { useDashboardSummary } from '../../hooks/useDashboard'
import { COLORS, STYLES, scenarioCardStyle } from '../../styles/design-system'

function fmt(val: number) {
  return `৳${val.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Cr`
}
function fmtAxis(v: number) {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`
  return v.toFixed(0)
}

export function Dashboard() {
  const month = useReportingMonthStore((s) => s.selectedMonth)
  const { data, isLoading, isError, refetch } = useDashboardSummary(month)

  if (isError) {
    return (
      <div style={{
        background: '#FFF5F5', border: `1px solid ${COLORS.danger}18`,
        borderRadius: 8, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{ color: COLORS.danger }}>Failed to load dashboard data.</span>
        <button onClick={() => refetch()} style={{ ...STYLES.btnOutline, color: COLORS.danger, borderColor: COLORS.danger }}>
          Retry
        </button>
      </div>
    )
  }

  const total = parseFloat(String(data?.total_ecl  ?? 0))
  const s1ead = parseFloat(String(data?.stage1_ead ?? 0))
  const s2ead = parseFloat(String(data?.stage2_ead ?? 0))
  const s3ead = parseFloat(String(data?.stage3_ead ?? 0))
  const s1pct = parseFloat(String(data?.stage1_pct ?? 0))
  const s2pct = parseFloat(String(data?.stage2_pct ?? 0))
  const s3pct = parseFloat(String(data?.stage3_pct ?? 0))

  const stageData = [
    { stage: 'Stage 1', ead: parseFloat(String(data?.stage1_ead ?? 0)), fill: COLORS.stage1 },
    { stage: 'Stage 2', ead: parseFloat(String(data?.stage2_ead ?? 0)), fill: COLORS.stage2 },
    { stage: 'Stage 3', ead: parseFloat(String(data?.stage3_ead ?? 0)), fill: COLORS.stage3 },
  ]

  const segmentData = (data?.ecl_by_segment ?? []).map((s) => ({
    segment_id: s.segment_id,
    ecl: parseFloat(String(s.ecl_weighted ?? 0)),
  }))

  const weightMap: Record<string, number> = {}
  ;(data?.scenario_weights ?? []).forEach((sw) => {
    weightMap[sw.scenario_name.toUpperCase()] = parseFloat(String(sw.weight))
  })

  const scenarios = [
    { label: 'Base Case',   key: 'BASE',        color: COLORS.primary },
    { label: 'Optimistic',  key: 'OPTIMISTIC',  color: COLORS.stage1 },
    { label: 'Pessimistic', key: 'PESSIMISTIC', color: COLORS.stage3 },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SectionHeader
        title="ECL Dashboard"
        subtitle={`Reporting Month: ${month.slice(0, 4)}-${month.slice(4)}`}
      />

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <MetricCard title="Total ECL Provision" value={fmt(total)} subtitle="Weighted scenario ECL" variant="primary" loading={isLoading} />
        <MetricCard title="Stage 1 EAD" value={fmt(s1ead)} subtitle={s1pct ? `${s1pct}% of portfolio` : '—'} variant="stage1" loading={isLoading} />
        <MetricCard title="Stage 2 EAD" value={fmt(s2ead)} subtitle={s2pct ? `${s2pct}% of portfolio` : '—'} variant="stage2" loading={isLoading} />
        <MetricCard title="Stage 3 EAD" value={fmt(s3ead)} subtitle={s3pct ? `${s3pct}% of portfolio` : '—'} variant="stage3" loading={isLoading} />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div style={STYLES.card}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 16 }}>Stage Distribution (EAD, Cr)</h3>
          {isLoading ? (
            <div className="skeleton" style={{ height: 200 }} />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stageData} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                <XAxis dataKey="stage" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtAxis} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Bar dataKey="ead" name="EAD" radius={[4, 4, 0, 0]}>
                  {stageData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={STYLES.card}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 16 }}>ECL by Segment (Cr)</h3>
          {isLoading ? (
            <div className="skeleton" style={{ height: 200 }} />
          ) : segmentData.length === 0 ? (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.textMuted, fontSize: 13 }}>
              No segment data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={segmentData} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                <XAxis dataKey="segment_id" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtAxis} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Bar dataKey="ecl" name="ECL" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Scenario weights + Recent runs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20 }}>
        {/* Scenario weights */}
        <div style={STYLES.card}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 16 }}>Scenario Weights</h3>
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 32 }} />)}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {scenarios.map(({ label, key, color }) => {
                const w = (weightMap[key] ?? 0) * 100
                return (
                  <div key={key} style={scenarioCardStyle(color)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: COLORS.text, fontWeight: 600 }}>{label}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color }}>{w.toFixed(0)}%</span>
                    </div>
                    <div style={{ height: 4, background: color + '25', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: `${w}%`, height: '100%', background: color, borderRadius: 2 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent provision runs */}
        <div style={STYLES.card}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 16 }}>Recent Provision Runs</h3>
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 40 }} />)}
            </div>
          ) : (data?.recent_runs ?? []).length === 0 ? (
            <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.textMuted, fontSize: 13 }}>
              No provision runs yet
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Run ID', 'Month', 'Type', 'Status', 'Total ECL'].map((h, i) => (
                    <th key={h} style={{
                      background: COLORS.tableHeader, color: COLORS.textMuted,
                      fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
                      textTransform: 'uppercase', padding: '8px 12px',
                      textAlign: i === 4 ? 'right' : 'left',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data!.recent_runs.map((run, idx) => (
                  <tr key={run.run_id} style={{ background: idx % 2 === 0 ? '#FFF' : '#FAFBFE' }}>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 11, color: COLORS.primary, fontWeight: 600 }}>
                      {run.run_id.slice(0, 8)}…
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 13, color: COLORS.text }}>{run.reporting_month}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13, color: COLORS.text }}>{run.run_type}</td>
                    <td style={{ padding: '10px 12px' }}><StatusBadge status={run.status} size="sm" /></td>
                    <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 700, color: COLORS.primary, textAlign: 'right' }}>
                      {fmt(parseFloat(String(run.total_ecl)))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
