import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  listUsers, createUser, updateUser, deactivateUser, activateUser,
  listRoles, assignRoleToUser, removeRoleFromUser,
} from '../../../api/admin'
import type { AdminUser, AdminRole, UserCreatePayload } from '../../../types'
import { usePermissions } from '../../../hooks/usePermissions'
import { COLORS, STYLES, badgeStyle } from '../../../styles/design-system'

// ── Helpers ───────────────────────────────────────────────────────────────────

const roleColors: Record<string, string> = {
  SUPER_ADMIN: COLORS.danger,
  CRO:         '#7C3AED',
  ANALYST:     COLORS.primary,
  VIEWER:      COLORS.textMuted,
}

function RoleBadge({ name }: { name: string }) {
  return (
    <span style={badgeStyle(roleColors[name] ?? COLORS.success)}>{name}</span>
  )
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: COLORS.textMuted, marginBottom: 6 }

// ── Create User Modal ─────────────────────────────────────────────────────────

function CreateUserModal({ roles, onClose }: { roles: AdminRole[]; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<UserCreatePayload & { role: string }>({
    email: '', full_name: '', password: '', role: 'VIEWER',
  })

  const mutation = useMutation({
    mutationFn: (data: UserCreatePayload) => createUser(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('User created'); onClose() },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? 'Failed to create user'),
  })

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(30,42,59,0.45)', backdropFilter: 'blur(2px)', padding: 16 }}>
      <div style={{ background: '#FFFFFF', borderRadius: 12, boxShadow: '0 8px 32px rgba(30,42,59,0.16)', width: '100%', maxWidth: 480, padding: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: COLORS.text, marginBottom: 20 }}>Create User</h2>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form) }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>Full Name</label>
            <input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} style={STYLES.input} placeholder="John Smith" />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={STYLES.input} placeholder="john@example.com" />
          </div>
          <div>
            <label style={labelStyle}>Password</label>
            <input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} style={STYLES.input} placeholder="Min 8 characters" />
          </div>
          <div>
            <label style={labelStyle}>Legacy Role</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} style={STYLES.input}>
              {['VIEWER', 'ANALYST', 'CRO', 'ADMIN'].map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10, paddingTop: 8 }}>
            <button type="submit" disabled={mutation.isPending} style={{ ...STYLES.btnPrimary, flex: 1, opacity: mutation.isPending ? 0.6 : 1 }}>
              {mutation.isPending ? 'Creating…' : 'Create User'}
            </button>
            <button type="button" onClick={onClose} style={{ ...STYLES.btnGhost, flex: 1 }}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Edit User Modal ───────────────────────────────────────────────────────────

function EditUserModal({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ full_name: user.full_name, email: user.email })

  const mutation = useMutation({
    mutationFn: () => updateUser(user.user_id, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('User updated'); onClose() },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? 'Update failed'),
  })

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(30,42,59,0.45)', backdropFilter: 'blur(2px)', padding: 16 }}>
      <div style={{ background: '#FFFFFF', borderRadius: 12, boxShadow: '0 8px 32px rgba(30,42,59,0.16)', width: '100%', maxWidth: 480, padding: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: COLORS.text, marginBottom: 20 }}>Edit User</h2>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate() }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>Full Name</label>
            <input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} style={STYLES.input} />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={STYLES.input} />
          </div>
          <div style={{ display: 'flex', gap: 10, paddingTop: 8 }}>
            <button type="submit" disabled={mutation.isPending} style={{ ...STYLES.btnPrimary, flex: 1, opacity: mutation.isPending ? 0.6 : 1 }}>
              {mutation.isPending ? 'Saving…' : 'Save'}
            </button>
            <button type="button" onClick={onClose} style={{ ...STYLES.btnGhost, flex: 1 }}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Manage Roles Modal ────────────────────────────────────────────────────────

