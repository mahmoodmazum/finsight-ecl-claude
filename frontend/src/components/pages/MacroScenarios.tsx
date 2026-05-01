import { useReportingMonthStore } from '../../stores/reportingMonthStore'
import { useState } from 'react'
import { SectionHeader } from '../shared/SectionHeader'
import { StatusBadge } from '../shared/StatusBadge'
import { DataTable, type ColumnDef } from '../shared/DataTable'
import { useMacroScenarios, useApproveScenario, useMacroSensitivity, useCreateScenario, useUpdateScenario } from '../../hooks/useMacro'
import { usePermissions } from '../../hooks/usePermissions'
import type { MacroScenario, SensitivityRow } from '../../types'

function pct(v: number | null) { return v != null ? `${(Number(v) * 100).toFixed(2)}%` : '—' }
function num(v: number | null, dp = 4) { return v != null ? Number(v).toFixed(dp) : '—' }

type Tab = 'scenarios' | 'sensitivity'

const SCENARIO_STYLES = {
  BASE:        { card: 'border-blue-200 bg-blue-50',   header: 'bg-blue-100',   label: 'Base Scenario' },
  OPTIMISTIC:  { card: 'border-green-200 bg-green-50', header: 'bg-green-100',  label: 'Optimistic Scenario' },
  PESSIMISTIC: { card: 'border-red-200 bg-red-50',     header: 'bg-red-100',    label: 'Pessimistic Scenario' },
} as const

const DEFAULT_SCENARIOS = [
  { scenario_name: 'BASE'        as const, weight: 0.50, gdp_growth: 0.062, cpi_inflation: 0.092, bdt_usd_rate: 110.5, bb_repo_rate: 0.0850, npl_ratio: 0.088, remittance_growth: 0.05,  export_growth: 0.07,  macro_multiplier: 1.00 },
  { scenario_name: 'OPTIMISTIC'  as const, weight: 0.25, gdp_growth: 0.075, cpi_inflation: 0.075, bdt_usd_rate: 108.0, bb_repo_rate: 0.0750, npl_ratio: 0.070, remittance_growth: 0.09,  export_growth: 0.12,  macro_multiplier: 0.85 },
  { scenario_name: 'PESSIMISTIC' as const, weight: 0.25, gdp_growth: 0.040, cpi_inflation: 0.115, bdt_usd_rate: 115.0, bb_repo_rate: 0.0950, npl_ratio: 0.120, remittance_growth: -0.02, export_growth: -0.03, macro_multiplier: 1.35 },
]

type EditForm = {
  weight: string
  gdp_growth: string
  cpi_inflation: string
  bdt_usd_rate: string
  bb_repo_rate: string
  npl_ratio: string
  remittance_growth: string
  export_growth: string
  macro_multiplier: string
}

function toForm(s: MacroScenario): EditForm {
  const p = (v: number | null) => v != null ? (Number(v) * 100).toFixed(4) : '0'
  return {
    weight: p(s.weight),
    gdp_growth: p(s.gdp_growth),
    cpi_inflation: p(s.cpi_inflation),
    bdt_usd_rate: s.bdt_usd_rate != null ? Number(s.bdt_usd_rate).toFixed(2) : '0',
    bb_repo_rate: p(s.bb_repo_rate),
    npl_ratio: p(s.npl_ratio),
    remittance_growth: p(s.remittance_growth),
    export_growth: p(s.export_growth),
    macro_multiplier: s.macro_multiplier != null ? Number(s.macro_multiplier).toFixed(6) : '1.000000',
  }
}

