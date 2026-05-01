import { useReportingMonthStore } from '../../stores/reportingMonthStore'
import { useState } from 'react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { SectionHeader } from '../shared/SectionHeader'
import { StageBadge } from '../shared/StageBadge'
import { DataTable, type ColumnDef } from '../shared/DataTable'
import { useStagingResults, useSubmitOverride, useApproveOverride, useRunStaging } from '../../hooks/useStaging'
import { usePermissions } from '../../hooks/usePermissions'
import type { StagingResult } from '../../types'


interface OverrideModalState {
  staging_id: number
  loan_id: string
  current_stage: number
}

export function StageClassification() {
  const month = useReportingMonthStore((s) => s.selectedMonth)
  const [stageFilter, setStageFilter] = useState<number | undefined>()
  const [overridesOnly, setOverridesOnly] = useState(false)
  const [page, setPage] = useState(1)
  const [overrideModal, setOverrideModal] = useState<OverrideModalState | null>(null)
  const [newStage, setNewStage] = useState(1)
  const [reason, setReason] = useState('')
  const { can } = usePermissions()

  const { data, isLoading } = useStagingResults(month, stageFilter, overridesOnly, page, 100)
  const submitOverride = useSubmitOverride()
  const approveOverride = useApproveOverride()
  const runStaging = useRunStaging()

  function handleStageChange(f: number | undefined) {
    setStageFilter(f)
    setPage(1)
  }

  async function handleSubmitOverride() {
    if (!overrideModal || !reason.trim()) { toast.error('Reason is required'); return }
    await submitOverride.mutateAsync({ staging_id: overrideModal.staging_id, new_stage: newStage, reason })
    setOverrideModal(null)
    setReason('')
  }

  const columns: ColumnDef<StagingResult>[] = [
    { key: 'loan_id', header: 'Loan ID', render: (r) => <code className="text-xs font-mono">{r.loan_id}</code> },
    { key: 'stage', header: 'Stage', render: (r) => <StageBadge stage={r.stage as 1|2|3} size="sm" /> },
    { key: 'dpd_at_staging', header: 'DPD', render: (r) => <span className={r.dpd_at_staging >= 30 ? 'text-red-600 font-medium' : ''}>{r.dpd_at_staging}</span> },
    { key: 'cl_status_at_staging', header: 'CL Status', render: (r) => r.cl_status_at_staging ?? '—' },
    { key: 'crr_at_staging', header: 'CRR', render: (r) => r.crr_at_staging ?? '—' },
    {
      key: 'sicr_flag', header: 'SICR',
      render: (r) => r.sicr_flag
        ? <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">SICR</span>
        : <span className="text-xs text-gray-400">—</span>,
    },
    {
      key: 'override_flag', header: 'Override',
      render: (r) => r.override_flag
        ? (
          <span title={r.override_reason ?? ''} className="text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full cursor-help">
            {r.override_approved_by ? 'Approved' : 'Pending'}
          </span>
        )
        : <span className="text-xs text-gray-400">—</span>,
    },
    {
      key: 'actions', header: '',
      render: (r) => (
        <div className="flex gap-2">
          {can('staging:override:submit') && !r.override_flag && (
            <button
              onClick={() => { setOverrideModal({ staging_id: r.staging_id, loan_id: r.loan_id, current_stage: r.stage }); setNewStage(r.stage) }}
              className="px-2 py-1 text-xs border border-app-border rounded hover:bg-gray-50"
            >
              Override
            </button>
          )}
          {can('staging:override:approve') && r.override_flag && !r.override_approved_by && (
            <button
              onClick={() => approveOverride.mutate(r.staging_id)}
              disabled={approveOverride.isPending}
              className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              Approve
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start gap-4 justify-between">
        <SectionHeader title="Stage Classification" subtitle="IFRS 9 staging results by loan" />
        <div className="flex gap-2">
          {can('staging:run') && (
            <button
              onClick={() => runStaging.mutate(month)}
              disabled={runStaging.isPending}
              className="px-4 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
            >
              {runStaging.isPending ? 'Running…' : 'Run Staging'}
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Stage:</span>
        {[undefined, 1, 2, 3].map((s) => (
          <button
            key={s ?? 'all'}
            onClick={() => handleStageChange(s)}
            className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
              stageFilter === s
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-gray-600 border-app-border hover:bg-gray-50'
            }`}
          >
            {s == null ? 'All' : `Stage ${s}`}
          </button>
        ))}
        <label className="flex items-center gap-1.5 ml-4 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={overridesOnly} onChange={(e) => { setOverridesOnly(e.target.checked); setPage(1) }} className="rounded" />
          Overrides only
        </label>
      </div>

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        totalCount={data?.total ?? 0}
        page={page}
        pageSize={100}
        onPageChange={setPage}
        isLoading={isLoading}
        rowKey={(r) => r.staging_id}
        emptyMessage="No staging results for the selected filters."
      />

      {/* Override Modal */}
      {overrideModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Submit Stage Override</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Loan ID: <span className="font-mono font-medium text-gray-900">{overrideModal.loan_id}</span></p>
                <p className="text-sm text-gray-500 mt-1">Current Stage: <strong>Stage {overrideModal.current_stage}</strong></p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Stage</label>
                <select
                  value={newStage}
                  onChange={(e) => setNewStage(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-app-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {[1, 2, 3].map((s) => <option key={s} value={s}>Stage {s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason <span className="text-red-500">*</span></label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-app-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="Justification for stage override…"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => { setOverrideModal(null); setReason('') }} className="px-4 py-2 text-sm border border-app-border rounded-lg hover:bg-gray-50">Cancel</button>
              <button
                onClick={handleSubmitOverride}
                disabled={submitOverride.isPending || !reason.trim()}
                className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
              >
                {submitOverride.isPending ? 'Submitting…' : 'Submit Override'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
