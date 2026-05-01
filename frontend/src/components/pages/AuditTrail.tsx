import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { SectionHeader } from '../shared/SectionHeader'
import { DataTable, type ColumnDef } from '../shared/DataTable'
import { useAuditLog, useRiskRegister, useCreateRisk, useUpdateRisk, useDeleteRisk } from '../../hooks/useAudit'
import { usePermissions } from '../../hooks/usePermissions'
import type { AuditLog, RiskRegister, RiskCreate } from '../../types'

function fmtDate(d: string) { try { return format(parseISO(d), 'dd MMM yyyy HH:mm') } catch { return d } }

type Tab = 'log' | 'risks'

const RISK_RATINGS = ['HIGH', 'MEDIUM', 'LOW']
const RISK_CATEGORIES = ['MODEL', 'DATA', 'OPERATIONAL', 'REGULATORY', 'MARKET', 'CREDIT']
const RISK_STATUSES = ['OPEN', 'IN_PROGRESS', 'CLOSED', 'ACCEPTED']

const emptyRisk: RiskCreate = { risk_title: '', category: 'MODEL', rating: 'MEDIUM', description: '', mitigation: '' }

const ratingColor: Record<string, string> = {
  HIGH: 'bg-red-50 text-red-700 border-red-200',
  MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
  LOW: 'bg-green-50 text-green-700 border-green-200',
}

const statusColor: Record<string, string> = {
  OPEN: 'bg-red-50 text-red-700 border-red-200',
  IN_PROGRESS: 'bg-blue-50 text-blue-700 border-blue-200',
  CLOSED: 'bg-gray-100 text-gray-500 border-gray-200',
  ACCEPTED: 'bg-green-50 text-green-700 border-green-200',
}

