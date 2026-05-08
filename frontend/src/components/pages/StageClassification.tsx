import { useReportingMonthStore } from '../../stores/reportingMonthStore'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { SectionHeader } from '../shared/SectionHeader'
import { StageBadge } from '../shared/StageBadge'
import { DataTable, type ColumnDef } from '../shared/DataTable'
import { useStagingResults, useSubmitOverride, useApproveOverride, useRunStaging } from '../../hooks/useStaging'
import { usePermissions } from '../../hooks/usePermissions'
import type { StagingResult } from '../../types'
import { COLORS, STYLES, badgeStyle, idCell } from '../../styles/design-system'

interface OverrideModalState {
  staging_id: number
  loan_id: string
  current_stage: number
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: COLORS.textMuted, marginBottom: 6 }

export function StageClassification() {
  const month = useReportingMonthStore((s) => s.selectedMonth)
  const [stageFilter, setStageFilter]     = useState<number | undefined>()
  const [overridesOnly, setOverridesOnly] = useState(false)
  const [page, setPage]                   = useState(1)
  const [overrideModal, setOverrideModal] = useState<OverrideModalState | null>(null)
  const [newStage, setNewStage]           = useState(1)
  const [reason, setReason]               = useState('')
  const { can } = usePermissions()

  const { data, isLoading } = useStagingResults(month, stageFilter, overridesOnly, page, 100)
  const submitOverride = useSubmitOverride()
  const approveOverride = useApproveOverride()
  const runStaging = useRunStaging()

  function handleStageChange(f: number | undefined) { setStageFilter(f); setPage(1) }

  async function handleSubmitOverride() {
    if (!overrideModal || !reason.trim()) { toast.error('Reason is required'); return }
    await submitOverride.mutateAsync({ staging_id: overrideModal.staging_id, new_stage: newStage, reason })
    setOverrideModal(null)
    setReason('')
  }

  function dpdColor(dpd: number): string {
    if (dpd === 0)  return COLORS.success
    if (dpd < 30)   return COLORS.warning
    if (dpd < 90)   return COLORS.warning
    return COLORS.danger
  }

  const columns: ColumnDef<StagingResult>[] = [
    { key: 'loan_id', header: 'Loan ID', render: (r) => <span style={idCell}>{r.loan_id}</span> },
    { key: 'stage', header: 'Stage', render: (r) => <StageBadge stage={r.stage as 1|2|3} /> },
    { key: 'dpd_at_staging', header: 'DPD', render: (r) => (
      <span style={{ color: dpdColor(r.dpd_at_staging), fontWeight: r.dpd_at_staging >= 30 ? 700 : 400 }}>
        {r.dpd_at_staging}
      </span>
    )},
    { key: 'cl_status_at_staging', header: 'CL Status', render: (r) => r.cl_status_at_staging ?? '—' },
    { key: 'crr_at_staging', header: 'CRR', render: (r) => r.crr_at_staging ?? '—' },
    { key: 'sicr_flag', header: 'SICR', render: (r) => r.sicr_flag
      ? <span style={badgeStyle(COLORS.warning)}>SICR</span>
      : <span style={{ color: COLORS.textMuted }}>—</span> },
    { key: 'override_flag', header: 'Override', render: (r) => r.override_flag
      ? <span title={r.override_reason ?? ''} style={badgeStyle(COLORS.primary)}>
          {r.override_approved_by ? 'Approved' : 'Pending'}
        </span>
      : <span style={{ color: COLORS.textMuted }}>—</span> },
    {
      key: 'actions', header: '',
      render: (r) => (
        <div style={{ display: 'flex', gap: 6 }}>
          {can('staging:override:submit') && !r.override_flag && (
            <button
              onClick={() => { setOverrideModal({ staging_id: r.staging_id, loan_id: r.loan_id, current_stage: r.stage }); setNewStage(r.stage) }}
              style={{ ...STYLES.btnGhost, padding: '3px 10px', fontSize: 11 }}
            >Override</button>
          )}
          {can('staging:override:approve') && r.override_flag && !r.override_approved_by && (
            <button
              onClick={() => approveOverride.mutate(r.staging_id)}
              disabled={approveOverride.isPending}
              style={{ ...STYLES.btnPrimary, background: COLORS.success, padding: '3px 10px', fontSize: 11, opacity: approveOverride.isPending ? 0.5 : 1 }}
            >Approve</button>
          )}
        </div>
      ),
    },
  ]

  const filterBtnStyle = (active: boolean): React.CSSProperties => ({
    ...active ? STYLES.btnPrimary : STYLES.btnGhost,
    padding: '4px 14px', fontSize: 11,
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SectionHeader
        title="Stage Classification"
        subtitle="IFRS 9 staging results by loan"
        actions={can('staging:run') ? (
          <button
            onClick={() => runStaging.mutate(month)}
            disabled={runStaging.isPending}
            style={{ ...STYLES.btnPrimary, opacity: runStaging.isPending ? 0.6 : 1 }}
          >
            {runStaging.isPending ? 'Running…' : 'Run Staging'}
          </button>
        ) : undefined}
      />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Stage:</span>
        {[undefined, 1, 2, 3].map((s) => (
          <button key={s ?? 'all'} onClick={() => handleStageChange(s)} style={filterBtnStyle(stageFilter === s)}>
            {s == null ? 'All' : `Stage ${s}`}
          </button>
        ))}
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8, fontSize: 13, color: COLORS.text, cursor: 'pointer' }}>
          <input type="checkbox" checked={overridesOnly} onChange={(e) => { setOverridesOnly(e.target.checked); setPage(1) }} />
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

      {overrideModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(30,42,59,0.45)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#FFFFFF', borderRadius: 12, boxShadow: '0 8px 32px rgba(30,42,59,0.16)', width: '100%', maxWidth: 480, margin: '0 16px', padding: 28 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: COLORS.text, marginBottom: 20 }}>Submit Stage Override</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: COLORS.bg, borderRadius: 7, padding: '10px 14px' }}>
                <p style={{ fontSize: 13, color: COLORS.textMuted }}>Loan ID: <span style={{ fontFamily: 'monospace', fontWeight: 600, color: COLORS.text }}>{overrideModal.loan_id}</span></p>
                <p style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 4 }}>Current Stage: <strong style={{ color: COLORS.text }}>Stage {overrideModal.current_stage}</strong></p>
              </div>
              <div>
                <label style={labelStyle}>New Stage</label>
                <select value={newStage} onChange={(e) => setNewStage(Number(e.target.value))} style={{ ...STYLES.input }}>
                  {[1, 2, 3].map((s) => <option key={s} value={s}>Stage {s}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Reason <span style={{ color: COLORS.danger }}>*</span></label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  style={{ ...STYLES.input, resize: 'vertical' }}
                  placeholder="Justification for stage override…"
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24, paddingTop: 16, borderTop: `1px solid ${COLORS.border}` }}>
              <button onClick={() => { setOverrideModal(null); setReason('') }} style={STYLES.btnGhost}>Cancel</button>
              <button
                onClick={handleSubmitOverride}
                disabled={submitOverride.isPending || !reason.trim()}
                style={{ ...STYLES.btnPrimary, opacity: submitOverride.isPending || !reason.trim() ? 0.5 : 1 }}
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
