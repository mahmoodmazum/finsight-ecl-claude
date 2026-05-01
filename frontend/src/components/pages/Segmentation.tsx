import { useReportingMonthStore } from '../../stores/reportingMonthStore'
import { useState } from 'react'
import { SectionHeader } from '../shared/SectionHeader'
import { DataTable, type ColumnDef } from '../shared/DataTable'
import {
  useSegments,
  usePDParameters, useCreatePDParameter, useUpdatePDParameter, useDeletePDParameter,
  useLGDRules, useCreateLGDParameter, useUpdateLGDParameter, useDeleteLGDParameter,
} from '../../hooks/useSegmentation'
import { usePermissions } from '../../hooks/usePermissions'
import type { Segment, PDParameter, LGDParameter } from '../../types'
import type { PDParameterPayload, LGDParameterPayload } from '../../api/segmentation'

// ─── PD Parameter Modal ──────────────────────────────────────────────────────

const OBS_WEIGHTS: Record<number, number> = { 1: 0.40, 2: 0.30, 3: 0.20, 4: 0.10 }

type PDForm = {
  segment_id: string
  observation_no: number
  start_month: string
  end_month: string
  total_accounts: string
  default_accounts: string
  observation_weight: string
}

const emptyPDForm = (segmentId: string): PDForm => ({
  segment_id: segmentId,
  observation_no: 1,
  start_month: '',
  end_month: '',
  total_accounts: '0',
  default_accounts: '0',
  observation_weight: '0.40',
})

const pdFromRow = (r: PDParameter): PDForm => ({
  segment_id: r.segment_id,
  observation_no: r.observation_no,
  start_month: r.start_month,
  end_month: r.end_month,
  total_accounts: String(r.total_accounts),
  default_accounts: String(r.default_accounts),
  observation_weight: Number(r.observation_weight).toFixed(2),
})

