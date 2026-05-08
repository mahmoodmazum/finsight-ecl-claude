import { useReportingMonthStore } from '../../stores/reportingMonthStore'
import { useState } from 'react'
import { SectionHeader } from '../shared/SectionHeader'
import { StatusBadge } from '../shared/StatusBadge'
import { DataTable, type ColumnDef } from '../shared/DataTable'
import { useMacroScenarios, useApproveScenario, useMacroSensitivity, useCreateScenario, useUpdateScenario } from '../../hooks/useMacro'
import { usePermissions } from '../../hooks/usePermissions'
import type { MacroScenario, SensitivityRow } from '../../types'
import { COLORS, STYLES, scenarioCardStyle, badgeStyle } from '../../styles/design-system'

function pct(v: number | null) { return v != null ? `${(Number(v) * 100).toFixed(2)}%` : '—' }
function num(v: number | null, dp = 4) { return v != null ? Number(v).toFixed(dp) : '—' }

type Tab = 'scenarios' | 'sensitivity'

const SCENARIO_COLORS = {
  BASE:        COLORS.primary,
  OPTIMISTIC:  COLORS.stage1,
  PESSIMISTIC: COLORS.stage3,
} as const

const SCENARIO_LABELS = {
  BASE:        'Base Scenario',
  OPTIMISTIC:  'Optimistic Scenario',
  PESSIMISTIC: 'Pessimistic Scenario',
} as const

const DEFAULT_SCENARIOS = [
  { scenario_name: 'BASE'        as const, weight: 0.50, gdp_growth: 0.062, cpi_inflation: 0.092, bdt_usd_rate: 110.5, bb_repo_rate: 0.0850, npl_ratio: 0.088, remittance_growth: 0.05,  export_growth: 0.07,  macro_multiplier: 1.00 },
  { scenario_name: 'OPTIMISTIC'  as const, weight: 0.25, gdp_growth: 0.075, cpi_inflation: 0.075, bdt_usd_rate: 108.0, bb_repo_rate: 0.0750, npl_ratio: 0.070, remittance_growth: 0.09,  export_growth: 0.12,  macro_multiplier: 0.85 },
  { scenario_name: 'PESSIMISTIC' as const, weight: 0.25, gdp_growth: 0.040, cpi_inflation: 0.115, bdt_usd_rate: 115.0, bb_repo_rate: 0.0950, npl_ratio: 0.120, remittance_growth: -0.02, export_growth: -0.03, macro_multiplier: 1.35 },
]

type EditForm = {
  weight: string; gdp_growth: string; cpi_inflation: string; bdt_usd_rate: string
  bb_repo_rate: string; npl_ratio: string; remittance_growth: string; export_growth: string; macro_multiplier: string
}

function toForm(s: MacroScenario): EditForm {
  const p = (v: number | null) => v != null ? (Number(v) * 100).toFixed(4) : '0'
  return {
    weight: p(s.weight), gdp_growth: p(s.gdp_growth), cpi_inflation: p(s.cpi_inflation),
    bdt_usd_rate: s.bdt_usd_rate != null ? Number(s.bdt_usd_rate).toFixed(2) : '0',
    bb_repo_rate: p(s.bb_repo_rate), npl_ratio: p(s.npl_ratio),
    remittance_growth: p(s.remittance_growth), export_growth: p(s.export_growth),
    macro_multiplier: s.macro_multiplier != null ? Number(s.macro_multiplier).toFixed(6) : '1.000000',
  }
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 600, color: COLORS.textMuted, marginBottom: 4 }