export function AuditTrail() {
  const [tab, setTab] = useState<Tab>('log')
  const [logPage, setLogPage] = useState(1)
  const [eventTypeFilter, setEventTypeFilter] = useState('')
  const [entityTypeFilter, setEntityTypeFilter] = useState('')
  const [showRiskModal, setShowRiskModal] = useState(false)
  const [editRisk, setEditRisk] = useState<RiskRegister | null>(null)
  const [riskForm, setRiskForm] = useState<RiskCreate>(emptyRisk)
  const [riskStatusFilter, setRiskStatusFilter] = useState('')
  const { can } = usePermissions()

  const { data: logData, isLoading: logLoading } = useAuditLog(
    eventTypeFilter || undefined,
    entityTypeFilter || undefined,
    undefined,
    logPage,
    50
  )
  const { data: risks, isLoading: risksLoading } = useRiskRegister(riskStatusFilter || undefined)
  const createRisk = useCreateRisk()
  const updateRisk = useUpdateRisk()
  const deleteRisk = useDeleteRisk()

  function openCreateModal() { setEditRisk(null); setRiskForm(emptyRisk); setShowRiskModal(true) }
  function openEditModal(r: RiskRegister) {
    setEditRisk(r)
    setRiskForm({ risk_title: r.risk_title, category: r.category, rating: r.rating, description: r.description ?? '', mitigation: r.mitigation ?? '' })
    setShowRiskModal(true)
  }

  async function handleSaveRisk() {
    if (editRisk) {
      await updateRisk.mutateAsync({ risk_id: editRisk.risk_id, body: riskForm })
    } else {
      await createRisk.mutateAsync(riskForm)
    }
    setShowRiskModal(false)
  }

  const logColumns: ColumnDef<AuditLog>[] = [
    { key: 'log_id', header: 'ID', render: (r) => <span className="font-mono text-xs text-gray-500">{r.log_id}</span> },
    { key: 'event_at', header: 'Timestamp', render: (r) => <span className="text-xs">{fmtDate(r.event_at)}</span> },
    { key: 'event_type', header: 'Event', render: (r) => <span className="text-xs font-medium bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{r.event_type}</span> },
    { key: 'entity_type', header: 'Entity Type', render: (r) => <span className="text-xs">{r.entity_type}</span> },
    { key: 'entity_id', header: 'Entity ID', render: (r) => <code className="text-xs text-gray-600 truncate max-w-xs block">{r.entity_id}</code> },
    { key: 'user_id', header: 'User', render: (r) => r.user_id ? <code className="text-xs">{r.user_id.slice(0,8)}…</code> : <span className="text-gray-400">—</span> },
  ]

  const riskColumns: ColumnDef<RiskRegister>[] = [
    { key: 'risk_title', header: 'Title', render: (r) => <span className="font-medium text-gray-900">{r.risk_title}</span> },
    { key: 'category', header: 'Category', render: (r) => <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{r.category}</span> },
    {
      key: 'rating', header: 'Rating',
      render: (r) => <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${ratingColor[r.rating] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>{r.rating}</span>,
    },
    {
      key: 'status', header: 'Status',
      render: (r) => <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${statusColor[r.status] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>{r.status}</span>,
    },
    { key: 'owner', header: 'Owner', render: (r) => r.owner ?? '—' },
    { key: 'target_date', header: 'Target Date', render: (r) => r.target_date ?? '—' },
    {
      key: 'actions', header: '',
      render: (r) => can('audit:register:edit') ? (
        <div className="flex gap-1.5">
          <button onClick={() => openEditModal(r)} className="px-2 py-1 text-xs border border-app-border rounded hover:bg-gray-50">Edit</button>
          <button onClick={() => deleteRisk.mutate(r.risk_id)} disabled={deleteRisk.isPending} className="px-2 py-1 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50 disabled:opacity-50">Delete</button>
        </div>
      ) : null,
    },
  ]

  return (
    <div className="space-y-6">
      <SectionHeader title="Audit Trail" subtitle="Immutable audit log and risk register" />

      <div className="flex gap-1 border-b border-app-border">
        {([
          { key: 'log', label: 'Audit Log' },
          { key: 'risks', label: 'Risk Register' },
        ] as { key: Tab; label: string }[]).map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === key ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'log' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <input
              value={eventTypeFilter}
              onChange={(e) => { setEventTypeFilter(e.target.value); setLogPage(1) }}
              placeholder="Filter by event type…"
              className="px-3 py-1.5 text-sm border border-app-border rounded-lg w-52 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <input
              value={entityTypeFilter}
              onChange={(e) => { setEntityTypeFilter(e.target.value); setLogPage(1) }}
              placeholder="Filter by entity type…"
              className="px-3 py-1.5 text-sm border border-app-border rounded-lg w-52 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <DataTable
            columns={logColumns}
            data={logData?.items ?? []}
            totalCount={logData?.total ?? 0}
            page={logPage}
            pageSize={50}
            onPageChange={setLogPage}
            isLoading={logLoading}
            rowKey={(r) => r.log_id}
            emptyMessage="No audit log entries match the filters."
          />
        </div>
      )}

      {tab === 'risks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex gap-2 flex-wrap">
              {['', ...RISK_STATUSES].map((s) => (
                <button key={s || 'all'} onClick={() => setRiskStatusFilter(s)}
                  className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${riskStatusFilter === s ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-app-border hover:bg-gray-50'}`}>
                  {s || 'All'}
                </button>
              ))}
            </div>
            {can('audit:register:edit') && (
              <button onClick={openCreateModal} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark">+ Add Risk</button>
            )}
          </div>
          <DataTable
            columns={riskColumns}
            data={risks ?? []}
            totalCount={risks?.length ?? 0}
            page={1}
            pageSize={risks?.length ?? 10}
            onPageChange={() => {}}
            isLoading={risksLoading}
            rowKey={(r) => r.risk_id}
            emptyMessage="No risk items found."
          />
        </div>
      )}

      {/* Risk Modal */}
      {showRiskModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-5">{editRisk ? 'Edit Risk Item' : 'Add Risk Item'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
                <input value={riskForm.risk_title} onChange={(e) => setRiskForm({ ...riskForm, risk_title: e.target.value })} className="w-full px-3 py-2 text-sm border border-app-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select value={riskForm.category} onChange={(e) => setRiskForm({ ...riskForm, category: e.target.value })} className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30">
                    {RISK_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
                  <select value={riskForm.rating} onChange={(e) => setRiskForm({ ...riskForm, rating: e.target.value })} className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30">
                    {RISK_RATINGS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea rows={2} value={riskForm.description} onChange={(e) => setRiskForm({ ...riskForm, description: e.target.value })} className="w-full px-3 py-2 text-sm border border-app-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mitigation</label>
                <textarea rows={2} value={riskForm.mitigation} onChange={(e) => setRiskForm({ ...riskForm, mitigation: e.target.value })} className="w-full px-3 py-2 text-sm border border-app-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowRiskModal(false)} className="px-4 py-2 text-sm border border-app-border rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleSaveRisk} disabled={(createRisk.isPending || updateRisk.isPending) || !riskForm.risk_title.trim()} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50">
                {createRisk.isPending || updateRisk.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