function PDModal({ month, segments, initial, editId, onClose, onSave }: {
  month: string; segments: Segment[]; initial: PDForm; editId: string | null
  onClose: () => void; onSave: (p: PDParameterPayload, id: string | null) => void
}) {
  const [form, setForm] = useState<PDForm>(initial)
  const set = (k: keyof PDForm, v: string | number) => setForm(f => {
    const next = { ...f, [k]: v }
    if (k === 'observation_no') next.observation_weight = String(OBS_WEIGHTS[Number(v)] ?? 0.10)
    return next
  })
  const total = parseInt(form.total_accounts) || 0
  const defs  = parseInt(form.default_accounts) || 0
  const wt    = parseFloat(form.observation_weight) || 0
  const rawPD = total > 0 ? defs / total : 0
  const wPD   = rawPD * wt

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-app-border">
          <h2 className="text-base font-semibold text-gray-900">{editId ? 'Edit' : 'Add'} PD Parameter</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Segment</label>
              <select value={form.segment_id} onChange={e => set('segment_id', e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-app-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30">
                {segments.map(s => <option key={s.segment_id} value={s.segment_id}>{s.segment_id} — {s.segment_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Observation No.</label>
              <select value={form.observation_no} onChange={e => set('observation_no', Number(e.target.value))}
                className="w-full px-3 py-1.5 text-sm border border-app-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30">
                {[1,2,3,4].map(n => <option key={n} value={n}>Observation {n}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Observation Weight</label>
              <input type="number" step="0.01" min="0" max="1" value={form.observation_weight}
                onChange={e => set('observation_weight', e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-app-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start Month (YYYYMM)</label>
              <input type="text" placeholder="202401" value={form.start_month}
                onChange={e => set('start_month', e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-app-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">End Month (YYYYMM)</label>
              <input type="text" placeholder="202412" value={form.end_month}
                onChange={e => set('end_month', e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-app-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Total Accounts</label>
              <input type="number" min="0" value={form.total_accounts}
                onChange={e => set('total_accounts', e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-app-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Default Accounts</label>
              <input type="number" min="0" value={form.default_accounts}
                onChange={e => set('default_accounts', e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-app-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 bg-primary/5 rounded-lg p-3 border border-primary/10">
            <div>
              <div className="text-xs text-gray-500">Raw PD (auto)</div>
              <div className="text-sm font-bold text-primary">{(rawPD * 100).toFixed(4)}%</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Weighted PD (auto)</div>
              <div className="text-sm font-bold text-primary">{(wPD * 100).toFixed(4)}%</div>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-app-border flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={() => onSave({
            segment_id: form.segment_id, reporting_month: month,
            observation_no: Number(form.observation_no),
            start_month: form.start_month, end_month: form.end_month,
            total_accounts: parseInt(form.total_accounts) || 0,
            default_accounts: parseInt(form.default_accounts) || 0,
            observation_weight: parseFloat(form.observation_weight) || 0,
          }, editId)} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark">Save</button>
        </div>
      </div>
    </div>
  )
}

// ─── LGD Parameter Modal ─────────────────────────────────────────────────────

type LGDForm = { segment_id: string; security_tier: string; lgd_value: string; haircut_pct: string; is_active: boolean }

const emptyLGDForm = (segmentId: string): LGDForm => ({
  segment_id: segmentId, security_tier: 'UNSECURED', lgd_value: '45.00', haircut_pct: '0.00', is_active: true,
})

const lgdFromRow = (r: LGDParameter): LGDForm => ({
  segment_id: r.segment_id, security_tier: r.security_tier,
  lgd_value: (Number(r.lgd_value) * 100).toFixed(2),
  haircut_pct: (Number(r.haircut_pct) * 100).toFixed(2),
  is_active: r.is_active,
})

function LGDModal({ month, segments, initial, editId, onClose, onSave }: {
  month: string; segments: Segment[]; initial: LGDForm; editId: string | null
  onClose: () => void; onSave: (p: LGDParameterPayload, id: string | null) => void
}) {
  const [form, setForm] = useState<LGDForm>(initial)
  const set = (k: keyof LGDForm, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-app-border">
          <h2 className="text-base font-semibold text-gray-900">{editId ? 'Edit' : 'Add'} LGD Rule</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Segment</label>
            <select value={form.segment_id} onChange={e => set('segment_id', e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-app-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30">
              {segments.map(s => <option key={s.segment_id} value={s.segment_id}>{s.segment_id} — {s.segment_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Security Tier</label>
            <select value={form.security_tier} onChange={e => set('security_tier', e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-app-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="OVER_SECURED">OVER_SECURED</option>
              <option value="PARTIAL">PARTIAL</option>
              <option value="UNSECURED">UNSECURED</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">LGD Value (%)</label>
              <input type="number" step="0.01" min="0" max="100" value={form.lgd_value}
                onChange={e => set('lgd_value', e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-app-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Haircut (%)</label>
              <input type="number" step="0.01" min="0" max="100" value={form.haircut_pct}
                onChange={e => set('haircut_pct', e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-app-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-primary" />
            <span className="text-sm text-gray-700">Active</span>
          </label>
        </div>
        <div className="px-6 py-4 border-t border-app-border flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={() => onSave({
            segment_id: form.segment_id, reporting_month: month,
            security_tier: form.security_tier,
            lgd_value: parseFloat(form.lgd_value) / 100,
            haircut_pct: parseFloat(form.haircut_pct) / 100,
            is_active: form.is_active,
          }, editId)} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark">Save</button>
        </div>
      </div>
    </div>
  )
}

// ─── Confirm Delete ───────────────────────────────────────────────────────────

function ConfirmDelete({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-2">Confirm Delete</h3>
        <p className="text-sm text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function Segmentation() {
  const [tab, setTab] = useState<'segments' | 'pd' | 'lgd'>('segments')
  const month = useReportingMonthStore((s) => s.selectedMonth)
  const { can } = usePermissions()

  const { data: segments = [], isLoading } = useSegments()
  const { data: pdParams = [], isLoading: pdLoading } = usePDParameters(month)
  const { data: lgdRules = [], isLoading: lgdLoading } = useLGDRules(month)

  const createPD = useCreatePDParameter()
  const updatePD = useUpdatePDParameter()
  const deletePD = useDeletePDParameter()
  const createLGD = useCreateLGDParameter()
  const updateLGD = useUpdateLGDParameter()
  const deleteLGD = useDeleteLGDParameter()

  const [pdModal, setPDModal]   = useState<{ editId: string | null; initial: PDForm } | null>(null)
  const [pdDeleteId, setPDDeleteId] = useState<string | null>(null)
  const [lgdModal, setLGDModal] = useState<{ editId: string | null; initial: LGDForm } | null>(null)
  const [lgdDeleteId, setLGDDeleteId] = useState<string | null>(null)

  const firstSeg = segments[0]?.segment_id ?? ''

  const handleSavePD = (payload: PDParameterPayload, id: string | null) => {
    if (id) updatePD.mutate({ id, body: payload }, { onSuccess: () => setPDModal(null) })
    else     createPD.mutate(payload,               { onSuccess: () => setPDModal(null) })
  }

  const handleInitializePD = async () => {
    if (!month || !segments.length) return
    for (const seg of segments)
      for (let obs = 1; obs <= 4; obs++)
        await createPD.mutateAsync({ segment_id: seg.segment_id, reporting_month: month, observation_no: obs,
          start_month: '', end_month: '', total_accounts: 0, default_accounts: 0, observation_weight: OBS_WEIGHTS[obs] })
  }

  const handleSaveLGD = (payload: LGDParameterPayload, id: string | null) => {
    if (id) updateLGD.mutate({ id, body: payload }, { onSuccess: () => setLGDModal(null) })
    else     createLGD.mutate(payload,               { onSuccess: () => setLGDModal(null) })
  }

  const handleInitializeLGD = async () => {
    if (!month || !segments.length) return
    const defaults = [
      { security_tier: 'OVER_SECURED', lgd_value: 0.10, haircut_pct: 0.30 },
      { security_tier: 'PARTIAL',      lgd_value: 0.35, haircut_pct: 0.15 },
      { security_tier: 'UNSECURED',    lgd_value: 0.65, haircut_pct: 0.00 },
    ]
    for (const seg of segments)
      for (const d of defaults)
        await createLGD.mutateAsync({ segment_id: seg.segment_id, reporting_month: month, ...d, is_active: true })
  }

  // Columns
  const segmentColumns: ColumnDef<Segment>[] = [
    { key: 'segment_id', header: 'ID', render: (r) => <code className="text-xs font-medium text-primary bg-primary/5 px-2 py-0.5 rounded">{r.segment_id}</code> },
    { key: 'segment_name', header: 'Segment Name', render: (r) => <span className="font-medium text-gray-900">{r.segment_name}</span> },
    { key: 'assessment_method', header: 'Method' },
    { key: 'collateral_type', header: 'Collateral Type', render: (r) => r.collateral_type ?? '—' },
    { key: 'unsecured_lgd_floor', header: 'LGD Floor', render: (r) => `${(Number(r.unsecured_lgd_floor) * 100).toFixed(1)}%` },
    { key: 'ccf', header: 'CCF', render: (r) => `${(Number(r.ccf) * 100).toFixed(1)}%` },
    { key: 'is_active', header: 'Status', render: (r) => <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${r.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>{r.is_active ? 'Active' : 'Inactive'}</span> },
  ]

  const pdColumns: ColumnDef<PDParameter>[] = [
    { key: 'segment_id', header: 'Segment', render: (r) => <code className="text-xs font-medium text-primary bg-primary/5 px-2 py-0.5 rounded">{r.segment_id}</code> },
    { key: 'observation_no', header: 'Obs.', render: (r) => `#${r.observation_no}` },
    { key: 'start_month', header: 'Start Month' },
    { key: 'end_month', header: 'End Month' },
    { key: 'total_accounts', header: 'Total', render: (r) => r.total_accounts.toLocaleString(), headerClassName: 'text-right', className: 'text-right' },
    { key: 'default_accounts', header: 'Defaults', render: (r) => r.default_accounts.toLocaleString(), headerClassName: 'text-right', className: 'text-right' },
    { key: 'raw_pd', header: 'Raw PD', render: (r) => `${(Number(r.raw_pd) * 100).toFixed(4)}%`, headerClassName: 'text-right', className: 'text-right font-medium' },
    { key: 'observation_weight', header: 'Weight', render: (r) => `${(Number(r.observation_weight) * 100).toFixed(0)}%`, headerClassName: 'text-right', className: 'text-right' },
    { key: 'weighted_pd', header: 'Weighted PD', render: (r) => `${(Number(r.weighted_pd) * 100).toFixed(4)}%`, headerClassName: 'text-right', className: 'text-right font-semibold text-primary' },
    { key: 'actions' as keyof PDParameter, header: '', render: (r) => can('segmentation:edit') ? (
      <div className="flex gap-1 justify-end">
        <button onClick={() => setPDModal({ editId: r.pd_param_id, initial: pdFromRow(r) })} className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50">Edit</button>
        <button onClick={() => setPDDeleteId(r.pd_param_id)} className="px-2 py-1 text-xs border border-red-200 text-red-600 rounded hover:bg-red-50">Del</button>
      </div>
    ) : null },
  ]

  const lgdColumns: ColumnDef<LGDParameter>[] = [
    { key: 'segment_id', header: 'Segment', render: (r) => <code className="text-xs font-medium text-primary bg-primary/5 px-2 py-0.5 rounded">{r.segment_id}</code> },
    { key: 'security_tier', header: 'Security Tier', render: (r) => <span className="font-medium">{r.security_tier}</span> },
    { key: 'lgd_value', header: 'LGD Value', render: (r) => `${(Number(r.lgd_value) * 100).toFixed(2)}%`, headerClassName: 'text-right', className: 'text-right font-medium' },
    { key: 'haircut_pct', header: 'Haircut %', render: (r) => `${(Number(r.haircut_pct) * 100).toFixed(2)}%`, headerClassName: 'text-right', className: 'text-right' },
    { key: 'is_active', header: 'Active', render: (r) => <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${r.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>{r.is_active ? 'Yes' : 'No'}</span> },
    { key: 'actions' as keyof LGDParameter, header: '', render: (r) => can('segmentation:edit') ? (
      <div className="flex gap-1 justify-end">
        <button onClick={() => setLGDModal({ editId: r.lgd_id, initial: lgdFromRow(r) })} className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50">Edit</button>
        <button onClick={() => setLGDDeleteId(r.lgd_id)} className="px-2 py-1 text-xs border border-red-200 text-red-600 rounded hover:bg-red-50">Del</button>
      </div>
    ) : null },
  ]

  return (
    <div className="space-y-6">
      {pdModal && <PDModal month={month} segments={segments} initial={pdModal.initial} editId={pdModal.editId} onClose={() => setPDModal(null)} onSave={handleSavePD} />}
      {pdDeleteId && <ConfirmDelete message="Delete this PD parameter? This cannot be undone." onConfirm={() => { deletePD.mutate(pdDeleteId); setPDDeleteId(null) }} onCancel={() => setPDDeleteId(null)} />}
      {lgdModal && <LGDModal month={month} segments={segments} initial={lgdModal.initial} editId={lgdModal.editId} onClose={() => setLGDModal(null)} onSave={handleSaveLGD} />}
      {lgdDeleteId && <ConfirmDelete message="Delete this LGD rule? This cannot be undone." onConfirm={() => { deleteLGD.mutate(lgdDeleteId); setLGDDeleteId(null) }} onCancel={() => setLGDDeleteId(null)} />}

      <SectionHeader title="Segmentation" subtitle={month ? `Reporting Month: ${month.slice(0,4)}-${month.slice(4)}` : 'Loading...'} />

      <div className="flex gap-1 border-b border-app-border">
        {[{ key: 'segments', label: 'Segments' }, { key: 'pd', label: 'PD Parameters' }, { key: 'lgd', label: 'LGD Rules' }].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key as typeof tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === key ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'segments' && (
        <DataTable columns={segmentColumns} data={segments} totalCount={segments.length}
          page={1} pageSize={segments.length || 10} onPageChange={() => {}}
          isLoading={isLoading} rowKey={(r) => r.segment_id} emptyMessage="No segments configured." />
      )}

      {tab === 'pd' && (
        <div className="space-y-4">
          {can('segmentation:edit') && (
            <div className="flex gap-2 justify-end">
              <button onClick={handleInitializePD} disabled={createPD.isPending || !month}
                className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50">
                Initialize for {month}
              </button>
              <button onClick={() => setPDModal({ editId: null, initial: emptyPDForm(firstSeg) })}
                className="px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary-dark">
                + Add PD Parameter
              </button>
            </div>
          )}
          <DataTable columns={pdColumns} data={pdParams} totalCount={pdParams.length}
            page={1} pageSize={pdParams.length || 50} onPageChange={() => {}}
            isLoading={pdLoading} rowKey={(r) => r.pd_param_id}
            emptyMessage={month ? `No PD parameters found for ${month}` : 'Select a reporting month.'} />

          {pdParams.length > 0 && (
            <div className="bg-white rounded-xl border border-app-border overflow-hidden">
              <div className="px-4 py-3 border-b border-app-border bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-700">Weighted PD Summary by Segment</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 border-b border-app-border">
                      <th className="px-4 py-2 font-medium">Segment</th>
                      {[1,2,3,4].map(n => <th key={n} className="px-4 py-2 font-medium text-right">Obs {n} PD</th>)}
                      <th className="px-4 py-2 font-medium text-right">Final Weighted PD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-app-border">
                    {segments.map(seg => {
                      const rows = pdParams.filter(p => p.segment_id === seg.segment_id)
                      if (!rows.length) return null
                      const byObs = Object.fromEntries(rows.map(r => [r.observation_no, r]))
                      const finalPD = rows.reduce((sum, r) => sum + Number(r.weighted_pd), 0)
                      return (
                        <tr key={seg.segment_id}>
                          <td className="px-4 py-2"><code className="text-xs font-medium text-primary bg-primary/5 px-2 py-0.5 rounded">{seg.segment_id}</code></td>
                          {[1,2,3,4].map(n => (
                            <td key={n} className="px-4 py-2 text-right text-gray-700">
                              {byObs[n] ? `${(Number(byObs[n].raw_pd) * 100).toFixed(4)}%` : '—'}
                            </td>
                          ))}
                          <td className="px-4 py-2 text-right font-bold text-primary">{(finalPD * 100).toFixed(4)}%</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'lgd' && (
        <div className="space-y-4">
          {can('segmentation:edit') && (
            <div className="flex gap-2 justify-end">
              <button onClick={handleInitializeLGD} disabled={createLGD.isPending || !month}
                className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50">
                Initialize for {month}
              </button>
              <button onClick={() => setLGDModal({ editId: null, initial: emptyLGDForm(firstSeg) })}
                className="px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary-dark">
                + Add LGD Rule
              </button>
            </div>
          )}
          <DataTable columns={lgdColumns} data={lgdRules} totalCount={lgdRules.length}
            page={1} pageSize={lgdRules.length || 50} onPageChange={() => {}}
            isLoading={lgdLoading} rowKey={(r) => r.lgd_id}
            emptyMessage={month ? `No LGD parameters found for ${month}` : 'Select a reporting month.'} />
        </div>
      )}
    </div>
  )
}
