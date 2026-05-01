import { useReportingMonthStore } from '../../stores/reportingMonthStore'
import { useState } from 'react'
import { format } from 'date-fns'
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { MetricCard } from '../shared/MetricCard'
import { SectionHeader } from '../shared/SectionHeader'
import { StatusBadge } from '../shared/StatusBadge'
import { useDashboardSummary } from '../../hooks/useDashboard'


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
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-gray-500 mb-3">Failed to load dashboard data.</p>
        <button onClick={() => refetch()} className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark">
          Retry
        </button>
      </div>
    )
  }

  const total  = parseFloat(String(data?.total_ecl  ?? 0))
  const s1ead  = parseFloat(String(data?.stage1_ead  ?? 0))
  const s2ead  = parseFloat(String(data?.stage2_ead  ?? 0))
  const s3ead  = parseFloat(String(data?.stage3_ead  ?? 0))
  const s1ecl  = parseFloat(String(data?.stage1_ecl  ?? 0))
  const s2ecl  = parseFloat(String(data?.stage2_ecl  ?? 0))
  const s3ecl  = parseFloat(String(data?.stage3_ecl  ?? 0))
  const s1pct  = parseFloat(String(data?.stage1_pct  ?? 0))
  const s2pct  = parseFloat(String(data?.stage2_pct  ?? 0))
  const s3pct  = parseFloat(String(data?.stage3_pct  ?? 0))

  const stageData = [
    { stage: 'Stage 1', ead: s1ead, ecl: s1ecl, fill: '#2DB87A' },
    { stage: 'Stage 2', ead: s2ead, ecl: s2ecl, fill: '#F4A623' },
    { stage: 'Stage 3', ead: s3ead, ecl: s3ecl, fill: '#E84F4F' },
  ]

  // segment chart: rename ecl_weighted -> ecl for the Bar dataKey
  const segmentData = (data?.ecl_by_segment ?? []).map((s) => ({
    segment_id: s.segment_id,
    ecl: parseFloat(String(s.ecl_weighted ?? 0)),
    ead: parseFloat(String(s.ead ?? 0)),
  }))

  // scenario_weights is an array: [{scenario_name, weight, macro_multiplier}]
  const weightMap: Record<string, number> = {}
  ;(data?.scenario_weights ?? []).forEach((sw) => {
    weightMap[sw.scenario_name.toUpperCase()] = parseFloat(String(sw.weight))
  })

  return (
    <div className="space-y-6">
      <SectionHeader
        title="ECL Dashboard"
        subtitle={`Reporting Month: ${month.slice(0, 4)}-${month.slice(4)}`}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          title="Total ECL Provision"
          value={fmt(total)}
          subtitle="Weighted scenario ECL"
          variant="primary"
          loading={isLoading}
        />
        <MetricCard
          title="Stage 1 EAD"
          value={fmt(s1ead)}
          subtitle={s1pct ? `${s1pct}% of portfolio` : '—'}
          variant="stage1"
          loading={isLoading}
        />
        <MetricCard
          title="Stage 2 EAD"
          value={fmt(s2ead)}
          subtitle={s2pct ? `${s2pct}% of portfolio` : '—'}
          variant="stage2"
          loading={isLoading}
        />
        <MetricCard
          title="Stage 3 EAD"
          value={fmt(s3ead)}
          subtitle={s3pct ? `${s3pct}% of portfolio` : '—'}
          variant="stage3"
          loading={isLoading}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Stage distribution */}
        <div className="bg-white rounded-xl border border-app-border p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Stage Distribution (EAD, Cr)</h3>
          {isLoading ? (
            <div className="h-48 bg-gray-50 rounded animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stageData} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F4" />
                <XAxis dataKey="stage" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtAxis} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Bar dataKey="ead" name="EAD" radius={[4, 4, 0, 0]}>
                  {stageData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ECL by segment */}
        <div className="bg-white rounded-xl border border-app-border p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">ECL by Segment (Cr)</h3>
          {isLoading ? (
            <div className="h-48 bg-gray-50 rounded animate-pulse" />
          ) : segmentData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm text-gray-400">
              No segment data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={segmentData} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F4" />
                <XAxis dataKey="segment_id" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtAxis} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Bar dataKey="ecl" name="ECL" fill="#136fff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Scenario weights + Recent runs */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Scenario weights */}
        <div className="bg-white rounded-xl border border-app-border p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Scenario Weights</h3>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {[
                { label: 'Base Case',   key: 'BASE',        color: 'bg-primary' },
                { label: 'Optimistic',  key: 'OPTIMISTIC',  color: 'bg-stage1' },
                { label: 'Pessimistic', key: 'PESSIMISTIC', color: 'bg-stage3' },
              ].map(({ label, key, color }) => {
                const w = (weightMap[key] ?? 0) * 100
                return (
                  <div key={key}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{label}</span>
                      <span className="font-medium text-gray-900">{w.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${color}`} style={{ width: `${w}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent provision runs */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-app-border p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Recent Provision Runs</h3>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}
            </div>
          ) : (data?.recent_runs ?? []).length === 0 ? (
            <div className="flex items-center justify-center h-32 text-sm text-gray-400">
              No provision runs yet
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-app-border">
                  <th className="pb-2 font-medium">Run ID</th>
                  <th className="pb-2 font-medium">Month</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium text-right">Total ECL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {data!.recent_runs.map((run) => (
                  <tr key={run.run_id}>
                    <td className="py-2.5 font-mono text-xs text-gray-500">{run.run_id.slice(0, 8)}…</td>
                    <td className="py-2.5">{run.reporting_month}</td>
                    <td className="py-2.5">{run.run_type}</td>
                    <td className="py-2.5"><StatusBadge status={run.status} size="sm" /></td>
                    <td className="py-2.5 text-right font-medium">{fmt(parseFloat(String(run.total_ecl)))}</td>
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
