import { useReportingMonthStore } from '../../stores/reportingMonthStore'
import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { SectionHeader } from '../shared/SectionHeader'
import { StatusBadge } from '../shared/StatusBadge'
import { DataTable, type ColumnDef } from '../shared/DataTable'
import { useProvisionRuns, useSubmitRun, useApproveRun, useLockRun, useRunMovement, useGLEntries } from '../../hooks/useProvision'
import { usePermissions } from '../../hooks/usePermissions'
import type { ProvisionRun, ProvisionMovement, GLEntry } from '../../types'

function fmt(v: number) { return `৳${Number(v).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Cr` }
function fmtDate(d: string | null) { if (!d) return '—'; try { return format(parseISO(d), 'dd MMM yyyy HH:mm') } catch { return d } }

type Tab = 'runs' | 'movement' | 'gl'

export function ProvisionGL() {
  const [tab, setTab] = useState<Tab>('runs')
  const month = useReportingMonthStore((s) => s.selectedMonth)
  const [page, setPage] = useState(1)
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const { can } = usePermissions()

  const { data: runs, isLoading: runsLoading } = useProvisionRuns(month, undefined, page, 20)
  const { data: movement, isLoading: movLoading } = useRunMovement(selectedRunId ?? '')
  const { data: glEntries, isLoading: glLoading } = useGLEntries(selectedRunId ?? '')
  const submitRun = useSubmitRun()
  const approveRun = useApproveRun()
  const lockRun = useLockRun()

  const runColumns: ColumnDef<ProvisionRun>[] = [
    {
      key: 'run_id', header: 'Run ID',
      render: (r) => (
        <button onClick={() => setSelectedRunId(r.run_id)} className="font-mono text-xs text-primary hover:underline">
          {r.run_id.slice(0, 8)}…
        </button>
      ),
    },
    { key: 'reporting_month', header: 'Month' },
    { key: 'run_type', header: 'Type' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} size="sm" /> },
    { key: 'total_ecl', header: 'Total ECL', render: (r) => <span className="font-medium">{fmt(r.total_ecl)}</span>, headerClassName: 'text-right', className: 'text-right' },
    { key: 'initiated_at', header: 'Initiated', render: (r) => fmtDate(r.initiated_at) },
    {
      key: 'actions', header: '',
      render: (r) => (
        <div className="flex gap-1.5">
          {can('provision:approve') && r.status === 'DRAFT' && (
            <button onClick={() => submitRun.mutate(r.run_id)} disabled={submitRun.isPending} className="px-2 py-1 text-xs border border-app-border rounded hover:bg-gray-50 disabled:opacity-50">Submit</button>
          )}
          {can('provision:approve') && r.status === 'PENDING_APPROVAL' && (
            <button onClick={() => approveRun.mutate(r.run_id)} disabled={approveRun.isPending} className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">Approve</button>
          )}
          {can('provision:lock') && r.status === 'APPROVED' && (
            <button onClick={() => lockRun.mutate(r.run_id)} disabled={lockRun.isPending} className="px-2 py-1 text-xs bg-gray-800 text-white rounded hover:bg-gray-900 disabled:opacity-50">Lock</button>
          )}
        </div>
      ),
    },
  ]

  const movementColumns: ColumnDef<ProvisionMovement>[] = [
    { key: 'movement_type', header: 'Movement Type', render: (r) => <span className="text-xs font-medium bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{r.movement_type}</span> },
    { key: 'account_count', header: 'Accounts', render: (r) => r.account_count.toLocaleString(), headerClassName: 'text-right', className: 'text-right' },
    {
      key: 'amount', header: 'Amount',
      render: (r) => <span className={`font-medium ${r.amount >= 0 ? 'text-red-600' : 'text-green-600'}`}>{fmt(r.amount)}</span>,
      headerClassName: 'text-right', className: 'text-right',
    },
    { key: 'notes', header: 'Notes', render: (r) => <span className="text-xs text-gray-500">{r.notes ?? '—'}</span> },
  ]

  const glColumns: ColumnDef<GLEntry>[] = [
    { key: 'entry_date', header: 'Date' },
    { key: 'entry_type', header: 'Type', render: (r) => <span className="text-xs font-medium bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{r.entry_type}</span> },
    { key: 'dr_account', header: 'Dr Account', render: (r) => <code className="text-xs">{r.dr_account}</code> },
    { key: 'cr_account', header: 'Cr Account', render: (r) => <code className="text-xs">{r.cr_account}</code> },
    { key: 'amount', header: 'Amount', render: (r) => <span className="font-medium">{fmt(r.amount)}</span>, headerClassName: 'text-right', className: 'text-right' },
    { key: 'currency', header: 'Ccy' },
    { key: 'posted', header: 'Posted', render: (r) => r.posted ? <span className="text-green-600 text-xs font-medium">Yes</span> : <span className="text-gray-400 text-xs">No</span> },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SectionHeader title="Provision & GL" subtitle="Provision runs, movement waterfall, and journal entries" />
      </div>

      <div className="flex gap-1 border-b border-app-border">
        {([
          { key: 'runs', label: 'Provision Runs' },
          { key: 'movement', label: 'Movement Waterfall' },
          { key: 'gl', label: 'GL Entries' },
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

      {tab === 'runs' && (
        <DataTable
          columns={runColumns}
          data={runs?.items ?? []}
          totalCount={runs?.total ?? 0}
          page={page}
          pageSize={20}
          onPageChange={setPage}
          isLoading={runsLoading}
          rowKey={(r) => r.run_id}
          emptyMessage="No provision runs for this month."
        />
      )}

      {tab === 'movement' && (
        <div className="space-y-4">
          {!selectedRunId ? (
            <div className="bg-white rounded-xl border border-app-border p-8 text-center text-sm text-gray-400">
              Select a run from the <button onClick={() => setTab('runs')} className="text-primary hover:underline">Provision Runs</button> tab to view movement waterfall.
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Run:</span>
                <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">{selectedRunId}</code>
                <button onClick={() => setSelectedRunId(null)} className="text-xs text-gray-400 hover:text-gray-600">✕ Clear</button>
              </div>
              {!movLoading && movement && movement.length > 0 && (
                <div className="bg-white rounded-xl border border-app-border p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">ECL Movement Waterfall</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={movement} barSize={32}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F4" />
                      <XAxis dataKey="movement_type" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `৳${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => fmt(v)} />
                      <Bar dataKey="amount" name="Amount" fill="#136fff" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <DataTable
                columns={movementColumns}
                data={movement ?? []}
                totalCount={movement?.length ?? 0}
                page={1}
                pageSize={movement?.length ?? 10}
                onPageChange={() => {}}
                isLoading={movLoading}
                rowKey={(r) => r.movement_id}
                emptyMessage="No movement data for this run."
              />
            </>
          )}
        </div>
      )}

      {tab === 'gl' && (
        <div className="space-y-4">
          {!selectedRunId ? (
            <div className="bg-white rounded-xl border border-app-border p-8 text-center text-sm text-gray-400">
              Select a run from the <button onClick={() => setTab('runs')} className="text-primary hover:underline">Provision Runs</button> tab to view GL entries.
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Run:</span>
                <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">{selectedRunId}</code>
                <button onClick={() => setSelectedRunId(null)} className="text-xs text-gray-400 hover:text-gray-600">✕ Clear</button>
              </div>
              <DataTable
                columns={glColumns}
                data={glEntries ?? []}
                totalCount={glEntries?.length ?? 0}
                page={1}
                pageSize={glEntries?.length ?? 10}
                onPageChange={() => {}}
                isLoading={glLoading}
                rowKey={(r) => r.entry_id}
                emptyMessage="No GL entries for this run."
              />
            </>
          )}
        </div>
      )}
    </div>
  )
}
