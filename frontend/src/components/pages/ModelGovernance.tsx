import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { SectionHeader } from '../shared/SectionHeader'
import { StatusBadge } from '../shared/StatusBadge'
import { DataTable, type ColumnDef } from '../shared/DataTable'
import { useMLModels, useApproveModel, useBacktesting, useRoadmap, useCreateModel } from '../../hooks/useGovernance'
import { usePermissions } from '../../hooks/usePermissions'
import type { MLModel, MLModelCreate } from '../../types'
import { COLORS, STYLES, badgeStyle, idCell } from '../../styles/design-system'

function fmtDate(d: string | null) { if (!d) return '—'; try { return format(parseISO(d), 'dd MMM yyyy') } catch { return d } }
function pct(v: number | null) { return v != null ? `${(Number(v) * 100).toFixed(2)}%` : '—' }

type Tab = 'models' | 'backtesting' | 'roadmap'

const MODEL_TYPES = ['', 'PD', 'LGD', 'EAD', 'MACRO']
const emptyForm: MLModelCreate = { model_id: '', model_name: '', model_type: 'PD', version: '1.0', method: '', notes: '' }

const statusColor: Record<string, string> = {
  DEVELOPMENT: COLORS.warning,
  VALIDATION:  COLORS.primary,
  PRODUCTION:  COLORS.success,
  RETIRED:     COLORS.textMuted,
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: COLORS.textMuted, marginBottom: 6 }

const TABS = [
  { key: 'models',      label: 'Model Registry' },
  { key: 'backtesting', label: 'Backtesting' },
  { key: 'roadmap',     label: 'Roadmap' },
]