function EditModal({ scenario, onClose, onSave }: {
  scenario: MacroScenario; onClose: () => void
  onSave: (id: string, body: Partial<MacroScenario>) => void
}) {
  const [form, setForm] = useState<EditForm>(() => toForm(scenario))
  const set = (k: keyof EditForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSave = () => {
    const p = (v: string) => parseFloat(v) / 100
    onSave(scenario.scenario_id, {
      weight: p(form.weight) as unknown as number, gdp_growth: p(form.gdp_growth) as unknown as number,
      cpi_inflation: p(form.cpi_inflation) as unknown as number, bdt_usd_rate: parseFloat(form.bdt_usd_rate) as unknown as number,
      bb_repo_rate: p(form.bb_repo_rate) as unknown as number, npl_ratio: p(form.npl_ratio) as unknown as number,
      remittance_growth: p(form.remittance_growth) as unknown as number, export_growth: p(form.export_growth) as unknown as number,
      macro_multiplier: parseFloat(form.macro_multiplier) as unknown as number,
    })
  }

  const fields: { key: keyof EditForm; label: string }[] = [
    { key: 'weight',            label: 'Weight (%)' },
    { key: 'gdp_growth',        label: 'GDP Growth (%)' },
    { key: 'cpi_inflation',     label: 'CPI Inflation (%)' },
    { key: 'bdt_usd_rate',      label: 'BDT/USD Rate' },
    { key: 'bb_repo_rate',      label: 'BB Repo Rate (%)' },
    { key: 'npl_ratio',         label: 'NPL Ratio (%)' },
    { key: 'remittance_growth', label: 'Remittance Growth (%)' },
    { key: 'export_growth',     label: 'Export Growth (%)' },
    { key: 'macro_multiplier',  label: 'Macro Multiplier' },
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(30,42,59,0.45)', backdropFilter: 'blur(2px)' }}>
      <div style={{ background: '#FFFFFF', borderRadius: 12, boxShadow: '0 8px 32px rgba(30,42,59,0.16)', width: '100%', maxWidth: 520, margin: '0 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px', borderBottom: `1px solid ${COLORS.border}` }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: COLORS.text, margin: 0 }}>Edit {scenario.scenario_name} Scenario</h2>
          <button onClick={onClose} style={{ ...STYLES.btnGhost, padding: '4px 8px', fontSize: 16 }}>✕</button>
        </div>
        <div style={{ padding: 28, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {fields.map(({ key, label }) => (
            <div key={key}>
              <label style={labelStyle}>{label}</label>
              <input type="number" step="any" value={form[key]}
                onChange={set(key)} style={{ ...STYLES.input, padding: '7px 10px' }} />
            </div>
          ))}
        </div>
        <div style={{ padding: '16px 28px', borderTop: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={STYLES.btnGhost}>Cancel</button>
          <button onClick={handleSave} style={STYLES.btnPrimary}>Save Changes</button>
        </div>
      </div>
    </div>
  )
}

function ScenarioCard({ scenario, onEdit, onApprove, canApprove, canEdit }: {
  scenario: MacroScenario; onEdit: () => void; onApprove: () => void; canApprove: boolean; canEdit: boolean
}) {
  const name  = scenario.scenario_name as keyof typeof SCENARIO_COLORS
  const color = SCENARIO_COLORS[name] ?? COLORS.primary
  const label = SCENARIO_LABELS[name] ?? scenario.scenario_name

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
    <div style={{ ...scenarioCardStyle(color), display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text, marginBottom: 4 }}>{label}</div>
          <div style={{ fontSize: 26, fontWeight: 700, color }}>{pct(scenario.weight)}</div>
          <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>Scenario Weight</div>
        </div>
        <StatusBadge status={scenario.status} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, background: 'rgba(255,255,255,0.7)', borderRadius: 7, padding: 12 }}>
        {vars.map(({ label: l, value }) => (
          <div key={l}>
            <div style={{ fontSize: 10, color: COLORS.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{l}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{value}</div>
          </div>
        ))}
        <div>
          <div style={{ fontSize: 10, color: COLORS.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Multiplier</div>
          <div style={{ fontSize: 13, fontWeight: 700, color }}>{num(scenario.macro_multiplier)}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {canEdit && (
          <button onClick={onEdit} style={{ ...STYLES.btnGhost, flex: 1 }}>Edit</button>
        )}
        {canApprove && scenario.status === 'DRAFT' && (
          <button onClick={onApprove} style={{ ...STYLES.btnPrimary, flex: 1, background: COLORS.success }}>Approve</button>
        )}
      </div>
    </div>
  )
}

export function MacroScenarios() {
  const [tab, setTab]             = useState<Tab>('scenarios')
  const [editScenario, setEditScenario] = useState<MacroScenario | null>(null)
  const month                     = useReportingMonthStore((s) => s.selectedMonth)
  const { can }                   = usePermissions()

  const { data: scenarios, isLoading }           = useMacroScenarios(month)
  const { data: sensitivity, isLoading: sensLoading } = useMacroSensitivity(month)
  const approveScenario = useApproveScenario()
  const createScenario  = useCreateScenario()
  const updateScenario  = useUpdateScenario()

  const handleInitialize = async () => {
    if (!month) return
    for (const s of DEFAULT_SCENARIOS) {
      await createScenario.mutateAsync({ ...s, reporting_month: month })
    }
  }

  const handleSave = (id: string, body: Partial<MacroScenario>) => {
    updateScenario.mutate({ scenario_id: id, body }, { onSuccess: () => setEditScenario(null) })
  }

  const noScenarios = !isLoading && (!scenarios || scenarios.length === 0)

  const sensitivityColumns: ColumnDef<SensitivityRow>[] = [
    { key: 'scenario_name', header: 'Scenario', render: (r) => {
      const color = SCENARIO_COLORS[r.scenario_name as keyof typeof SCENARIO_COLORS] ?? COLORS.textMuted
      return <span style={badgeStyle(color)}>{r.scenario_name}</span>
    }},
    { key: 'weight', header: 'Weight', render: (r) => pct(r.weight), headerClassName: 'text-right', className: 'text-right' },
    { key: 'macro_multiplier', header: 'Macro Multiplier', render: (r) => num(r.macro_multiplier), headerClassName: 'text-right', className: 'text-right' },
    { key: 'weighted_contribution', header: 'Weighted Contribution', render: (r) => <span style={{ fontWeight: 700 }}>{num(r.weighted_contribution)}</span>, headerClassName: 'text-right', className: 'text-right' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {editScenario && <EditModal scenario={editScenario} onClose={() => setEditScenario(null)} onSave={handleSave} />}

      <SectionHeader
        title="Macro Scenarios"
        subtitle="Bangladesh macroeconomic scenario weights and multipliers"
        actions={noScenarios && tab === 'scenarios' && can('macro:edit') ? (
          <button onClick={handleInitialize} disabled={createScenario.isPending || !month}
            style={{ ...STYLES.btnPrimary, opacity: createScenario.isPending || !month ? 0.5 : 1 }}>
            {createScenario.isPending ? 'Initializing…' : 'Initialize Scenarios'}
          </button>
        ) : undefined}
      />

      <div style={{ display: 'flex', gap: 2, borderBottom: `1px solid ${COLORS.border}` }}>
        {[{ key: 'scenarios', label: 'Scenarios' }, { key: 'sensitivity', label: 'Sensitivity Analysis' }].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key as Tab)} style={{
            padding: '8px 18px', fontSize: 13, fontWeight: 600, border: 'none',
            background: 'transparent', color: tab === key ? COLORS.primary : COLORS.textMuted,
            borderBottom: `2px solid ${tab === key ? COLORS.primary : 'transparent'}`,
            cursor: 'pointer', marginBottom: -1,
          }}>{label}</button>
        ))}
      </div>

      {tab === 'scenarios' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {isLoading && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 288, borderRadius: 8 }} />)}
            </div>
          )}
          {noScenarios && (
            <div style={{ ...STYLES.card, textAlign: 'center', padding: '48px 24px' }}>
              <p style={{ color: COLORS.textMuted, fontSize: 13, marginBottom: 4 }}>No scenarios configured for <strong>{month}</strong>.</p>
              <p style={{ color: COLORS.textMuted, fontSize: 12 }}>Click "Initialize Scenarios" to create default BB baseline scenarios.</p>
            </div>
          )}
          {!isLoading && scenarios && scenarios.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {sensitivity && (
            <div style={{ ...STYLES.card, display: 'flex', alignItems: 'center', gap: 24 }}>
              <div>
                <p style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Weighted Multiplier</p>
                <p style={{ fontSize: 26, fontWeight: 700, color: COLORS.primary }}>{num(sensitivity.total_weighted_multiplier)}</p>
              </div>
              <p style={{ fontSize: 13, color: COLORS.textMuted }}>Sum (scenario_weight × macro_multiplier) across approved scenarios</p>
            </div>
          )}
          <DataTable columns={sensitivityColumns} data={sensitivity?.rows ?? []} totalCount={sensitivity?.rows.length ?? 0}
            page={1} pageSize={sensitivity?.rows.length ?? 10} onPageChange={() => {}} isLoading={sensLoading}
            rowKey={(r) => r.scenario_name} emptyMessage="No approved scenarios for sensitivity analysis." />
        </div>
      )}
    </div>
  )
}
