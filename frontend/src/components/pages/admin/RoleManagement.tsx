import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  listRoles, createRole, updateRole, deleteRole,
  getRolePermissions, setRolePermissions, listPermissions,
} from '../../../api/admin'
import type { AdminRole, AdminPermission } from '../../../types'
import { usePermissions } from '../../../hooks/usePermissions'
import { COLORS, STYLES, badgeStyle } from '../../../styles/design-system'

const MODULE_LABELS: Record<string, string> = {
  dashboard:    'Dashboard',
  data:         'Data Ingestion',
  segmentation: 'Segmentation',
  staging:      'Staging',
  sicr:         'SICR Assessment',
  ecl:          'ECL Calculation',
  macro:        'Macro Scenarios',
  provision:    'Provision & GL',
  overlays:     'Overlays',
  reports:      'Reports',
  governance:   'Model Governance',
  audit:        'Audit Trail',
  admin:        'Administration',
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: COLORS.textMuted, marginBottom: 6 }

// ── Role Form Modal ───────────────────────────────────────────────────────────

function RoleFormModal({ role, onClose }: { role?: AdminRole; onClose: () => void }) {
  const qc = useQueryClient()
  const [name, setName]             = useState(role?.name ?? '')
  const [description, setDescription] = useState(role?.description ?? '')

  const mutation = useMutation({
    mutationFn: () => role ? updateRole(role.role_id, { name, description }) : createRole({ name, description }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-roles'] })
      toast.success(role ? 'Role updated' : 'Role created')
      onClose()
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? 'Action failed'),
  })

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(30,42,59,0.45)', backdropFilter: 'blur(2px)', padding: 16 }}>
      <div style={{ background: '#FFFFFF', borderRadius: 12, boxShadow: '0 8px 32px rgba(30,42,59,0.16)', width: '100%', maxWidth: 480, padding: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: COLORS.text, marginBottom: 20 }}>{role ? 'Edit Role' : 'Create Role'}</h2>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate() }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>Role Name</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} style={STYLES.input} placeholder="e.g. Junior Analyst" />
          </div>
          <div>
            <label style={labelStyle}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              style={{ ...STYLES.input, resize: 'none' }} rows={3} placeholder="Optional description…" />
          </div>
          <div style={{ display: 'flex', gap: 10, paddingTop: 8 }}>
            <button type="submit" disabled={mutation.isPending} style={{ ...STYLES.btnPrimary, flex: 1, opacity: mutation.isPending ? 0.6 : 1 }}>
              {mutation.isPending ? 'Saving…' : role ? 'Save' : 'Create'}
            </button>
            <button type="button" onClick={onClose} style={{ ...STYLES.btnGhost, flex: 1 }}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Permission Matrix Modal ───────────────────────────────────────────────────

