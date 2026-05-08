import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { SectionHeader } from '../shared/SectionHeader'
import { DataTable, type ColumnDef } from '../shared/DataTable'
import { useAuditLog, useRiskRegister, useCreateRisk, useUpdateRisk, useDeleteRisk } from '../../hooks/useAudit'
import { usePermissions } from '../../hooks/usePermissions'
import type { AuditLog, RiskRegister, RiskCreate } from '../../types'
import { COLORS, STYLES, badgeStyle } from '../../styles/design-system'

function fmtDate(d: string) { try { return format(parseISO(d), 'dd MMM yyyy HH:mm') } catch { return d } }

type Tab = 'log' | 'risks'

const RISK_RATINGS    = ['HIGH', 'MEDIUM', 'LOW']
const RISK_CATEGORIES = ['MODEL', 'DATA', 'OPERATIONAL', 'REGULATORY', 'MARKET', 'CREDIT']
const RISK_STATUSES   = ['OPEN', 'IN_PROGRESS', 'CLOSED', 'ACCEPTED']

const emptyRisk: RiskCreate = { risk_title: '', category: 'MODEL', rating: 'MEDIUM', description: '', mitigation: '' }

const ratingColor: Record<string, string> = {
  HIGH:   COLORS.danger,
  MEDIUM: COLORS.warning,
  LOW:    COLORS.success,
}

const riskStatusColor: Record<string, string> = {
  OPEN:        COLORS.danger,
  IN_PROGRESS: COLORS.primary,
  CLOSED:      COLORS.textMuted,
  ACCEPTED:    COLORS.success,
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: COLORS.textMuted, marginBottom: 6 }

const TABS = [
  { key: 'log',   label: 'Audit Log' },
  { key: 'risks', label: 'Risk Register' },
]

