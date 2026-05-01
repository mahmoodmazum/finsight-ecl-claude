import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { SectionHeader } from '../shared/SectionHeader'
import { StatusBadge } from '../shared/StatusBadge'
import { DataTable, type ColumnDef } from '../shared/DataTable'
import { useOverlays, useSubmitOverlay, useApproveOverlay, useRejectOverlay, useExpireOverlay } from '../../hooks/useOverlays'
import { usePermissions } from '../../hooks/usePermissions'
import type { ManagementOverlay, OverlayCreate } from '../../types'

function fmtDate(d: string | null) { if (!d) return '—'; try { return format(parseISO(d), 'dd MMM yyyy') } catch { return d } }

const OVERLAY_TYPES = ['CURE_RATE', 'SEGMENT_FACTOR', 'RATING', 'STAGE', 'PD_CAP_FLOOR', 'LGD_HAIRCUT', 'SCENARIO_WEIGHT', 'SECTOR', 'PORTFOLIO']
const STATUS_FILTERS = ['', 'PENDING', 'APPROVED', 'REJECTED', 'EXPIRED']

const emptyForm: OverlayCreate = { loan_id: '', segment_id: '', overlay_type: 'SEGMENT_FACTOR', adjustment_factor: 1, rationale: '', effective_from: '', effective_to: '' }

export function ManagementOverlays() {
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<OverlayCreate>(emptyForm)
  const { can } = usePermissions()

  const { data, isLoading } = useOverlays(statusFilter || undefined, undefined, page, 50)
  const submitOverlay = useSubmitOverlay()
  const approveOverlay = useApproveOverlay()
  const rejectOverlay = useRejectOverlay()
  const expireOverlay = useExpireOverlay()

  async function handleSubmit() {
    const payload: OverlayCreate = {
      overlay_type: form.overlay_type,
      adjustment_factor: Number(form.adjustment_factor),
      rationale: form.rationale,
      effective_from: form.effective_from,
      ...(form.loan_id ? { loan_id: form.loan_id } : {}),
      ...(form.segment_id ? { segment_id: form.segment_id } : {}),
      ...(form.effective_to ? { effective_to: form.effective_to } : {}),
    }
    await submitOverlay.mutateAsync(payload)
    setShowModal(false)
    setForm(emptyForm)
  }

  const statusBadge: Record<string, string> = {
    PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
    APPROVED: 'bg-green-50 text-green-700 border-green-200',
    REJECTED: 'bg-red-50 text-red-700 border-red-200',
    EXPIRED: 'bg-gray-100 text-gray-500 border-gray-200',
  }

  const columns: ColumnDef<ManagementOverlay>[] = [
    { key: 'overlay_id', header: 'ID', render: (r) => <code className="text-xs font-mono text-gray-500">{r.overlay_id.slice(0,8)}…</code> },
    { key: 'overlay_type', header: 'Type', render: (r) => <span className="text-xs font-medium bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{r.overlay_type}</span> },
    { key: 'loan_id', header: 'Loan / Segment', render: (r) => r.loan_id ?? r.segment_id ?? '—' },
    { key: 'adjustment_factor', header: 'Factor', render: (r) => <span className="font-medium">{Number(r.adjustment_factor).toFixed(6)}</span>, headerClassName: 'text-right', className: 'text-right' },
    { key: 'effective_from', header: 'Period', render: (r) => `${r.effective_from}${r.effective_to ? ` → ${r.effective_to}` : '+'}` },
    {
      key: 'status', header: 'Status',
      render: (r) => <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${statusBadge[r.status] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>{r.status}</span>,
    },
    { key: 'submitted_at', header: 'Submitted', render: (r) => fmtDate(r.submitted_at) },
    {
      key: 'actions', header: '',
      render: (r) => (
        <div className="flex gap-1.5">
          {can('overlays:approve') && r.status === 'PENDING' && (
            <>
              <button onClick={() => approveOverlay.mutate(r.overlay_id)} disabled={approveOverlay.isPending} className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">Approve</button>
              <button onClick={() => rejectOverlay.mutate(r.overlay_id)} disabled={rejectOverlay.isPending} className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50">Reject</button>
            </>
          )}
          {can('overlays:expire') && r.status === 'APPROVED' && (
            <button onClick={() => expireOverlay.mutate(r.overlay_id)} disabled={expireOverlay.isPending} className="px-2 py-1 text-xs border border-app-border rounded hover:bg-gray-50 disabled:opacity-50">Expire</button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SectionHeader title="Management Overlays" subtitle="Expert judgement adjustments to ECL parameters" />
        {can('overlays:submit') && (
          <button onClick={() => setShowModal(true)} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark">
            + New Overlay
          </button>
        )}
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s || 'all'}
            onClick={() => { setStatusFilter(s); setPage(1) }}
            className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
              statusFilter === s ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-app-border hover:bg-gray-50'
            }`}
          >
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

      {/* Submit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-semibold text-gray-900 mb-5">Submit Management Overlay</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Loan ID</label>
                  <input value={form.loan_id} onChange={(e) => setForm({ ...form, loan_id: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-app-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="Optional" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Segment ID</label>
                  <input value={form.segment_id} onChange={(e) => setForm({ ...form, segment_id: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-app-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="Optional" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Overlay Type</label>
                <select value={form.overlay_type} onChange={(e) => setForm({ ...form, overlay_type: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30">
                  {OVERLAY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adjustment Factor</label>
                <input type="number" step="0.000001" value={form.adjustment_factor} onChange={(e) => setForm({ ...form, adjustment_factor: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 text-sm border border-app-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Effective From (YYYYMM) <span className="text-red-500">*</span></label>
                  <input value={form.effective_from} onChange={(e) => setForm({ ...form, effective_from: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-app-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="202501" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Effective To (YYYYMM)</label>
                  <input value={form.effective_to} onChange={(e) => setForm({ ...form, effective_to: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-app-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="Optional" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rationale <span className="text-red-500">*</span></label>
                <textarea rows={3} value={form.rationale} onChange={(e) => setForm({ ...form, rationale: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-app-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="Business justification for this overlay…" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => { setShowModal(false); setForm(emptyForm) }} className="px-4 py-2 text-sm border border-app-border rounded-lg hover:bg-gray-50">Cancel</button>
              <button
                onClick={handleSubmit}
                disabled={submitOverlay.isPending || !form.rationale.trim() || !form.effective_from}
                className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
              >
                {submitOverlay.isPending ? 'Submitting…' : 'Submit for Approval'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