function PermissionMatrixModal({
  role, allPermissions, onClose,
}: {
  role: AdminRole
  allPermissions: Record<string, AdminPermission[]>
  onClose: () => void
}) {
  const qc = useQueryClient()

  const { data: currentPerms = [], isLoading } = useQuery({
    queryKey: ['role-permissions', role.role_id],
    queryFn: () => getRolePermissions(role.role_id),
  })

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [synced, setSynced] = useState(false)

  if (!isLoading && !synced) {
    setSelected(new Set(currentPerms.map((p) => p.permission_id)))
    setSynced(true)
  }

  const saveMutation = useMutation({
    mutationFn: () => setRolePermissions(role.role_id, Array.from(selected)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['role-permissions', role.role_id] })
      qc.invalidateQueries({ queryKey: ['admin-roles'] })
      toast.success('Permissions updated')
      onClose()
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? 'Failed to update permissions'),
  })

  const toggle = (id: string) => {
    if (role.is_system) return
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleModule = (perms: AdminPermission[]) => {
    if (role.is_system) return
    const allChecked = perms.every((p) => selected.has(p.permission_id))
    setSelected((prev) => {
      const next = new Set(prev)
      perms.forEach((p) => allChecked ? next.delete(p.permission_id) : next.add(p.permission_id))
      return next
    })
  }

  const modules = Object.entries(allPermissions)

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(30,42,59,0.45)', backdropFilter: 'blur(2px)', padding: 16 }}>
      <div style={{ background: '#FFFFFF', borderRadius: 12, boxShadow: '0 8px 32px rgba(30,42,59,0.16)', width: '100%', maxWidth: 720, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 28px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: COLORS.text, marginBottom: 2 }}>Permission Matrix</h2>
            <p style={{ fontSize: 13, color: COLORS.textMuted }}>{role.name}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, color: COLORS.textMuted }}>{selected.size} selected</span>
            {role.is_system && (
              <span style={badgeStyle(COLORS.warning)}>System — read only</span>
            )}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 32, color: COLORS.textMuted }}>Loading permissions…</div>
          ) : (
            modules.map(([module, perms]) => {
              const allChecked  = perms.every((p) => selected.has(p.permission_id))
              const someChecked = perms.some((p) => selected.has(p.permission_id))
              return (
                <div key={module}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    {!role.is_system && (
                      <input type="checkbox" checked={allChecked}
                        ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked }}
                        onChange={() => toggleModule(perms)}
                        style={{ width: 16, height: 16, accentColor: COLORS.primary, cursor: 'pointer' }} />
                    )}
                    <p style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {MODULE_LABELS[module] ?? module}
                    </p>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginLeft: role.is_system ? 0 : 24 }}>
                    {perms.map((perm) => (
                      <label key={perm.permission_id}
                        style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: COLORS.bg, borderRadius: 7, padding: '8px 12px', border: `1px solid ${COLORS.border}`, cursor: role.is_system ? 'default' : 'pointer' }}>
                        <input type="checkbox" checked={selected.has(perm.permission_id)}
                          onChange={() => toggle(perm.permission_id)}
                          disabled={role.is_system}
                          style={{ marginTop: 2, width: 15, height: 15, accentColor: COLORS.primary, flexShrink: 0 }} />
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{perm.name}</p>
                          <p style={{ fontSize: 11, fontFamily: 'monospace', color: COLORS.textMuted }}>{perm.code}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div style={{ padding: '16px 28px', borderTop: `1px solid ${COLORS.border}`, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          {!role.is_system && (
            <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
              style={{ ...STYLES.btnPrimary, opacity: saveMutation.isPending ? 0.6 : 1 }}>
              {saveMutation.isPending ? 'Saving…' : 'Save Permissions'}
            </button>
          )}
          <button onClick={onClose} style={STYLES.btnGhost}>Close</button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export function RoleManagement() {
  const { can } = usePermissions()
  const qc = useQueryClient()

  const [showCreate, setShowCreate] = useState(false)
  const [editRole, setEditRole]     = useState<AdminRole | null>(null)
  const [permRole, setPermRole]     = useState<AdminRole | null>(null)

  const { data: roles = [], isLoading } = useQuery({ queryKey: ['admin-roles'], queryFn: listRoles })

  const { data: allPermissions = {} } = useQuery({
    queryKey: ['admin-permissions'],
    queryFn: listPermissions,
    enabled: can('admin:roles:view'),
  })

  const deleteMutation = useMutation({
    mutationFn: (roleId: string) => deleteRole(roleId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-roles'] }); toast.success('Role deleted') },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? 'Cannot delete role'),
  })

  const handleDelete = (role: AdminRole) => {
    if (!confirm(`Delete role "${role.name}"? This cannot be undone.`)) return
    deleteMutation.mutate(role.role_id)
  }

  const totalPermCount = Object.values(allPermissions).reduce((acc, p) => acc + p.length, 0)

  return (
    <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: COLORS.text, marginBottom: 4 }}>Role Management</h1>
          <p style={{ fontSize: 13, color: COLORS.textMuted }}>{roles.length} roles · {totalPermCount} permissions</p>
        </div>
        {can('admin:roles:create') && (
          <button onClick={() => setShowCreate(true)} style={STYLES.btnPrimary}>+ Create Role</button>
        )}
      </div>

      <div style={{ ...STYLES.card, padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Role', 'Type', 'Status', ''].map((h) => (
                <th key={h} style={{ ...STYLES.th, textAlign: h === '' ? 'right' : 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={4} style={{ ...STYLES.td, textAlign: 'center', padding: 48, color: COLORS.textMuted }}>Loading…</td></tr>
            ) : roles.length === 0 ? (
              <tr><td colSpan={4} style={{ ...STYLES.td, textAlign: 'center', padding: 48, color: COLORS.textMuted }}>No roles found</td></tr>
            ) : (
              roles.map((role, idx) => (
                <tr key={role.role_id} style={{ background: idx % 2 === 0 ? '#FFF' : '#FAFBFE' }}>
                  <td style={STYLES.td}>
                    <div style={{ fontWeight: 600, color: COLORS.text }}>{role.name}</div>
                    {role.description && (
                      <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {role.description}
                      </div>
                    )}
                  </td>
                  <td style={STYLES.td}>
                    <span style={badgeStyle(role.is_system ? COLORS.warning : COLORS.primary)}>
                      {role.is_system ? 'System' : 'Custom'}
                    </span>
                  </td>
                  <td style={STYLES.td}>
                    <span style={badgeStyle(role.is_active ? COLORS.success : COLORS.danger)}>
                      {role.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ ...STYLES.td, textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                      {can('admin:roles:view') && (
                        <button onClick={() => setPermRole(role)}
                          style={{ fontSize: 12, color: COLORS.primary, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Permissions</button>
                      )}
                      {can('admin:roles:edit') && !role.is_system && (
                        <button onClick={() => setEditRole(role)}
                          style={{ fontSize: 12, color: COLORS.primary, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Edit</button>
                      )}
                      {can('admin:roles:delete') && !role.is_system && (
                        <button onClick={() => handleDelete(role)} disabled={deleteMutation.isPending}
                          style={{ fontSize: 12, color: COLORS.danger, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, opacity: deleteMutation.isPending ? 0.5 : 1 }}>Delete</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showCreate && <RoleFormModal onClose={() => setShowCreate(false)} />}
      {editRole && <RoleFormModal role={editRole} onClose={() => setEditRole(null)} />}
      {permRole && <PermissionMatrixModal role={permRole} allPermissions={allPermissions} onClose={() => setPermRole(null)} />}
    </div>
  )
}
