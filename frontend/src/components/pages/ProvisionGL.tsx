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
import { COLORS, STYLES, idCell, badgeStyle } from '../../styles/design-system'

function fmt(v: number) { return `৳${Number(v).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Cr` }
function fmtDate(d: string | null) { if (!d) return '—'; try { return format(parseISO(d), 'dd MMM yyyy HH:mm') } catch { return d } }

type Tab = 'runs' | 'movement' | 'gl'

export function ProvisionGL() {
  const [tab, setTab]               = useState<Tab>('runs')
  const month                       = useReportingMonthStore((s) => s.selectedMonth)
  const [page, setPage]             = useState(1)
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const { can }                     = usePermissions()

  const { data: runs, isLoading: runsLoading }   = useProvisionRuns(month, undefined, page, 20)
  const { data: movement, isLoading: movLoading } = useRunMovement(selectedRunId ?? '')
  const { data: glEntries, isLoading: glLoading } = useGLEntries(selectedRunId ?? '')
  const submitRun  = useSubmitRun()
  const approveRun = useApproveRun()
  const lockRun    = useLockRun()

  const TABS = [
    { key: 'runs',     label: 'Provision Runs' },
    { key: 'movement', label: 'Movement Waterfall' },
    { key: 'gl',       label: 'GL Entries' },
  ]

  const runColumns: ColumnDef<ProvisionRun>[] = [
    { key: 'run_id', header: 'Run ID', render: (r) => (
      <button onClick={() => setSelectedRunId(r.run_id)}
        style={{ fontFamily: 'monospace', fontSize: 11, color: COLORS.primary, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
        {r.run_id.slice(0, 8)}…
      </button>
    )},
    { key: 'reporting_month', header: 'Month' },
    { key: 'run_type', header: 'Type' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} size="sm" /> },
    { key: 'total_ecl', header: 'Total ECL', render: (r) => <span style={{ fontWeight: 700, color: COLORS.primary }}>{fmt(r.total_ecl)}</span>, headerClassName: 'text-right', className: 'text-right' },
    { key: 'initiated_at', header: 'Initiated', render: (r) => fmtDate(r.initiated_at) },
    {
      key: 'actions', header: '',
      render: (r) => (
        <div style={{ display: 'flex', gap: 6 }}>
          {can('provision:approve') && r.status === 'DRAFT' && (
            <button onClick={() => submitRun.mutate(r.run_id)} disabled={submitRun.isPending}
              style={{ ...STYLES.btnGhost, padding: '3px 10px', fontSize: 11, opacity: submitRun.isPending ? 0.5 : 1 }}>Submit</button>
          )}
          {can('provision:approve') && r.status === 'PENDING_APPROVAL' && (
            <button onClick={() => approveRun.mutate(r.run_id)} disabled={approveRun.isPending}
              style={{ ...STYLES.btnPrimary, background: COLORS.success, padding: '3px 10px', fontSize: 11, opacity: approveRun.isPending ? 0.5 : 1 }}>Approve</button>
          )}
          {can('provision:lock') && r.status === 'APPROVED' && (
            <button onClick={() => lockRun.mutate(r.run_id)} disabled={lockRun.isPending}
              style={{ ...STYLES.btnPrimary, background: COLORS.text, padding: '3px 10px', fontSize: 11, opacity: lockRun.isPending ? 0.5 : 1 }}>Lock</button>
          )}
        </div>
      ),
    },
  ]

  const movementColumns: ColumnDef<ProvisionMovement>[] = [
    { key: 'movement_type', header: 'Movement Type', render: (r) => <span style={badgeStyle(COLORS.teal)}>{r.movement_type}</span> },
    { key: 'account_count', header: 'Accounts', render: (r) => r.account_count.toLocaleString(), headerClassName: 'text-right', className: 'text-right' },
    { key: 'amount', header: 'Amount', render: (r) => (
      <span style={{ fontWeight: 700, color: r.amount >= 0 ? COLORS.danger : COLORS.success }}>{fmt(r.amount)}</span>
    ), headerClassName: 'text-right', className: 'text-right' },
    { key: 'notes', header: 'Notes', render: (r) => <span style={{ fontSize: 12, color: COLORS.textMuted }}>{r.notes ?? '—'}</span> },
  ]

  const glColumns: ColumnDef<GLEntry>[] = [
    { key: 'entry_date', header: 'Date' },
    { key: 'entry_type', header: 'Type', render: (r) => <span style={badgeStyle(COLORS.teal)}>{r.entry_type}</span> },
    { key: 'dr_account', header: 'Dr Account', render: (r) => <code style={{ fontSize: 11, color: COLORS.danger }}>{r.dr_account}</code> },
    { key: 'cr_account', header: 'Cr Account', render: (r) => <code style={{ fontSize: 11, color: COLORS.success }}>{r.cr_account}</code> },
    { key: 'amount', header: 'Amount', render: (r) => <span style={{ fontWeight: 700 }}>{fmt(r.amount)}</span>, headerClassName: 'text-right', className: 'text-right' },
    { key: 'currency', header: 'Ccy' },
    { key: 'posted', header: 'Posted', render: (r) => r.posted
      ? <span style={badgeStyle(COLORS.success)}>Yes</span>
      : <span style={{ color: COLORS.textMuted, fontSize: 12 }}>No</span> },
  ]

  const runIndicator = selectedRunId && (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 13, color: COLORS.textMuted }}>Run:</span>
      <code style={{ fontFamily: 'monospace', fontSize: 11, background: COLORS.bg, padding: '3px 8px', borderRadius: 4 }}>{selectedRunId}</code>
      <button onClick={() => setSelectedRunId(null)} style={{ ...STYLES.btnGhost, padding: '2px 8px', fontSize: 11, color: COLORS.danger, borderColor: COLORS.danger }}>✕ Clear</button>
    </div>
  )

  const noRunSelected = (label: string) => (
    <div style={{ ...STYLES.card, textAlign: 'center', color: COLORS.textMuted }}>
      Select a run from the <button onClick={() => setTab('runs')} style={{ color: COLORS.primary, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontSize: 13 }}>Provision Runs</button> tab to view {label}.
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SectionHeader title="Provision & GL" subtitle="Provision runs, movement waterfall, and journal entries" />

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

      {tab === 'runs' && (
        <DataTable columns={runColumns} data={runs?.items ?? []} totalCount={runs?.total ?? 0}
          page={page} pageSize={20} onPageChange={setPage} isLoading={runsLoading}
          rowKey={(r) => r.run_id} emptyMessage="No provision runs for this month." />
      )}

      {tab === 'movement' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!selectedRunId ? noRunSelected('movement waterfall') : (
            <>
              {runIndicator}
              {!movLoading && movement && movement.length > 0 && (
                <div style={STYLES.card}>
                  <h3 style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 16 }}>ECL Movement Waterfall</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={movement} barSize={32}>
                      <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                      <XAxis dataKey="movement_type" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `৳${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => fmt(v)} />
                      <Bar dataKey="amount" name="Amount" fill={COLORS.primary} radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <DataTable columns={movementColumns} data={movement ?? []} totalCount={movement?.length ?? 0}
                page={1} pageSize={movement?.length ?? 10} onPageChange={() => {}}
                isLoading={movLoading} rowKey={(r) => r.movement_id} emptyMessage="No movement data for this run." />
            </>
          )}
        </div>
      )}

      {tab === 'gl' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!selectedRunId ? noRunSelected('GL entries') : (
            <>
              {runIndicator}
              <DataTable columns={glColumns} data={glEntries ?? []} totalCount={glEntries?.length ?? 0}
                page={1} pageSize={glEntries?.length ?? 10} onPageChange={() => {}}
                isLoading={glLoading} rowKey={(r) => r.entry_id} emptyMessage="No GL entries for this run." />
            </>
          )}
        </div>
      )}
    </div>
  )
}
