import { useReportingMonthStore } from '../../stores/reportingMonthStore'
import { useState } from 'react'
import { format } from 'date-fns'
import { SectionHeader } from '../shared/SectionHeader'
import { DataTable, type ColumnDef } from '../shared/DataTable'
import { useReportLibrary, useGenerateReport, useDownloadReport, useBBRegulatory, useIFRS7 } from '../../hooks/useReports'
import { usePermissions } from '../../hooks/usePermissions'
import type { ReportDefinition, BBRegulatoryRow, IFRS7DisclosureRow } from '../../types'

function fmt(v: number) { return `৳${Number(v).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Cr` }
function pct(v: number) { return `${Number(v).toFixed(2)}%` }

type Tab = 'library' | 'regulatory' | 'ifrs7'

const CATEGORY_COLORS: Record<string, string> = {
  IFRS9: 'bg-blue-50 text-blue-700 border-blue-200',
  REGULATORY: 'bg-purple-50 text-purple-700 border-purple-200',
  MANAGEMENT: 'bg-green-50 text-green-700 border-green-200',
}

export function Reports() {
  const [tab, setTab] = useState<Tab>('library')
  const month = useReportingMonthStore((s) => s.selectedMonth)
  const [generating, setGenerating] = useState<string | null>(null)
  const { can } = usePermissions()

  const { data: library, isLoading: libLoading } = useReportLibrary()
  const { data: bbData, isLoading: bbLoading } = useBBRegulatory(month)
  const { data: ifrs7Data, isLoading: ifrs7Loading } = useIFRS7(month)
  const generateReport = useGenerateReport()
  const downloadReport = useDownloadReport()

  async function handleGenerate(report_id: string) {
    setGenerating(report_id)
    try {
      await generateReport.mutateAsync({ report_id, month })
    } finally {
      setGenerating(null)
    }
  }

  const bbColumns: ColumnDef<BBRegulatoryRow>[] = [
    { key: 'reporting_month', header: 'Month' },
    { key: 'stage', header: 'Stage', render: (r) => `Stage ${r.stage}` },
    { key: 'total_outstanding', header: 'Outstanding', render: (r) => fmt(r.total_outstanding), headerClassName: 'text-right', className: 'text-right' },
    { key: 'total_provision', header: 'Provision', render: (r) => fmt(r.total_provision), headerClassName: 'text-right', className: 'text-right' },
    { key: 'provision_coverage_pct', header: 'Coverage %', render: (r) => <span className="font-medium">{pct(r.provision_coverage_pct)}</span>, headerClassName: 'text-right', className: 'text-right' },
  ]

  const ifrs7Columns: ColumnDef<IFRS7DisclosureRow>[] = [
    { key: 'stage', header: 'Stage', render: (r) => `Stage ${r.stage}` },
    { key: 'loan_count', header: 'Loans', render: (r) => r.loan_count.toLocaleString(), headerClassName: 'text-right', className: 'text-right' },
    { key: 'gross_ead', header: 'Gross EAD', render: (r) => fmt(r.gross_ead), headerClassName: 'text-right', className: 'text-right' },
    { key: 'ecl_weighted', header: 'ECL (Weighted)', render: (r) => fmt(r.ecl_weighted), headerClassName: 'text-right', className: 'text-right' },
    { key: 'ecl_rate_pct', header: 'ECL Rate %', render: (r) => <span className="font-medium">{pct(r.ecl_rate_pct)}</span>, headerClassName: 'text-right', className: 'text-right' },
  ]

  const groupedReports: Record<string, ReportDefinition[]> = {}
  for (const r of library ?? []) {
    if (!groupedReports[r.category]) groupedReports[r.category] = []
    groupedReports[r.category].push(r)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SectionHeader title="Reports" subtitle="IFRS 9, regulatory, and management reports" />
      </div>

      <div className="flex gap-1 border-b border-app-border">
        {([
          { key: 'library', label: 'Report Library' },
          { key: 'regulatory', label: 'BB Regulatory' },
          { key: 'ifrs7', label: 'IFRS 7 Disclosure' },
        ] as { key: Tab; label: string }[]).map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === key ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'library' && (
        <div>
          {libLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-36 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedReports).map(([category, reports]) => (
                <div key={category}>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{category}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {reports.map((r) => (
                      <div key={r.report_id} className="bg-white rounded-xl border border-app-border p-4 flex flex-col gap-3">
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="text-sm font-semibold text-gray-900">{r.report_name}</p>
                            <span className={`inline-flex shrink-0 px-1.5 py-0.5 rounded text-xs font-medium border ${CATEGORY_COLORS[r.category] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>{r.category}</span>
                          </div>
                          <p className="text-xs text-gray-500">{r.description}</p>
                        </div>
                        {can('reports:generate') && (
                          <div className="mt-auto flex gap-2">
                            <button
                              onClick={() => handleGenerate(r.report_id)}
                              disabled={generating === r.report_id}
                              className="flex-1 px-3 py-1.5 text-xs bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
                            >
                              {generating === r.report_id ? 'Generating…' : `Generate (${month})`}
                            </button>
                            <button
                              onClick={() => downloadReport.mutate({ report_id: r.report_id, month })}
                              disabled={downloadReport.isPending}
                              title="Download Excel"
                              className="px-2.5 py-1.5 text-xs border border-app-border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                            >
                              ↓ Excel
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'regulatory' && (
        <DataTable
          columns={bbColumns}
          data={bbData ?? []}
          totalCount={bbData?.length ?? 0}
          page={1}
          pageSize={bbData?.length ?? 10}
          onPageChange={() => {}}
          isLoading={bbLoading}
          rowKey={(r) => `${r.reporting_month}-${r.stage}`}
          emptyMessage="No BB regulatory data for this month."
        />
      )}

      {tab === 'ifrs7' && (
        <DataTable
          columns={ifrs7Columns}
          data={ifrs7Data ?? []}
          totalCount={ifrs7Data?.length ?? 0}
          page={1}
          pageSize={ifrs7Data?.length ?? 10}
          onPageChange={() => {}}
          isLoading={ifrs7Loading}
          rowKey={(r) => r.stage}
          emptyMessage="No IFRS 7 disclosure data for this period."
        />
      )}
    </div>
  )
}
