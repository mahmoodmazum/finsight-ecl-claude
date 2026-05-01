import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { SectionHeader } from '../shared/SectionHeader'
import { StatusBadge } from '../shared/StatusBadge'
import { DataTable, type ColumnDef } from '../shared/DataTable'
import { useMLModels, useApproveModel, useBacktesting, useRoadmap, useCreateModel } from '../../hooks/useGovernance'
import { usePermissions } from '../../hooks/usePermissions'
import type { MLModel, MLModelCreate } from '../../types'

function fmtDate(d: string | null) { if (!d) return '—'; try { return format(parseISO(d), 'dd MMM yyyy') } catch { return d } }
function pct(v: number | null) { return v != null ? `${(Number(v) * 100).toFixed(2)}%` : '—' }

type Tab = 'models' | 'backtesting' | 'roadmap'

const MODEL_TYPES = ['', 'PD', 'LGD', 'EAD', 'MACRO']
const emptyForm: MLModelCreate = { model_id: '', model_name: '', model_type: 'PD', version: '1.0', method: '', notes: '' }

const statusColor: Record<string, string> = {
  DEVELOPMENT: 'bg-amber-50 text-amber-700 border-amber-200',
  VALIDATION: 'bg-blue-50 text-blue-700 border-blue-200',
  PRODUCTION: 'bg-green-50 text-green-700 border-green-200',
  RETIRED: 'bg-gray-100 text-gray-500 border-gray-200',
}

