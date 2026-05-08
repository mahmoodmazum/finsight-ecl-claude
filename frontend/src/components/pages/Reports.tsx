import { useReportingMonthStore } from '../../stores/reportingMonthStore'
import { useState } from 'react'
import { SectionHeader } from '../shared/SectionHeader'
import { DataTable, type ColumnDef } from '../shared/DataTable'
import { useReportLibrary, useGenerateReport, useDownloadReport, useBBRegulatory, useIFRS7 } from '../../hooks/useReports'
import { usePermissions } from '../../hooks/usePermissions'
import type { ReportDefinition, BBRegulatoryRow, IFRS7DisclosureRow } from '../../types'
import { COLORS, STYLES, badgeStyle } from '../../styles/design-system'

function fmt(v: number) { return `৳${Number(v).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Cr` }
function pct(v: number) { return `${Number(v).toFixed(2)}%` }

type Tab = 'library' | 'regulatory' | 'ifrs7'

const CATEGORY_COLORS: Record<string, string> = {
  IFRS9:      COLORS.primary,
  REGULATORY: '#7C3AED',
  MANAGEMENT: COLORS.success,
}

const TABS = [
  { key: 'library',    label: 'Report Library' },
  { key: 'regulatory', label: 'BB Regulatory' },
  { key: 'ifrs7',      label: 'IFRS 7 Disclosure' },
]

export function Reports() {
  const [tab, setTab]           = useState<Tab>('library')
  const month                   = useReportingMonthStore((s) => s.selectedMonth)
  const [generating, setGenerating] = useState<string | null>(null)
  const { can }                 = usePermissions()

  const { data: library,  isLoading: libLoading }   = useReportLibrary()
  const { data: bbData,   isLoading: bbLoading }    = useBBRegulatory(month)
  const { data: ifrs7Data, isLoading: ifrs7Loading } = useIFRS7(month)
  const generateReport  = useGenerateReport()
  const downloadReport  = useDownloadReport()

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
    { key: 'provision_coverage_pct', header: 'Coverage %', render: (r) => <span style={{ fontWeight: 700, color: COLORS.primary }}>{pct(r.provision_coverage_pct)}</span>, headerClassName: 'text-right', className: 'text-right' },
  ]

  const ifrs7Columns: ColumnDef<IFRS7DisclosureRow>[] = [
    { key: 'stage', header: 'Stage', render: (r) => `Stage ${r.stage}` },
    { key: 'loan_count', header: 'Loans', render: (r) => r.loan_count.toLocaleString(), headerClassName: 'text-right', className: 'text-right' },
    { key: 'gross_ead', header: 'Gross EAD', render: (r) => fmt(r.gross_ead), headerClassName: 'text-right', className: 'text-right' },
    { key: 'ecl_weighted', header: 'ECL (Weighted)', render: (r) => fmt(r.ecl_weighted), headerClassName: 'text-right', className: 'text-right' },
    { key: 'ecl_rate_pct', header: 'ECL Rate %', render: (r) => <span style={{ fontWeight: 700, color: COLORS.primary }}>{pct(r.ecl_rate_pct)}</span>, headerClassName: 'text-right', className: 'text-right' },
  ]

  const groupedReports: Record<string, ReportDefinition[]> = {}
  for (const r of library ?? []) {
    if (!groupedReports[r.category]) groupedReports[r.category] = []
    groupedReports[r.category].push(r)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SectionHeader title="Reports" subtitle="IFRS 9, regulatory, and management reports" />

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

      {tab === 'library' && (
        <div>
          {libLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 144, borderRadius: 10 }} />)}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {Object.entries(groupedReports).map(([category, reports]) => (
                <div key={category}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>{category}</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                    {reports.map((r) => (
                      <div key={r.report_id} style={{ ...STYLES.card, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                            <p style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{r.report_name}</p>
                            <span style={{ ...badgeStyle(CATEGORY_COLORS[r.category] ?? COLORS.textMuted), flexShrink: 0 }}>{r.category}</span>
                          </div>
                          <p style={{ fontSize: 12, color: COLORS.textMuted }}>{r.description}</p>
                        </div>
                        {can('reports:generate') && (
                          <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                            <button onClick={() => handleGenerate(r.report_id)} disabled={generating === r.report_id}
                              style={{ ...STYLES.btnPrimary, flex: 1, fontSize: 12, padding: '6px 12px', opacity: generating === r.report_id ? 0.5 : 1 }}>
                              {generating === r.report_id ? 'Generating…' : `Generate (${month})`}
                            </button>
                            <button onClick={() => downloadReport.mutate({ report_id: r.report_id, month })}
                              disabled={downloadReport.isPending} title="Download Excel"
                              style={{ ...STYLES.btnGhost, padding: '6px 12px', fontSize: 12, opacity: downloadReport.isPending ? 0.5 : 1 }}>
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