function EditModal({ scenario, onClose, onSave }: {
  scenario: MacroScenario
  onClose: () => void
  onSave: (id: string, body: Partial<MacroScenario>) => void
}) {
  const [form, setForm] = useState<EditForm>(() => toForm(scenario))
  const set = (k: keyof EditForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSave = () => {
    const pct = (v: string) => parseFloat(v) / 100
    onSave(scenario.scenario_id, {
      weight: pct(form.weight) as unknown as number,
      gdp_growth: pct(form.gdp_growth) as unknown as number,
      cpi_inflation: pct(form.cpi_inflation) as unknown as number,
      bdt_usd_rate: parseFloat(form.bdt_usd_rate) as unknown as number,
      bb_repo_rate: pct(form.bb_repo_rate) as unknown as number,
      npl_ratio: pct(form.npl_ratio) as unknown as number,
      remittance_growth: pct(form.remittance_growth) as unknown as number,
      export_growth: pct(form.export_growth) as unknown as number,
      macro_multiplier: parseFloat(form.macro_multiplier) as unknown as number,
    })
  }

  const fields: { key: keyof EditForm; label: string; isPct: boolean }[] = [
    { key: 'weight',            label: 'Weight (%)',           isPct: true },
    { key: 'gdp_growth',        label: 'GDP Growth (%)',        isPct: true },
    { key: 'cpi_inflation',     label: 'CPI Inflation (%)',     isPct: true },
    { key: 'bdt_usd_rate',      label: 'BDT/USD Rate',          isPct: false },
    { key: 'bb_repo_rate',      label: 'BB Repo Rate (%)',      isPct: true },
    { key: 'npl_ratio',         label: 'NPL Ratio (%)',         isPct: true },
    { key: 'remittance_growth', label: 'Remittance Growth (%)', isPct: true },
    { key: 'export_growth',     label: 'Export Growth (%)',     isPct: true },
    { key: 'macro_multiplier',  label: 'Macro Multiplier',      isPct: false },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-app-border">
          <h2 className="text-base font-semibold text-gray-900">Edit {scenario.scenario_name} Scenario</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          {fields.map(({ key, label }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
              <input
                type="number"
                step="any"
                value={form[key]}
                onChange={set(key)}
                className="w-full px-3 py-1.5 text-sm border border-app-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-app-border flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark">Save Changes</button>
        </div>
      </div>
    </div>
  )
}

function ScenarioCard({ scenario, onEdit, onApprove, canApprove, canEdit }: {
  scenario: MacroScenario
  onEdit: () => void
  onApprove: () => void
  canApprove: boolean
  canEdit: boolean
}) {
  const name = scenario.scenario_name as keyof typeof SCENARIO_STYLES
  const style = SCENARIO_STYLES[name] ?? SCENARIO_STYLES.BASE
  const vars = [
    { label: 'GDP Growth',        value: pct(scenario.gdp_growth) },
    { label: 'CPI Inflation',     value: pct(scenario.cpi_inflation) },
    { label: 'BDT/USD Rate',      value: scenario.bdt_usd_rate != null ? Number(scenario.bdt_usd_rate).toFixed(2) : '—' },
    { label: 'BB Repo Rate',      value: pct(scenario.bb_repo_rate) },
    { label: 'NPL Ratio',         value: pct(scenario.npl_ratio) },
    { label: 'Remittance Growth', value: pct(scenario.remittance_growth) },
    { label: 'Export Growth',     value: pct(scenario.export_growth) },
  ]
  return (
    <div className={`rounded-xl border-2 ${style.card} p-5 flex flex-col gap-4`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-base font-bold text-gray-900 mb-1">{style.label}</div>
          <div className="text-2xl font-extrabold text-gray-900">{pct(scenario.weight)}</div>
          <div className="text-xs text-gray-500 mt-0.5">Scenario Weight</div>
        </div>
        <StatusBadge status={scenario.status} size="sm" />
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 bg-white/70 rounded-lg p-3">
        {vars.map(({ label, value }) => (
          <div key={label}>
            <div className="text-xs text-gray-500">{label}</div>
            <div className="text-sm font-semibold text-gray-900">{value}</div>
          </div>
        ))}
        <div>
          <div className="text-xs text-gray-500">Multiplier</div>
          <div className="text-sm font-bold text-primary">{num(scenario.macro_multiplier)}</div>
        </div>
      </div>
      <div className="flex gap-2">
        {canEdit && (
          <button onClick={onEdit} className="flex-1 px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors">
            Edit
          </button>
        )}
        {canApprove && scenario.status === 'DRAFT' && (
          <button onClick={onApprove} className="flex-1 px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            Approve
          </button>
        )}
      </div>
    </div>
  )
}

export function MacroScenarios() {
  const [tab, setTab] = useState<Tab>('scenarios')
  const [editScenario, setEditScenario] = useState<MacroScenario | null>(null)
  const month = useReportingMonthStore((s) => s.selectedMonth)
  const { can } = usePermissions()

  const { data: scenarios, isLoading } = useMacroScenarios(month)
  const { data: sensitivity, isLoading: sensLoading } = useMacroSensitivity(month)
  const approveScenario = useApproveScenario()
  const createScenario = useCreateScenario()
  const updateScenario = useUpdateScenario()

  const handleInitialize = async () => {
    if (!month) return
    for (const s of DEFAULT_SCENARIOS) {
      await createScenario.mutateAsync({ ...s, reporting_month: month })
    }
  }

  const handleSave = (id: string, body: Partial<MacroScenario>) => {
    updateScenario.mutate({ scenario_id: id, body }, {
      onSuccess: () => setEditScenario(null),
    })
  }

  const scenarioBg: Record<string, string> = {
    BASE: 'bg-blue-50 text-blue-800 border-blue-200',
    OPTIMISTIC: 'bg-green-50 text-green-800 border-green-200',
    PESSIMISTIC: 'bg-red-50 text-red-800 border-red-200',
  }

  const sensitivityColumns: ColumnDef<SensitivityRow>[] = [
    { key: 'scenario_name', header: 'Scenario', render: (r) => <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${scenarioBg[r.scenario_name] ?? 'bg-gray-100 text-gray-700 border-gray-200'}`}>{r.scenario_name}</span> },
    { key: 'weight', header: 'Weight', render: (r) => pct(r.weight), headerClassName: 'text-right', className: 'text-right' },
    { key: 'macro_multiplier', header: 'Macro Multiplier', render: (r) => num(r.macro_multiplier), headerClassName: 'text-right', className: 'text-right' },
    { key: 'weighted_contribution', header: 'Weighted Contribution', render: (r) => <span className="font-medium">{num(r.weighted_contribution)}</span>, headerClassName: 'text-right', className: 'text-right' },
  ]

  const noScenarios = !isLoading && (!scenarios || scenarios.length === 0)

  return (
    <div className="space-y-6">
      {editScenario && (
        <EditModal
          scenario={editScenario}
          onClose={() => setEditScenario(null)}
          onSave={handleSave}
        />
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <SectionHeader title="Macro Scenarios" subtitle="Bangladesh macroeconomic scenario weights and multipliers" />
        {noScenarios && tab === 'scenarios' && can('macro:edit') && (
          <button
            onClick={handleInitialize}
            disabled={createScenario.isPending || !month}
            className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 transition-colors"
          >
            {createScenario.isPending ? 'Initializing...' : 'Initialize Scenarios'}
          </button>
        )}
      </div>

      <div className="flex gap-1 border-b border-app-border">
        {([
          { key: 'scenarios',   label: 'Scenarios' },
          { key: 'sensitivity', label: 'Sensitivity Analysis' },
        ] as { key: Tab; label: string }[]).map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === key ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'scenarios' && (
        <div className="space-y-4">
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <div key={i} className="h-72 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          )}
          {noScenarios && (
            <div className="bg-white rounded-xl border border-app-border p-12 text-center">
              <p className="text-gray-500 text-sm mb-1">No scenarios configured for <span className="font-semibold">{month}</span>.</p>
              <p className="text-gray-400 text-xs">Click "Initialize Scenarios" to create default BB baseline scenarios.</p>
            </div>
          )}
          {!isLoading && scenarios && scenarios.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(['BASE', 'OPTIMISTIC', 'PESSIMISTIC'] as const).map((name) => {
                const s = scenarios.find(sc => sc.scenario_name === name)
                if (!s) return null
                return (
                  <ScenarioCard key={s.scenario_id} scenario={s}
                    canApprove={can('macro:approve')} canEdit={can('macro:edit')}
                    onEdit={() => setEditScenario(s)}
                    onApprove={() => approveScenario.mutate(s.scenario_id)} />
                )
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'sensitivity' && (
        <div className="space-y-4">
          {sensitivity && (
            <div className="bg-white rounded-xl border border-app-border p-4 flex items-center gap-6">
              <div>
                <p className="text-xs text-gray-500">Total Weighted Multiplier</p>
                <p className="text-2xl font-bold text-primary">{num(sensitivity.total_weighted_multiplier)}</p>
              </div>
              <p className="text-sm text-gray-500">Sum (scenario_weight x macro_multiplier) across approved scenarios</p>
            </div>
          )}
          <DataTable
            columns={sensitivityColumns}
            data={sensitivity?.rows ?? []}
            totalCount={sensitivity?.rows.length ?? 0}
            page={1} pageSize={sensitivity?.rows.length ?? 10}
            onPageChange={() => {}} isLoading={sensLoading}
            rowKey={(r) => r.scenario_name}
            emptyMessage="No approved scenarios for sensitivity analysis."
          />
        </div>
      )}
    </div>
  )
}
