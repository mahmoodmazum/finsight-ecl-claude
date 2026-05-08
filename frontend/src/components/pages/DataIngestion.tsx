import { useState, useRef } from 'react'
import { SectionHeader } from '../shared/SectionHeader'
import { StatusBadge } from '../shared/StatusBadge'
import { DataTable, type ColumnDef } from '../shared/DataTable'
import { useDataSources, useLoadHistory, useQualityIssues, useTriggerIngestion, useUploadMacroCSV } from '../../hooks/useDataIngestion'
import type { DataSource, DataLoadHistory, DataQualityIssue } from '../../types'
import { usePermissions } from '../../hooks/usePermissions'
import { format, parseISO } from 'date-fns'
import { COLORS, STYLES, badgeStyle } from '../../styles/design-system'

function fmtDate(d: string | null) {
  if (!d) return '—'
  try { return format(parseISO(d), 'dd MMM yyyy HH:mm') } catch { return d }
}

type Tab = 'sources' | 'history' | 'quality'

const TABS = [
  { id: 'sources', label: 'Sources' },
  { id: 'history', label: 'Load History' },
  { id: 'quality', label: 'Data Quality' },
]

export function DataIngestion() {
  const [tab, setTab] = useState<Tab>('sources')
  const [selectedSource, setSelectedSource] = useState<string | undefined>()
  const [qualityPage, setQualityPage] = useState(1)
  const fileRef = useRef<HTMLInputElement>(null)
  const { can } = usePermissions()

  const { data: sources, isLoading: srcLoading } = useDataSources()
  const { data: history, isLoading: histLoading } = useLoadHistory(selectedSource)
  const { data: quality, isLoading: qualLoading } = useQualityIssues(undefined, qualityPage, 50)
  const triggerMutation = useTriggerIngestion()
  const uploadMutation  = useUploadMacroCSV()

  const sourceColumns: ColumnDef<DataSource>[] = [
    { key: 'source_name', header: 'Source Name', render: (r) => <span style={{ fontWeight: 600, color: COLORS.text }}>{r.source_name}</span> },
    { key: 'source_type', header: 'Type' },
    { key: 'integration_method', header: 'Method' },
    { key: 'schedule_cron', header: 'Schedule', render: (r) => <code style={{ fontSize: 11, background: COLORS.bg, padding: '2px 6px', borderRadius: 4 }}>{r.schedule_cron ?? '—'}</code> },
    { key: 'last_run_at', header: 'Last Run', render: (r) => fmtDate(r.last_run_at) },
    { key: 'last_run_status', header: 'Status', render: (r) => r.last_run_status ? <StatusBadge status={r.last_run_status} size="sm" /> : <span style={{ color: COLORS.textMuted }}>—</span> },
    {
      key: 'actions', header: '',
      render: (r) => can('data:trigger') ? (
        <button
          onClick={() => triggerMutation.mutate(r.source_id)}
          disabled={triggerMutation.isPending}
          style={{ ...STYLES.btnPrimary, padding: '4px 12px', fontSize: 11, opacity: triggerMutation.isPending ? 0.5 : 1 }}
        >
          Trigger
        </button>
      ) : null,
    },
  ]

  const historyColumns: ColumnDef<DataLoadHistory>[] = [
    { key: 'load_id', header: 'Load ID', render: (r) => <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{r.load_id}</span> },
    { key: 'source_id', header: 'Source', render: (r) => <span style={{ fontSize: 12 }}>{r.source_id}</span> },
    { key: 'started_at', header: 'Started', render: (r) => fmtDate(r.started_at) },
    { key: 'completed_at', header: 'Completed', render: (r) => fmtDate(r.completed_at) },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} size="sm" /> },
    { key: 'records_loaded', header: 'Loaded', render: (r) => r.records_loaded?.toLocaleString() ?? '—' },
    { key: 'records_failed', header: 'Failed', render: (r) => r.records_failed ? <span style={{ color: COLORS.danger, fontWeight: 600 }}>{r.records_failed}</span> : '—' },
  ]

  const qualityColumns: ColumnDef<DataQualityIssue>[] = [
    { key: 'issue_id', header: 'Issue ID', render: (r) => <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{r.issue_id}</span> },
    { key: 'loan_id', header: 'Loan ID', render: (r) => r.loan_id ?? '—' },
    { key: 'field_name', header: 'Field', render: (r) => r.field_name ?? '—' },
    { key: 'error_type', header: 'Error Type', render: (r) => <span style={badgeStyle(COLORS.danger)}>{r.error_type}</span> },
    { key: 'error_detail', header: 'Detail', render: (r) => <span style={{ fontSize: 11, color: COLORS.textMuted }}>{r.error_detail ?? '—'}</span> },
    { key: 'is_quarantined', header: 'Quarantined', render: (r) => r.is_quarantined ? <span style={badgeStyle(COLORS.danger)}>Yes</span> : <span style={{ color: COLORS.textMuted, fontSize: 12 }}>No</span> },
    { key: 'resolved', header: 'Resolved', render: (r) => r.resolved ? <span style={badgeStyle(COLORS.success)}>Yes</span> : <span style={{ color: COLORS.textMuted, fontSize: 12 }}>No</span> },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SectionHeader
        title="Data Ingestion"
        subtitle="Monitor and manage data source loads"
        actions={can('data:upload') ? (
          <>
            <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) uploadMutation.mutate(f)
              e.target.value = ''
            }} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadMutation.isPending}
              style={{ ...STYLES.btnGhost, opacity: uploadMutation.isPending ? 0.5 : 1 }}
            >
              Upload Macro CSV
            </button>
          </>
        ) : undefined}
      />

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 2, borderBottom: `1px solid ${COLORS.border}`, paddingBottom: 0 }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as Tab)}
            style={{
              padding:      '8px 18px',
              fontSize:     13,
              fontWeight:   600,
              border:       'none',
              background:   'transparent',
              color:        tab === t.id ? COLORS.primary : COLORS.textMuted,
              borderBottom: `2px solid ${tab === t.id ? COLORS.primary : 'transparent'}`,
              cursor:       'pointer',
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'sources' && (
        <DataTable
          columns={sourceColumns}
          data={sources ?? []}
          totalCount={sources?.length ?? 0}
          page={1}
          pageSize={sources?.length ?? 10}
          onPageChange={() => {}}
          isLoading={srcLoading}
          rowKey={(r) => r.source_id}
          emptyMessage="No data sources configured."
        />
      )}

      {tab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <select
            value={selectedSource ?? ''}
            onChange={(e) => setSelectedSource(e.target.value || undefined)}
            style={{ ...STYLES.input, width: 240 }}
          >
            <option value="">All sources</option>
            {sources?.map((s) => (
              <option key={s.source_id} value={s.source_id}>{s.source_name}</option>
            ))}
          </select>
          <DataTable
            columns={historyColumns}
            data={history ?? []}
            totalCount={history?.length ?? 0}
            page={1}
            pageSize={history?.length ?? 10}
            onPageChange={() => {}}
            isLoading={histLoading}
            rowKey={(r) => r.load_id}
            emptyMessage="No load history available."
          />
        </div>
      )}

      {tab === 'quality' && (
        <DataTable
          columns={qualityColumns}
          data={quality?.items ?? []}
          totalCount={quality?.total ?? 0}
          page={qualityPage}
          pageSize={50}
          onPageChange={setQualityPage}
          isLoading={qualLoading}
          rowKey={(r) => r.issue_id}
          emptyMessage="No data quality issues found."
        />
      )}
    </div>
  )
}
