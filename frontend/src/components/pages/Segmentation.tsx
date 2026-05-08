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
import { COLORS, STYLES, badgeStyle, idCell } from '../../styles/design-system'

const OBS_WEIGHTS: Record<number, number> = { 1: 0.40, 2: 0.30, 3: 0.20, 4: 0.10 }

type PDForm = {
  segment_id: string; observation_no: number; start_month: string; end_month: string
  total_accounts: string; default_accounts: string; observation_weight: string
}

const emptyPDForm = (segmentId: string): PDForm => ({
  segment_id: segmentId, observation_no: 1, start_month: '', end_month: '',
  total_accounts: '0', default_accounts: '0', observation_weight: '0.40',
})

const pdFromRow = (r: PDParameter): PDForm => ({
  segment_id: r.segment_id, observation_no: r.observation_no,
  start_month: r.start_month, end_month: r.end_month,
  total_accounts: String(r.total_accounts), default_accounts: String(r.default_accounts),
  observation_weight: Number(r.observation_weight).toFixed(2),
})

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 600, color: COLORS.textMuted, marginBottom: 4 }
const modalInputStyle: React.CSSProperties = { ...STYLES.input, padding: '7px 10px' }

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
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(30,42,59,0.45)', backdropFilter: 'blur(2px)' }}>
      <div style={{ background: '#FFFFFF', borderRadius: 12, boxShadow: '0 8px 32px rgba(30,42,59,0.16)', width: '100%', maxWidth: 520, margin: '0 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px', borderBottom: `1px solid ${COLORS.border}` }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: COLORS.text, margin: 0 }}>{editId ? 'Edit' : 'Add'} PD Parameter</h2>
          <button onClick={onClose} style={{ ...STYLES.btnGhost, padding: '4px 8px', fontSize: 16 }}>✕</button>
        </div>
        <div style={{ padding: 28, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Segment</label>
            <select value={form.segment_id} onChange={e => set('segment_id', e.target.value)} style={modalInputStyle}>
              {segments.map(s => <option key={s.segment_id} value={s.segment_id}>{s.segment_id} — {s.segment_name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Observation No.</label>
            <select value={form.observation_no} onChange={e => set('observation_no', Number(e.target.value))} style={modalInputStyle}>
              {[1,2,3,4].map(n => <option key={n} value={n}>Observation {n}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Observation Weight</label>
            <input type="number" step="0.01" min="0" max="1" value={form.observation_weight}
              onChange={e => set('observation_weight', e.target.value)} style={modalInputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Start Month (YYYYMM)</label>
            <input type="text" placeholder="202401" value={form.start_month}
              onChange={e => set('start_month', e.target.value)} style={modalInputStyle} />
          </div>
          <div>
            <label style={labelStyle}>End Month (YYYYMM)</label>
            <input type="text" placeholder="202412" value={form.end_month}
              onChange={e => set('end_month', e.target.value)} style={modalInputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Total Accounts</label>
            <input type="number" min="0" value={form.total_accounts}
              onChange={e => set('total_accounts', e.target.value)} style={modalInputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Default Accounts</label>
            <input type="number" min="0" value={form.default_accounts}
              onChange={e => set('default_accounts', e.target.value)} style={modalInputStyle} />
          </div>
          <div style={{ gridColumn: '1 / -1', background: COLORS.primaryLight, borderRadius: 7, padding: '10px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, color: COLORS.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Raw PD (auto)</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.primary }}>{(rawPD * 100).toFixed(4)}%</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: COLORS.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Weighted PD (auto)</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.primary }}>{(wPD * 100).toFixed(4)}%</div>
            </div>
          </div>
        </div>
        <div style={{ padding: '16px 28px', borderTop: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={STYLES.btnGhost}>Cancel</button>
          <button onClick={() => onSave({
            segment_id: form.segment_id, reporting_month: month,
            observation_no: Number(form.observation_no),
            start_month: form.start_month, end_month: form.end_month,
            total_accounts: parseInt(form.total_accounts) || 0,
            default_accounts: parseInt(form.default_accounts) || 0,
            observation_weight: parseFloat(form.observation_weight) || 0,
          }, editId)} style={STYLES.btnPrimary}>Save</button>
        </div>
      </div>
    </div>
  )
}

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
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(30,42,59,0.45)', backdropFilter: 'blur(2px)' }}>
      <div style={{ background: '#FFFFFF', borderRadius: 12, boxShadow: '0 8px 32px rgba(30,42,59,0.16)', width: '100%', maxWidth: 480, margin: '0 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px', borderBottom: `1px solid ${COLORS.border}` }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: COLORS.text, margin: 0 }}>{editId ? 'Edit' : 'Add'} LGD Rule</h2>
          <button onClick={onClose} style={{ ...STYLES.btnGhost, padding: '4px 8px', fontSize: 16 }}>✕</button>
        </div>
        <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>Segment</label>
            <select value={form.segment_id} onChange={e => set('segment_id', e.target.value)} style={modalInputStyle}>
              {segments.map(s => <option key={s.segment_id} value={s.segment_id}>{s.segment_id} — {s.segment_name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Security Tier</label>
            <select value={form.security_tier} onChange={e => set('security_tier', e.target.value)} style={modalInputStyle}>
              <option value="OVER_SECURED">OVER_SECURED</option>
              <option value="PARTIAL">PARTIAL</option>
              <option value="UNSECURED">UNSECURED</option>
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>LGD Value (%)</label>
              <input type="number" step="0.01" min="0" max="100" value={form.lgd_value}
                onChange={e => set('lgd_value', e.target.value)} style={modalInputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Haircut (%)</label>
              <input type="number" step="0.01" min="0" max="100" value={form.haircut_pct}
                onChange={e => set('haircut_pct', e.target.value)} style={modalInputStyle} />
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: COLORS.text }}>
            <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} />
            Active
          </label>
        </div>
        <div style={{ padding: '16px 28px', borderTop: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={STYLES.btnGhost}>Cancel</button>
          <button onClick={() => onSave({
            segment_id: form.segment_id, reporting_month: month,
            security_tier: form.security_tier,
            lgd_value: parseFloat(form.lgd_value) / 100,
            haircut_pct: parseFloat(form.haircut_pct) / 100,
            is_active: form.is_active,
          }, editId)} style={STYLES.btnPrimary}>Save</button>
        </div>
      </div>
    </div>
  )
}

function ConfirmDelete({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(30,42,59,0.45)', backdropFilter: 'blur(2px)' }}>
      <div style={{ background: '#FFFFFF', borderRadius: 12, boxShadow: '0 8px 32px rgba(30,42,59,0.16)', width: '100%', maxWidth: 400, margin: '0 16px', padding: 28 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: COLORS.text, marginBottom: 8 }}>Confirm Delete</h3>
        <p style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 24 }}>{message}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onCancel} style={STYLES.btnGhost}>Cancel</button>
          <button onClick={onConfirm} style={{ ...STYLES.btnPrimary, background: COLORS.danger }}>Delete</button>
        </div>
      </div>
    </div>
  )
}

export function Segmentation() {
  const [tab, setTab] = useState<'segments' | 'pd' | 'lgd'>('segments')
  const month = useReportingMonthStore((s) => s.selectedMonth)
  const { can } = usePermissions()

  const { data: segments = [], isLoading }     = useSegments()
  const { data: pdParams = [], isLoading: pdLoading }  = usePDParameters(month)
  const { data: lgdRules = [], isLoading: lgdLoading } = useLGDRules(month)

  const createPD = useCreatePDParameter()
  const updatePD = useUpdatePDParameter()
  const deletePD = useDeletePDParameter()
  const createLGD = useCreateLGDParameter()
  const updateLGD = useUpdateLGDParameter()
  const deleteLGD = useDeleteLGDParameter()

  const [pdModal, setPDModal]     = useState<{ editId: string | null; initial: PDForm } | null>(null)
  const [pdDeleteId, setPDDeleteId]   = useState<string | null>(null)
  const [lgdModal, setLGDModal]   = useState<{ editId: string | null; initial: LGDForm } | null>(null)
  const [lgdDeleteId, setLGDDeleteId] = useState<string | null>(null)

  const firstSeg = segments[0]?.segment_id ?? ''

  const handleSavePD = (payload: PDParameterPayload, id: string | null) => {
    if (id) updatePD.mutate({ id, body: payload }, { onSuccess: () => setPDModal(null) })
    else    createPD.mutate(payload,               { onSuccess: () => setPDModal(null) })
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
    else    createLGD.mutate(payload,               { onSuccess: () => setLGDModal(null) })
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

  const tabItems = [
    { key: 'segments', label: 'Segments' },
    { key: 'pd',       label: 'PD Parameters' },
    { key: 'lgd',      label: 'LGD Rules' },
  ]

  const activeTag = (active: boolean) => active
    ? badgeStyle(COLORS.success)
    : badgeStyle(COLORS.textMuted)

  const segmentColumns: ColumnDef<Segment>[] = [
    { key: 'segment_id', header: 'ID', render: (r) => <span style={idCell}>{r.segment_id}</span> },
    { key: 'segment_name', header: 'Segment Name', render: (r) => <span style={{ fontWeight: 600 }}>{r.segment_name}</span> },
    { key: 'assessment_method', header: 'Method' },
    { key: 'collateral_type', header: 'Collateral Type', render: (r) => r.collateral_type ?? '—' },
    { key: 'unsecured_lgd_floor', header: 'LGD Floor', render: (r) => `${(Number(r.unsecured_lgd_floor) * 100).toFixed(1)}%` },
    { key: 'ccf', header: 'CCF', render: (r) => `${(Number(r.ccf) * 100).toFixed(1)}%` },
    { key: 'is_active', header: 'Status', render: (r) => <span style={activeTag(r.is_active)}>{r.is_active ? 'Active' : 'Inactive'}</span> },
  ]

  const pdColumns: ColumnDef<PDParameter>[] = [
    { key: 'segment_id', header: 'Segment', render: (r) => <span style={idCell}>{r.segment_id}</span> },
    { key: 'observation_no', header: 'Obs.', render: (r) => `#${r.observation_no}` },
    { key: 'start_month', header: 'Start Month' },
    { key: 'end_month', header: 'End Month' },
    { key: 'total_accounts', header: 'Total', render: (r) => r.total_accounts.toLocaleString(), headerClassName: 'text-right', className: 'text-right' },
    { key: 'default_accounts', header: 'Defaults', render: (r) => r.default_accounts.toLocaleString(), headerClassName: 'text-right', className: 'text-right' },
    { key: 'raw_pd', header: 'Raw PD', render: (r) => <span style={{ fontWeight: 700 }}>{(Number(r.raw_pd) * 100).toFixed(4)}%</span>, headerClassName: 'text-right', className: 'text-right' },
    { key: 'observation_weight', header: 'Weight', render: (r) => `${(Number(r.observation_weight) * 100).toFixed(0)}%`, headerClassName: 'text-right', className: 'text-right' },
    { key: 'weighted_pd', header: 'Weighted PD', render: (r) => <span style={{ fontWeight: 700, color: COLORS.primary }}>{(Number(r.weighted_pd) * 100).toFixed(4)}%</span>, headerClassName: 'text-right', className: 'text-right' },
    { key: 'actions' as keyof PDParameter, header: '', render: (r) => can('segmentation:edit') ? (
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <button onClick={() => setPDModal({ editId: r.pd_param_id, initial: pdFromRow(r) })} style={{ ...STYLES.btnGhost, padding: '3px 10px', fontSize: 11 }}>Edit</button>
        <button onClick={() => setPDDeleteId(r.pd_param_id)} style={{ ...STYLES.btnGhost, padding: '3px 10px', fontSize: 11, color: COLORS.danger, borderColor: COLORS.danger }}>Del</button>
      </div>
    ) : null },
  ]

  const lgdColumns: ColumnDef<LGDParameter>[] = [
    { key: 'segment_id', header: 'Segment', render: (r) => <span style={idCell}>{r.segment_id}</span> },
    { key: 'security_tier', header: 'Security Tier', render: (r) => <span style={{ fontWeight: 600 }}>{r.security_tier}</span> },
    { key: 'lgd_value', header: 'LGD Value', render: (r) => <span style={{ fontWeight: 700, color: COLORS.primary }}>{(Number(r.lgd_value) * 100).toFixed(2)}%</span>, headerClassName: 'text-right', className: 'text-right' },
    { key: 'haircut_pct', header: 'Haircut %', render: (r) => `${(Number(r.haircut_pct) * 100).toFixed(2)}%`, headerClassName: 'text-right', className: 'text-right' },
    { key: 'is_active', header: 'Active', render: (r) => <span style={activeTag(r.is_active)}>{r.is_active ? 'Yes' : 'No'}</span> },
    { key: 'actions' as keyof LGDParameter, header: '', render: (r) => can('segmentation:edit') ? (
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <button onClick={() => setLGDModal({ editId: r.lgd_id, initial: lgdFromRow(r) })} style={{ ...STYLES.btnGhost, padding: '3px 10px', fontSize: 11 }}>Edit</button>
        <button onClick={() => setLGDDeleteId(r.lgd_id)} style={{ ...STYLES.btnGhost, padding: '3px 10px', fontSize: 11, color: COLORS.danger, borderColor: COLORS.danger }}>Del</button>
      </div>
    ) : null },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {pdModal && <PDModal month={month} segments={segments} initial={pdModal.initial} editId={pdModal.editId} onClose={() => setPDModal(null)} onSave={handleSavePD} />}
      {pdDeleteId && <ConfirmDelete message="Delete this PD parameter? This cannot be undone." onConfirm={() => { deletePD.mutate(pdDeleteId); setPDDeleteId(null) }} onCancel={() => setPDDeleteId(null)} />}
      {lgdModal && <LGDModal month={month} segments={segments} initial={lgdModal.initial} editId={lgdModal.editId} onClose={() => setLGDModal(null)} onSave={handleSaveLGD} />}
      {lgdDeleteId && <ConfirmDelete message="Delete this LGD rule? This cannot be undone." onConfirm={() => { deleteLGD.mutate(lgdDeleteId); setLGDDeleteId(null) }} onCancel={() => setLGDDeleteId(null)} />}

      <SectionHeader title="Segmentation" subtitle={month ? `Reporting Month: ${month.slice(0,4)}-${month.slice(4)}` : 'Loading…'} />

      <div style={{ display: 'flex', gap: 2, borderBottom: `1px solid ${COLORS.border}` }}>
        {tabItems.map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key as typeof tab)} style={{
            padding: '8px 18px', fontSize: 13, fontWeight: 600, border: 'none',
            background: 'transparent', color: tab === key ? COLORS.primary : COLORS.textMuted,
            borderBottom: `2px solid ${tab === key ? COLORS.primary : 'transparent'}`,
            cursor: 'pointer', marginBottom: -1,
          }}>{label}</button>
        ))}
      </div>

      {tab === 'segments' && (
        <DataTable columns={segmentColumns} data={segments} totalCount={segments.length}
          page={1} pageSize={segments.length || 10} onPageChange={() => {}}
          isLoading={isLoading} rowKey={(r) => r.segment_id} emptyMessage="No segments configured." />
      )}

      {tab === 'pd' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {can('segmentation:edit') && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={handleInitializePD} disabled={createPD.isPending || !month}
                style={{ ...STYLES.btnGhost, opacity: createPD.isPending || !month ? 0.5 : 1 }}>
                Initialize for {month}
              </button>
              <button onClick={() => setPDModal({ editId: null, initial: emptyPDForm(firstSeg) })} style={STYLES.btnPrimary}>
                + Add PD Parameter
              </button>
            </div>
          )}
          <DataTable columns={pdColumns} data={pdParams} totalCount={pdParams.length}
            page={1} pageSize={pdParams.length || 50} onPageChange={() => {}}
            isLoading={pdLoading} rowKey={(r) => r.pd_param_id}
            emptyMessage={month ? `No PD parameters found for ${month}` : 'Select a reporting month.'} />

          {pdParams.length > 0 && (
            <div style={{ ...STYLES.card, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '12px 20px', borderBottom: `1px solid ${COLORS.border}`, background: COLORS.bg }}>
                <h3 style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, margin: 0 }}>Weighted PD Summary by Segment</h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Segment', 'Obs 1 PD', 'Obs 2 PD', 'Obs 3 PD', 'Obs 4 PD', 'Final Weighted PD'].map((h, i) => (
                        <th key={h} style={{ ...STYLES.th, textAlign: i > 0 ? 'right' : 'left' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {segments.map((seg, idx) => {
                      const rows = pdParams.filter(p => p.segment_id === seg.segment_id)
                      if (!rows.length) return null
                      const byObs = Object.fromEntries(rows.map(r => [r.observation_no, r]))
                      const finalPD = rows.reduce((sum, r) => sum + Number(r.weighted_pd), 0)
                      return (
                        <tr key={seg.segment_id} style={{ background: idx % 2 === 0 ? '#FFF' : '#FAFBFE' }}>
                          <td style={STYLES.td}><span style={idCell}>{seg.segment_id}</span></td>
                          {[1,2,3,4].map(n => (
                            <td key={n} style={{ ...STYLES.td, textAlign: 'right' }}>
                              {byObs[n] ? `${(Number(byObs[n].raw_pd) * 100).toFixed(4)}%` : '—'}
                            </td>
                          ))}
                          <td style={{ ...STYLES.td, textAlign: 'right', fontWeight: 700, color: COLORS.primary }}>
                            {(finalPD * 100).toFixed(4)}%
                          </td>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {can('segmentation:edit') && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={handleInitializeLGD} disabled={createLGD.isPending || !month}
                style={{ ...STYLES.btnGhost, opacity: createLGD.isPending || !month ? 0.5 : 1 }}>
                Initialize for {month}
              </button>
              <button onClick={() => setLGDModal({ editId: null, initial: emptyLGDForm(firstSeg) })} style={STYLES.btnPrimary}>
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