function ManageRolesModal({ user, allRoles, onClose }: { user: AdminUser; allRoles: AdminRole[]; onClose: () => void }) {
  const qc = useQueryClient()
  const [selectedRoleId, setSelectedRoleId] = useState('')
  const [expiresAt, setExpiresAt] = useState('')

  const assignMutation = useMutation({
    mutationFn: () => assignRoleToUser(user.user_id, { role_id: selectedRoleId, expires_at: expiresAt || null }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('Role assigned'); setSelectedRoleId(''); setExpiresAt('') },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? 'Failed to assign role'),
  })

  const removeMutation = useMutation({
    mutationFn: (roleId: string) => removeRoleFromUser(user.user_id, roleId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('Role removed') },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? 'Failed to remove role'),
  })

  const assignedRoleNames = new Set(user.roles)
  const availableRoles = allRoles.filter((r) => !assignedRoleNames.has(r.name))

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(30,42,59,0.45)', backdropFilter: 'blur(2px)', padding: 16 }}>
      <div style={{ background: '#FFFFFF', borderRadius: 12, boxShadow: '0 8px 32px rgba(30,42,59,0.16)', width: '100%', maxWidth: 520, padding: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: COLORS.text, marginBottom: 4 }}>Manage Roles</h2>
        <p style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 20 }}>{user.full_name} — {user.email}</p>

        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Current Roles</p>
          {user.roles.length === 0 ? (
            <p style={{ fontSize: 13, color: COLORS.textMuted, fontStyle: 'italic' }}>No roles assigned</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {user.roles.map((roleName) => {
                const roleObj = allRoles.find((r) => r.name === roleName)
                return (
                  <div key={roleName} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: COLORS.bg, borderRadius: 7, padding: '8px 12px', border: `1px solid ${COLORS.border}` }}>
                    <RoleBadge name={roleName} />
                    {roleObj && !roleObj.is_system ? (
                      <button onClick={() => removeMutation.mutate(roleObj.role_id)} disabled={removeMutation.isPending}
                        style={{ fontSize: 12, color: COLORS.danger, background: 'none', border: 'none', cursor: 'pointer', opacity: removeMutation.isPending ? 0.5 : 1 }}>
                        Remove
                      </button>
                    ) : (
                      <span style={{ fontSize: 12, color: COLORS.textMuted }}>System</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {availableRoles.length > 0 && (
          <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 16, marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Assign Role</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select value={selectedRoleId} onChange={(e) => setSelectedRoleId(e.target.value)} style={{ ...STYLES.input, flex: 1, minWidth: 140 }}>
                <option value="">Select role…</option>
                {availableRoles.map((r) => <option key={r.role_id} value={r.role_id}>{r.name}</option>)}
              </select>
              <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)}
                style={{ ...STYLES.input, width: 144 }} title="Optional expiry date" />
              <button onClick={() => selectedRoleId && assignMutation.mutate()} disabled={!selectedRoleId || assignMutation.isPending}
                style={{ ...STYLES.btnPrimary, opacity: !selectedRoleId || assignMutation.isPending ? 0.5 : 1 }}>
                Assign
              </button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={STYLES.btnGhost}>Close</button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export function UserManagement() {
  const { can } = usePermissions()
  const qc = useQueryClient()

  const [page, setPage]                   = useState(1)
  const [search, setSearch]               = useState('')
  const [activeFilter, setActiveFilter]   = useState<boolean | undefined>(undefined)
  const [showCreate, setShowCreate]       = useState(false)
  const [editUser, setEditUser]           = useState<AdminUser | null>(null)
  const [manageRolesUser, setManageRolesUser] = useState<AdminUser | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, search, activeFilter],
    queryFn: () => listUsers({ page, page_size: 20, search: search || undefined, is_active: activeFilter }),
  })

  const { data: roles = [] } = useQuery({ queryKey: ['admin-roles'], queryFn: listRoles })

  const toggleActive = useMutation({
    mutationFn: (user: AdminUser) => user.is_active ? deactivateUser(user.user_id) : activateUser(user.user_id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('User status updated') },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? 'Action failed'),
  })

  const totalPages = data ? Math.ceil(data.total / data.page_size) : 1

  return (
    <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: COLORS.text, marginBottom: 4 }}>User Management</h1>
          <p style={{ fontSize: 13, color: COLORS.textMuted }}>{data ? `${data.total} users` : '…'}</p>
        </div>
        {can('admin:users:create') && (
          <button onClick={() => setShowCreate(true)} style={STYLES.btnPrimary}>+ Create User</button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search by name or email…" style={{ ...STYLES.input, width: 256 }} />
        <select value={activeFilter === undefined ? '' : String(activeFilter)}
          onChange={(e) => { setActiveFilter(e.target.value === '' ? undefined : e.target.value === 'true'); setPage(1) }}
          style={{ ...STYLES.input, width: 'auto' }}>
          <option value="">All status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      <div style={{ ...STYLES.card, padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['User', 'Roles', 'Status', 'Last Login', ''].map((h) => (
                <th key={h} style={{ ...STYLES.th, textAlign: h === '' ? 'right' : 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} style={{ ...STYLES.td, textAlign: 'center', padding: 48, color: COLORS.textMuted }}>Loading…</td></tr>
            ) : data?.items.length === 0 ? (
              <tr><td colSpan={5} style={{ ...STYLES.td, textAlign: 'center', padding: 48, color: COLORS.textMuted }}>No users found</td></tr>
            ) : (
              data?.items.map((user, idx) => (
                <tr key={user.user_id} style={{ background: idx % 2 === 0 ? '#FFF' : '#FAFBFE' }}>
                  <td style={STYLES.td}>
                    <div style={{ fontWeight: 600, color: COLORS.text }}>{user.full_name}</div>
                    <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>{user.email}</div>
                  </td>
                  <td style={STYLES.td}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {user.roles.length > 0
                        ? user.roles.map((r) => <RoleBadge key={r} name={r} />)
                        : <span style={{ fontSize: 12, color: COLORS.textMuted, fontStyle: 'italic' }}>None</span>}
                    </div>
                  </td>
                  <td style={STYLES.td}>
                    <span style={badgeStyle(user.is_active ? COLORS.success : COLORS.danger)}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ ...STYLES.td, fontSize: 12, color: COLORS.textMuted }}>
                    {user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}
                  </td>
                  <td style={{ ...STYLES.td, textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                      {can('admin:users:edit') && (
                        <button onClick={() => setEditUser(user)}
                          style={{ fontSize: 12, color: COLORS.primary, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Edit</button>
                      )}
                      {can('admin:users:roles') && (
                        <button onClick={() => setManageRolesUser(user)}
                          style={{ fontSize: 12, color: COLORS.primary, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Roles</button>
                      )}
                      {can('admin:users:deactivate') && (
                        <button onClick={() => toggleActive.mutate(user)} disabled={toggleActive.isPending}
                          style={{ fontSize: 12, color: user.is_active ? COLORS.danger : COLORS.success, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, opacity: toggleActive.isPending ? 0.5 : 1 }}>
                          {user.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
          <span style={{ color: COLORS.textMuted }}>Page {page} of {totalPages}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              style={{ ...STYLES.btnGhost, padding: '6px 14px', opacity: page === 1 ? 0.4 : 1 }}>Previous</button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              style={{ ...STYLES.btnGhost, padding: '6px 14px', opacity: page === totalPages ? 0.4 : 1 }}>Next</button>
          </div>
        </div>
      )}

      {showCreate && <CreateUserModal roles={roles} onClose={() => setShowCreate(false)} />}
      {editUser && <EditUserModal user={editUser} onClose={() => setEditUser(null)} />}
      {manageRolesUser && <ManageRolesModal user={manageRolesUser} allRoles={roles} onClose={() => setManageRolesUser(null)} />}
    </div>
  )
}
