import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { SectionHeader } from '../shared/SectionHeader'
import { DataTable, type ColumnDef } from '../shared/DataTable'
import { useOverlays, useSubmitOverlay, useApproveOverlay, useRejectOverlay, useExpireOverlay } from '../../hooks/useOverlays'
import { usePermissions } from '../../hooks/usePermissions'
import type { ManagementOverlay, OverlayCreate } from '../../types'
import { COLORS, STYLES, badgeStyle } from '../../styles/design-system'

function fmtDate(d: string | null) { if (!d) return '—'; try { return format(parseISO(d), 'dd MMM yyyy') } catch { return d } }

const OVERLAY_TYPES = ['CURE_RATE', 'SEGMENT_FACTOR', 'RATING', 'STAGE', 'PD_CAP_FLOOR', 'LGD_HAIRCUT', 'SCENARIO_WEIGHT', 'SECTOR', 'PORTFOLIO']
const STATUS_FILTERS = ['', 'PENDING', 'APPROVED', 'REJECTED', 'EXPIRED']

const emptyForm: OverlayCreate = { loan_id: '', segment_id: '', overlay_type: 'SEGMENT_FACTOR', adjustment_factor: 1, rationale: '', effective_from: '', effective_to: '' }

const statusColor: Record<string, string> = {
  PENDING:  COLORS.warning,
  APPROVED: COLORS.success,
  REJECTED: COLORS.danger,
  EXPIRED:  COLORS.textMuted,
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: COLORS.textMuted, marginBottom: 6 }