export function ModelGovernance() {
  const [tab, setTab]           = useState<Tab>('models')
  const [typeFilter, setTypeFilter] = useState('')
  const [showModal, setShowModal]   = useState(false)
  const [form, setForm]             = useState<MLModelCreate>(emptyForm)
  const { can }                 = usePermissions()

  const { data: models,     isLoading }        = useMLModels(typeFilter || undefined)
  const { data: backtesting, isLoading: btLoading }     = useBacktesting(typeFilter || undefined)
  const { data: roadmap,    isLoading: roadmapLoading } = useRoadmap()
  const approveModel = useApproveModel()
  const createModel  = useCreateModel()

  async function handleCreate() {
    await createModel.mutateAsync({ ...form, method: form.method || undefined, notes: form.notes || undefined })
    setShowModal(false)
    setForm(emptyForm)
  }

  const filterBtnStyle = (active: boolean): React.CSSProperties => ({
    ...active ? STYLES.btnPrimary : STYLES.btnGhost,
    padding: '4px 14px', fontSize: 11,
  })

  const modelColumns: ColumnDef<MLModel>[] = [
    { key: 'model_id',   header: 'Model ID', render: (r) => <span style={idCell}>{r.model_id}</span> },
    { key: 'model_name', header: 'Name',     render: (r) => <span style={{ fontWeight: 600, color: COLORS.text }}>{r.model_name}</span> },
    { key: 'model_type', header: 'Type',     render: (r) => <span style={badgeStyle(COLORS.teal)}>{r.model_type}</span> },
    { key: 'method',     header: 'Method',   render: (r) => r.method ?? '—' },
    { key: 'version',    header: 'Version',  render: (r) => <code style={{ fontFamily: 'monospace', fontSize: 11 }}>{r.version}</code> },
    { key: 'status',     header: 'Status',   render: (r) => <span style={badgeStyle(statusColor[r.status] ?? COLORS.textMuted)}>{r.status}</span> },
    {
      key: 'actions', header: '',
      render: (r) => can('governance:model:edit') && r.status !== 'PRODUCTION' && r.status !== 'RETIRED' ? (
        <button onClick={() => approveModel.mutate(r.model_id)} disabled={approveModel.isPending}
          style={{ ...STYLES.btnPrimary, background: COLORS.success, padding: '3px 10px', fontSize: 11, opacity: approveModel.isPending ? 0.5 : 1 }}>Approve</button>
      ) : null,
    },
  ]

  const btColumns: ColumnDef<MLModel>[] = [
    { key: 'model_id',   header: 'Model ID', render: (r) => <span style={idCell}>{r.model_id}</span> },
    { key: 'model_name', header: 'Name' },
    { key: 'model_type', header: 'Type',    render: (r) => <span style={badgeStyle(COLORS.teal)}>{r.model_type}</span> },
    { key: 'version',    header: 'Version', render: (r) => <code style={{ fontFamily: 'monospace', fontSize: 11 }}>{r.version}</code> },
    { key: 'gini_coefficient', header: 'Gini', render: (r) => (
      <span style={{ fontWeight: 700, color: r.gini_coefficient != null && Number(r.gini_coefficient) >= 0.3 ? COLORS.success : COLORS.warning }}>
        {pct(r.gini_coefficient)}
      </span>
    ), headerClassName: 'text-right', className: 'text-right' },
    { key: 'ks_statistic', header: 'KS Stat', render: (r) => pct(r.ks_statistic), headerClassName: 'text-right', className: 'text-right' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} size="sm" /> },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SectionHeader
        title="Model Governance"
        subtitle="ML model registry, backtesting, and development roadmap"
        actions={can('governance:model:create') ? (
          <button onClick={() => setShowModal(true)} style={STYLES.btnPrimary}>+ Register Model</button>
        ) : undefined}
      />

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

      {(tab === 'models' || tab === 'backtesting') && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {MODEL_TYPES.map((t) => (
            <button key={t || 'all'} onClick={() => setTypeFilter(t)} style={filterBtnStyle(typeFilter === t)}>
              {t || 'All Types'}
            </button>
          ))}
        </div>
      )}

      {tab === 'models' && (
        <DataTable columns={modelColumns} data={models ?? []} totalCount={models?.length ?? 0}
          page={1} pageSize={models?.length ?? 10} onPageChange={() => {}}
          isLoading={isLoading} rowKey={(r) => r.model_id} emptyMessage="No models in registry." />
      )}

      {tab === 'backtesting' && (
        <DataTable columns={btColumns} data={backtesting ?? []} totalCount={backtesting?.length ?? 0}
          page={1} pageSize={backtesting?.length ?? 10} onPageChange={() => {}}
          isLoading={btLoading} rowKey={(r) => r.model_id} emptyMessage="No models in validation or production." />
      )}

      {tab === 'roadmap' && (
        <div>
          {roadmapLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 56, borderRadius: 8 }} />)}
            </div>
          ) : !roadmap || roadmap.length === 0 ? (
            <div style={{ ...STYLES.card, textAlign: 'center', color: COLORS.textMuted }}>No roadmap data available.</div>
          ) : (
            <div style={{ ...STYLES.card, padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Model ID', 'Name', 'Type', 'Version', 'Status'].map((h) => (
                      <th key={h} style={STYLES.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {roadmap.map((m, idx) => (
                    <tr key={m.model_id} style={{ background: idx % 2 === 0 ? '#FFF' : '#FAFBFE' }}>
                      <td style={STYLES.td}><span style={idCell}>{m.model_id}</span></td>
                      <td style={{ ...STYLES.td, fontWeight: 600 }}>{m.model_name}</td>
                      <td style={STYLES.td}><span style={badgeStyle(COLORS.teal)}>{m.model_type}</span></td>
                      <td style={STYLES.td}><code style={{ fontFamily: 'monospace', fontSize: 11 }}>{m.version}</code></td>
                      <td style={STYLES.td}><span style={badgeStyle(statusColor[m.current_status] ?? COLORS.textMuted)}>{m.current_status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(30,42,59,0.45)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#FFFFFF', borderRadius: 12, boxShadow: '0 8px 32px rgba(30,42,59,0.16)', width: '100%', maxWidth: 480, margin: '0 16px', padding: 28 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: COLORS.text, marginBottom: 20 }}>Register New Model</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Model ID <span style={{ color: COLORS.danger }}>*</span></label>
                  <input value={form.model_id} onChange={(e) => setForm({ ...form, model_id: e.target.value })} style={STYLES.input} placeholder="PD_CORP_V3" />
                </div>
                <div>
                  <label style={labelStyle}>Type</label>
                  <select value={form.model_type} onChange={(e) => setForm({ ...form, model_type: e.target.value })} style={STYLES.input}>
                    {['PD', 'LGD', 'EAD', 'MACRO'].map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Model Name <span style={{ color: COLORS.danger }}>*</span></label>
                <input value={form.model_name} onChange={(e) => setForm({ ...form, model_name: e.target.value })} style={STYLES.input} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Version <span style={{ color: COLORS.danger }}>*</span></label>
                  <input value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} style={STYLES.input} placeholder="1.0" />
                </div>
                <div>
                  <label style={labelStyle}>Method</label>
                  <input value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} style={STYLES.input} placeholder="Logistic Regression" />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Notes</label>
                <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  style={{ ...STYLES.input, resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24, paddingTop: 16, borderTop: `1px solid ${COLORS.border}` }}>
              <button onClick={() => { setShowModal(false); setForm(emptyForm) }} style={STYLES.btnGhost}>Cancel</button>
              <button onClick={handleCreate} disabled={createModel.isPending || !form.model_id || !form.model_name || !form.version}
                style={{ ...STYLES.btnPrimary, opacity: createModel.isPending || !form.model_id || !form.model_name || !form.version ? 0.5 : 1 }}>
                {createModel.isPending ? 'Registering…' : 'Register Model'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