export function ModelGovernance() {
  const [tab, setTab] = useState<Tab>('models')
  const [typeFilter, setTypeFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<MLModelCreate>(emptyForm)
  const { can } = usePermissions()

  const { data: models, isLoading } = useMLModels(typeFilter || undefined)
  const { data: backtesting, isLoading: btLoading } = useBacktesting(typeFilter || undefined)
  const { data: roadmap, isLoading: roadmapLoading } = useRoadmap()
  const approveModel = useApproveModel()
  const createModel = useCreateModel()

  async function handleCreate() {
    await createModel.mutateAsync({ ...form, method: form.method || undefined, notes: form.notes || undefined })
    setShowModal(false)
    setForm(emptyForm)
  }

  const modelColumns: ColumnDef<MLModel>[] = [
    { key: 'model_id', header: 'Model ID', render: (r) => <code className="text-xs font-medium text-primary">{r.model_id}</code> },
    { key: 'model_name', header: 'Name', render: (r) => <span className="font-medium text-gray-900">{r.model_name}</span> },
    { key: 'model_type', header: 'Type', render: (r) => <span className="text-xs font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{r.model_type}</span> },
    { key: 'method', header: 'Method', render: (r) => r.method ?? '—' },
    { key: 'version', header: 'Version', render: (r) => <code className="text-xs">{r.version}</code> },
    {
      key: 'status', header: 'Status',
      render: (r) => <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${statusColor[r.status] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>{r.status}</span>,
    },
    {
      key: 'actions', header: '',
      render: (r) => can('governance:model:edit') && r.status !== 'PRODUCTION' && r.status !== 'RETIRED' ? (
        <button onClick={() => approveModel.mutate(r.model_id)} disabled={approveModel.isPending} className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">Approve</button>
      ) : null,
    },
  ]

  const btColumns: ColumnDef<MLModel>[] = [
    { key: 'model_id', header: 'Model ID', render: (r) => <code className="text-xs font-medium text-primary">{r.model_id}</code> },
    { key: 'model_name', header: 'Name' },
    { key: 'model_type', header: 'Type', render: (r) => <span className="text-xs font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{r.model_type}</span> },
    { key: 'version', header: 'Version', render: (r) => <code className="text-xs">{r.version}</code> },
    { key: 'gini_coefficient', header: 'Gini', render: (r) => <span className={`font-medium ${r.gini_coefficient != null && Number(r.gini_coefficient) >= 0.3 ? 'text-green-700' : 'text-amber-700'}`}>{pct(r.gini_coefficient)}</span>, headerClassName: 'text-right', className: 'text-right' },
    { key: 'ks_statistic', header: 'KS Stat', render: (r) => pct(r.ks_statistic), headerClassName: 'text-right', className: 'text-right' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} size="sm" /> },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SectionHeader title="Model Governance" subtitle="ML model registry, backtesting, and development roadmap" />
        {can('governance:model:create') && (
          <button onClick={() => setShowModal(true)} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark">
            + Register Model
          </button>
        )}
      </div>

      <div className="flex gap-1 border-b border-app-border">
        {([
          { key: 'models', label: 'Model Registry' },
          { key: 'backtesting', label: 'Backtesting' },
          { key: 'roadmap', label: 'Roadmap' },
        ] as { key: Tab; label: string }[]).map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === key ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Type filter */}
      {(tab === 'models' || tab === 'backtesting') && (
        <div className="flex gap-2 flex-wrap">
          {MODEL_TYPES.map((t) => (
            <button key={t || 'all'} onClick={() => setTypeFilter(t)}
              className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${typeFilter === t ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-app-border hover:bg-gray-50'}`}>
              {t || 'All Types'}
            </button>
          ))}
        </div>
      )}

      {tab === 'models' && (
        <DataTable columns={modelColumns} data={models ?? []} totalCount={models?.length ?? 0} page={1} pageSize={models?.length ?? 10} onPageChange={() => {}} isLoading={isLoading} rowKey={(r) => r.model_id} emptyMessage="No models in registry." />
      )}

      {tab === 'backtesting' && (
        <DataTable columns={btColumns} data={backtesting ?? []} totalCount={backtesting?.length ?? 0} page={1} pageSize={backtesting?.length ?? 10} onPageChange={() => {}} isLoading={btLoading} rowKey={(r) => r.model_id} emptyMessage="No models in validation or production." />
      )}

      {tab === 'roadmap' && (
        <div>
          {roadmapLoading ? (
            <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}</div>
          ) : !roadmap || roadmap.length === 0 ? (
            <div className="bg-white rounded-xl border border-app-border p-8 text-center text-sm text-gray-400">No roadmap data available.</div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-app-border">
              <table className="min-w-full divide-y divide-app-border">
                <thead className="bg-gray-50">
                  <tr>
                    {['Model ID', 'Name', 'Type', 'Version', 'Status'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-app-border">
                  {roadmap.map((m) => (
                    <tr key={m.model_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3"><code className="text-xs font-medium text-primary">{m.model_id}</code></td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{m.model_name}</td>
                      <td className="px-4 py-3 text-sm"><span className="text-xs font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{m.model_type}</span></td>
                      <td className="px-4 py-3 text-sm"><code className="text-xs">{m.version}</code></td>
                      <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${statusColor[m.current_status] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>{m.current_status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Create Model Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-5">Register New Model</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Model ID <span className="text-red-500">*</span></label>
                  <input value={form.model_id} onChange={(e) => setForm({ ...form, model_id: e.target.value })} className="w-full px-3 py-2 text-sm border border-app-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="PD_CORP_V3" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select value={form.model_type} onChange={(e) => setForm({ ...form, model_type: e.target.value })} className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30">
                    {['PD', 'LGD', 'EAD', 'MACRO'].map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Model Name <span className="text-red-500">*</span></label>
                <input value={form.model_name} onChange={(e) => setForm({ ...form, model_name: e.target.value })} className="w-full px-3 py-2 text-sm border border-app-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Version <span className="text-red-500">*</span></label>
                  <input value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} className="w-full px-3 py-2 text-sm border border-app-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="1.0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
                  <input value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} className="w-full px-3 py-2 text-sm border border-app-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Logistic Regression" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 text-sm border border-app-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => { setShowModal(false); setForm(emptyForm) }} className="px-4 py-2 text-sm border border-app-border rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleCreate} disabled={createModel.isPending || !form.model_id || !form.model_name || !form.version} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50">
                {createModel.isPending ? 'Registering…' : 'Register Model'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