export function AuditTrail() {
  const [tab, setTab]               = useState<Tab>('log')
  const [logPage, setLogPage]       = useState(1)
  const [eventTypeFilter, setEventTypeFilter]   = useState('')
  const [entityTypeFilter, setEntityTypeFilter] = useState('')
  const [showRiskModal, setShowRiskModal] = useState(false)
  const [editRisk, setEditRisk]           = useState<RiskRegister | null>(null)
  const [riskForm, setRiskForm]           = useState<RiskCreate>(emptyRisk)
  const [riskStatusFilter, setRiskStatusFilter] = useState('')
  const { can } = usePermissions()

  const { data: logData, isLoading: logLoading } = useAuditLog(
    eventTypeFilter  || undefined,
    entityTypeFilter || undefined,
    undefined,
    logPage,
    50
  )
  const { data: risks, isLoading: risksLoading } = useRiskRegister(riskStatusFilter || undefined)
  const createRisk = useCreateRisk()
  const updateRisk = useUpdateRisk()
  const deleteRisk = useDeleteRisk()

  function openCreateModal() { setEditRisk(null); setRiskForm(emptyRisk); setShowRiskModal(true) }
  function openEditModal(r: RiskRegister) {
    setEditRisk(r)
    setRiskForm({ risk_title: r.risk_title, category: r.category, rating: r.rating, description: r.description ?? '', mitigation: r.mitigation ?? '' })
    setShowRiskModal(true)
  }

  async function handleSaveRisk() {
    if (editRisk) {
      await updateRisk.mutateAsync({ risk_id: editRisk.risk_id, body: riskForm })
    } else {
      await createRisk.mutateAsync(riskForm)
    }
    setShowRiskModal(false)
  }

  const filterBtnStyle = (active: boolean): React.CSSProperties => ({
    ...active ? STYLES.btnPrimary : STYLES.btnGhost,
    padding: '4px 14px', fontSize: 11,
  })

  const logColumns: ColumnDef<AuditLog>[] = [
    { key: 'log_id', header: 'ID', render: (r) => <span style={{ fontFamily: 'monospace', fontSize: 11, color: COLORS.textMuted }}>{r.log_id}</span> },
    { key: 'event_at', header: 'Timestamp', render: (r) => <span style={{ fontSize: 12 }}>{fmtDate(r.event_at)}</span> },
    { key: 'event_type', header: 'Event', render: (r) => <span style={badgeStyle(COLORS.primary)}>{r.event_type}</span> },
    { key: 'entity_type', header: 'Entity Type', render: (r) => <span style={{ fontSize: 12 }}>{r.entity_type}</span> },
    { key: 'entity_id', header: 'Entity ID', render: (r) => (
      <code style={{ fontFamily: 'monospace', fontSize: 11, color: COLORS.textMuted, display: 'block', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.entity_id}</code>
    )},
    { key: 'user_id', header: 'User', render: (r) => r.user_id
      ? <code style={{ fontFamily: 'monospace', fontSize: 11 }}>{r.user_id.slice(0,8)}…</code>
      : <span style={{ color: COLORS.textMuted }}>—</span> },
  ]

  const riskColumns: ColumnDef<RiskRegister>[] = [
    { key: 'risk_title', header: 'Title', render: (r) => <span style={{ fontWeight: 600, color: COLORS.text }}>{r.risk_title}</span> },
    { key: 'category', header: 'Category', render: (r) => <span style={badgeStyle(COLORS.teal)}>{r.category}</span> },
    { key: 'rating', header: 'Rating', render: (r) => <span style={badgeStyle(ratingColor[r.rating] ?? COLORS.textMuted)}>{r.rating}</span> },
    { key: 'status', header: 'Status', render: (r) => <span style={badgeStyle(riskStatusColor[r.status] ?? COLORS.textMuted)}>{r.status}</span> },
    { key: 'owner', header: 'Owner', render: (r) => r.owner ?? '—' },
    { key: 'target_date', header: 'Target Date', render: (r) => r.target_date ?? '—' },
    {
      key: 'actions', header: '',
      render: (r) => can('audit:register:edit') ? (
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => openEditModal(r)} style={{ ...STYLES.btnGhost, padding: '3px 10px', fontSize: 11 }}>Edit</button>
          <button onClick={() => deleteRisk.mutate(r.risk_id)} disabled={deleteRisk.isPending}
            style={{ ...STYLES.btnGhost, padding: '3px 10px', fontSize: 11, color: COLORS.danger, borderColor: COLORS.danger, opacity: deleteRisk.isPending ? 0.5 : 1 }}>Delete</button>
        </div>
      ) : null,
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SectionHeader title="Audit Trail" subtitle="Immutable audit log and risk register" />

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

      {tab === 'log' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <input value={eventTypeFilter} onChange={(e) => { setEventTypeFilter(e.target.value); setLogPage(1) }}
              placeholder="Filter by event type…" style={{ ...STYLES.input, width: 208 }} />
            <input value={entityTypeFilter} onChange={(e) => { setEntityTypeFilter(e.target.value); setLogPage(1) }}
              placeholder="Filter by entity type…" style={{ ...STYLES.input, width: 208 }} />
          </div>
          <DataTable
            columns={logColumns}
            data={logData?.items ?? []}
            totalCount={logData?.total ?? 0}
            page={logPage}
            pageSize={50}
            onPageChange={setLogPage}
            isLoading={logLoading}
            rowKey={(r) => r.log_id}
            emptyMessage="No audit log entries match the filters."
          />
        </div>
      )}

      {tab === 'risks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['', ...RISK_STATUSES].map((s) => (
                <button key={s || 'all'} onClick={() => setRiskStatusFilter(s)} style={filterBtnStyle(riskStatusFilter === s)}>
                  {s || 'All'}
                </button>
              ))}
            </div>
            {can('audit:register:edit') && (
              <button onClick={openCreateModal} style={STYLES.btnPrimary}>+ Add Risk</button>
            )}
          </div>
          <DataTable
            columns={riskColumns}
            data={risks ?? []}
            totalCount={risks?.length ?? 0}
            page={1}
            pageSize={risks?.length ?? 10}
            onPageChange={() => {}}
            isLoading={risksLoading}
            rowKey={(r) => r.risk_id}
            emptyMessage="No risk items found."
          />
        </div>
      )}

      {showRiskModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(30,42,59,0.45)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#FFFFFF', borderRadius: 12, boxShadow: '0 8px 32px rgba(30,42,59,0.16)', width: '100%', maxWidth: 480, margin: '0 16px', padding: 28 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: COLORS.text, marginBottom: 20 }}>{editRisk ? 'Edit Risk Item' : 'Add Risk Item'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Title <span style={{ color: COLORS.danger }}>*</span></label>
                <input value={riskForm.risk_title} onChange={(e) => setRiskForm({ ...riskForm, risk_title: e.target.value })} style={STYLES.input} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Category</label>
                  <select value={riskForm.category} onChange={(e) => setRiskForm({ ...riskForm, category: e.target.value })} style={STYLES.input}>
                    {RISK_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Rating</label>
                  <select value={riskForm.rating} onChange={(e) => setRiskForm({ ...riskForm, rating: e.target.value })} style={STYLES.input}>
                    {RISK_RATINGS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <textarea rows={2} value={riskForm.description} onChange={(e) => setRiskForm({ ...riskForm, description: e.target.value })}
                  style={{ ...STYLES.input, resize: 'vertical' }} />
              </div>
              <div>
                <label style={labelStyle}>Mitigation</label>
                <textarea rows={2} value={riskForm.mitigation} onChange={(e) => setRiskForm({ ...riskForm, mitigation: e.target.value })}
                  style={{ ...STYLES.input, resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24, paddingTop: 16, borderTop: `1px solid ${COLORS.border}` }}>
              <button onClick={() => setShowRiskModal(false)} style={STYLES.btnGhost}>Cancel</button>
              <button onClick={handleSaveRisk} disabled={(createRisk.isPending || updateRisk.isPending) || !riskForm.risk_title.trim()}
                style={{ ...STYLES.btnPrimary, opacity: (createRisk.isPending || updateRisk.isPending) || !riskForm.risk_title.trim() ? 0.5 : 1 }}>
                {createRisk.isPending || updateRisk.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
