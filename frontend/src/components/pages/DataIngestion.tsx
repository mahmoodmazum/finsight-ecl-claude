import { useState, useRef } from 'react'
import { SectionHeader } from '../shared/SectionHeader'
import { StatusBadge } from '../shared/StatusBadge'
import { DataTable, type ColumnDef } from '../shared/DataTable'
import { useDataSources, useLoadHistory, useQualityIssues, useTriggerIngestion, useUploadMacroCSV } from '../../hooks/useDataIngestion'
import type { DataSource, DataLoadHistory, DataQualityIssue } from '../../types'
import { usePermissions } from '../../hooks/usePermissions'
import { format, parseISO } from 'date-fns'

function fmtDate(d: string | null) {
  if (!d) return '—'
  try { return format(parseISO(d), 'dd MMM yyyy HH:mm') } catch { return d }
}

type Tab = 'sources' | 'history' | 'quality'

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
  const uploadMutation = useUploadMacroCSV()

  const sourceColumns: ColumnDef<DataSource>[] = [
    { key: 'source_name', header: 'Source Name', render: (r) => <span className="font-medium text-gray-900">{r.source_name}</span> },
    { key: 'source_type', header: 'Type' },
    { key: 'integration_method', header: 'Method' },
    { key: 'schedule_cron', header: 'Schedule', render: (r) => <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{r.schedule_cron ?? '—'}</code> },
    { key: 'last_run_at', header: 'Last Run', render: (r) => fmtDate(r.last_run_at) },
    { key: 'last_run_status', header: 'Status', render: (r) => r.last_run_status ? <StatusBadge status={r.last_run_status} size="sm" /> : <span className="text-gray-400">—</span> },
    {
      key: 'actions', header: '',
      render: (r) => can('data:trigger') ? (
        <button
          onClick={() => triggerMutation.mutate(r.source_id)}
          disabled={triggerMutation.isPending}
          className="px-3 py-1 text-xs bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50"
        >
          Trigger
        </button>
      ) : null,
    },
  ]

  const historyColumns: ColumnDef<DataLoadHistory>[] = [
    { key: 'load_id', header: 'Load ID', render: (r) => <span className="font-mono text-xs">{r.load_id}</span> },
    { key: 'source_id', header: 'Source', render: (r) => <span className="text-xs">{r.source_id}</span> },
    { key: 'started_at', header: 'Started', render: (r) => fmtDate(r.started_at) },
    { key: 'completed_at', header: 'Completed', render: (r) => fmtDate(r.completed_at) },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} size="sm" /> },
    { key: 'records_loaded', header: 'Loaded', render: (r) => r.records_loaded?.toLocaleString() ?? '—' },
    { key: 'records_failed', header: 'Failed', render: (r) => r.records_failed ? <span className="text-red-600 font-medium">{r.records_failed}</span> : '—' },
  ]

  const qualityColumns: ColumnDef<DataQualityIssue>[] = [
    { key: 'issue_id', header: 'Issue ID', render: (r) => <span className="font-mono text-xs">{r.issue_id}</span> },
    { key: 'loan_id', header: 'Loan ID', render: (r) => r.loan_id ?? '—' },
    { key: 'field_name', header: 'Field', render: (r) => r.field_name ?? '—' },
    { key: 'error_type', header: 'Error Type', render: (r) => <span className="text-xs font-medium text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">{r.error_type}</span> },
    { key: 'error_detail', header: 'Detail', render: (r) => <span className="text-xs text-gray-500 truncate max-w-xs block">{r.error_detail ?? '—'}</span> },
    { key: 'is_quarantined', header: 'Quarantined', render: (r) => r.is_quarantined ? <span className="text-red-600 text-xs font-medium">Yes</span> : <span className="text-gray-400 text-xs">No</span> },
    { key: 'resolved', header: 'Resolved', render: (r) => r.resolved ? <span className="text-green-600 text-xs font-medium">Yes</span> : <span className="text-gray-400 text-xs">No</span> },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <SectionHeader title="Data Ingestion" subtitle="Monitor and manage data source loads" />
        {can('data:upload') && (
          <div>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) uploadMutation.mutate(f)
              e.target.value = ''
            }} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadMutation.isPending}
              className="px-4 py-2 text-sm bg-white border border-app-border rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Upload Macro CSV
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-app-border">
        {(['sources', 'history', 'quality'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
              tab === t ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'sources' ? 'Sources' : t === 'history' ? 'Load History' : 'Data Quality'}
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
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <select
              value={selectedSource ?? ''}
              onChange={(e) => setSelectedSource(e.target.value || undefined)}
              className="px-3 py-1.5 text-sm border border-app-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">All sources</option>
              {sources?.map((s) => (
                <option key={s.source_id} value={s.source_id}>{s.source_name}</option>
              ))}
            </select>
          </div>
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