export function ManagementOverlays() {
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<OverlayCreate>(emptyForm)
  const { can } = usePermissions()

  const { data, isLoading } = useOverlays(statusFilter || undefined, undefined, page, 50)
  const submitOverlay  = useSubmitOverlay()
  const approveOverlay = useApproveOverlay()
  const rejectOverlay  = useRejectOverlay()
  const expireOverlay  = useExpireOverlay()

  async function handleSubmit() {
    const payload: OverlayCreate = {
      overlay_type:      form.overlay_type,
      adjustment_factor: Number(form.adjustment_factor),
      rationale:         form.rationale,
      effective_from:    form.effective_from,
      ...(form.loan_id     ? { loan_id:     form.loan_id }     : {}),
      ...(form.segment_id  ? { segment_id:  form.segment_id }  : {}),
      ...(form.effective_to ? { effective_to: form.effective_to } : {}),
    }
    await submitOverlay.mutateAsync(payload)
    setShowModal(false)
    setForm(emptyForm)
  }

  const filterBtnStyle = (active: boolean): React.CSSProperties => ({
    ...active ? STYLES.btnPrimary : STYLES.btnGhost,
    padding: '4px 14px', fontSize: 11,
  })

  const columns: ColumnDef<ManagementOverlay>[] = [
    { key: 'overlay_id', header: 'ID', render: (r) => <code style={{ fontFamily: 'monospace', fontSize: 11, color: COLORS.textMuted }}>{r.overlay_id.slice(0,8)}…</code> },
    { key: 'overlay_type', header: 'Type', render: (r) => <span style={badgeStyle(COLORS.teal)}>{r.overlay_type}</span> },
    { key: 'loan_id', header: 'Loan / Segment', render: (r) => r.loan_id ?? r.segment_id ?? '—' },
    { key: 'adjustment_factor', header: 'Factor', render: (r) => <span style={{ fontWeight: 700 }}>{Number(r.adjustment_factor).toFixed(6)}</span>, headerClassName: 'text-right', className: 'text-right' },
    { key: 'effective_from', header: 'Period', render: (r) => `${r.effective_from}${r.effective_to ? ` → ${r.effective_to}` : '+'}` },
    { key: 'status', header: 'Status', render: (r) => <span style={badgeStyle(statusColor[r.status] ?? COLORS.textMuted)}>{r.status}</span> },
    { key: 'submitted_at', header: 'Submitted', render: (r) => fmtDate(r.submitted_at) },
    {
      key: 'actions', header: '',
      render: (r) => (
        <div style={{ display: 'flex', gap: 6 }}>
          {can('overlays:approve') && r.status === 'PENDING' && (
            <>
              <button onClick={() => approveOverlay.mutate(r.overlay_id)} disabled={approveOverlay.isPending}
                style={{ ...STYLES.btnPrimary, background: COLORS.success, padding: '3px 10px', fontSize: 11, opacity: approveOverlay.isPending ? 0.5 : 1 }}>Approve</button>
              <button onClick={() => rejectOverlay.mutate(r.overlay_id)} disabled={rejectOverlay.isPending}
                style={{ ...STYLES.btnPrimary, background: COLORS.danger, padding: '3px 10px', fontSize: 11, opacity: rejectOverlay.isPending ? 0.5 : 1 }}>Reject</button>
            </>
          )}
          {can('overlays:expire') && r.status === 'APPROVED' && (
            <button onClick={() => expireOverlay.mutate(r.overlay_id)} disabled={expireOverlay.isPending}
              style={{ ...STYLES.btnGhost, padding: '3px 10px', fontSize: 11, opacity: expireOverlay.isPending ? 0.5 : 1 }}>Expire</button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SectionHeader
        title="Management Overlays"
        subtitle="Expert judgement adjustments to ECL parameters"
        actions={can('overlays:submit') ? (
          <button onClick={() => setShowModal(true)} style={STYLES.btnPrimary}>+ New Overlay</button>
        ) : undefined}
      />

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {STATUS_FILTERS.map((s) => (
          <button key={s || 'all'} onClick={() => { setStatusFilter(s); setPage(1) }} style={filterBtnStyle(statusFilter === s)}>
            {s || 'All'}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        totalCount={data?.total ?? 0}
        page={page}
        pageSize={50}
        onPageChange={setPage}
        isLoading={isLoading}
        rowKey={(r) => r.overlay_id}
        emptyMessage="No overlays found."
      />

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(30,42,59,0.45)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#FFFFFF', borderRadius: 12, boxShadow: '0 8px 32px rgba(30,42,59,0.16)', width: '100%', maxWidth: 520, margin: '0 16px', padding: 28, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: COLORS.text, marginBottom: 20 }}>Submit Management Overlay</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Loan ID</label>
                  <input value={form.loan_id} onChange={(e) => setForm({ ...form, loan_id: e.target.value })} style={STYLES.input} placeholder="Optional" />
                </div>
                <div>
                  <label style={labelStyle}>Segment ID</label>
                  <input value={form.segment_id} onChange={(e) => setForm({ ...form, segment_id: e.target.value })} style={STYLES.input} placeholder="Optional" />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Overlay Type</label>
                <select value={form.overlay_type} onChange={(e) => setForm({ ...form, overlay_type: e.target.value })} style={STYLES.input}>
                  {OVERLAY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Adjustment Factor</label>
                <input type="number" step="0.000001" value={form.adjustment_factor}
                  onChange={(e) => setForm({ ...form, adjustment_factor: parseFloat(e.target.value) })} style={STYLES.input} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Effective From (YYYYMM) <span style={{ color: COLORS.danger }}>*</span></label>
                  <input value={form.effective_from} onChange={(e) => setForm({ ...form, effective_from: e.target.value })} style={STYLES.input} placeholder="202501" />
                </div>
                <div>
                  <label style={labelStyle}>Effective To (YYYYMM)</label>
                  <input value={form.effective_to} onChange={(e) => setForm({ ...form, effective_to: e.target.value })} style={STYLES.input} placeholder="Optional" />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Rationale <span style={{ color: COLORS.danger }}>*</span></label>
                <textarea rows={3} value={form.rationale} onChange={(e) => setForm({ ...form, rationale: e.target.value })}
                  style={{ ...STYLES.input, resize: 'vertical' }} placeholder="Business justification for this overlay…" />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24, paddingTop: 16, borderTop: `1px solid ${COLORS.border}` }}>
              <button onClick={() => { setShowModal(false); setForm(emptyForm) }} style={STYLES.btnGhost}>Cancel</button>
              <button onClick={handleSubmit} disabled={submitOverlay.isPending || !form.rationale.trim() || !form.effective_from}
                style={{ ...STYLES.btnPrimary, opacity: submitOverlay.isPending || !form.rationale.trim() || !form.effective_from ? 0.5 : 1 }}>
                {submitOverlay.isPending ? 'Submitting…' : 'Submit for Approval'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
