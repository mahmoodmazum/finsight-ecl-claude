import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  listUsers, createUser, updateUser, deactivateUser, activateUser,
  listRoles, assignRoleToUser, removeRoleFromUser,
} from '../../../api/admin'
import type { AdminUser, AdminRole, UserCreatePayload } from '../../../types'
import { usePermissions } from '../../../hooks/usePermissions'

// ── Helpers ──────────────────────────────────────────────────────────────────

function RoleBadge({ name }: { name: string }) {
  const colors: Record<string, string> = {
    SUPER_ADMIN: 'bg-red-100 text-red-700 border-red-200',
    CRO:         'bg-purple-100 text-purple-700 border-purple-200',
    ANALYST:     'bg-blue-100 text-blue-700 border-blue-200',
    VIEWER:      'bg-gray-100 text-gray-600 border-gray-200',
  }
  const cls = colors[name] ?? 'bg-emerald-100 text-emerald-700 border-emerald-200'
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${cls}`}>
      {name}
    </span>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  )
}

// ── Create User Modal ────────────────────────────────────────────────────────

function CreateUserModal({ roles, onClose }: { roles: AdminRole[]; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<UserCreatePayload & { role: string }>({
    email: '', full_name: '', password: '', role: 'VIEWER',
  })

  const mutation = useMutation({
    mutationFn: (data: UserCreatePayload) => createUser(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success('User created')
      onClose()
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? 'Failed to create user'),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white border border-app-border rounded-xl w-full max-w-md p-6 shadow-xl">
        <h2 className="text-base font-semibold text-gray-900 mb-5">Create User</h2>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form) }} className="space-y-4">
          <Field label="Full Name">
            <input required value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="input w-full" placeholder="John Smith" />
          </Field>
          <Field label="Email">
            <input type="email" required value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input w-full" placeholder="john@example.com" />
          </Field>
          <Field label="Password">
            <input type="password" required value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="input w-full" placeholder="Min 8 characters" />
          </Field>
          <Field label="Legacy Role">
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="input w-full">
              {['VIEWER', 'ANALYST', 'CRO', 'ADMIN'].map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
              {mutation.isPending ? 'Creating…' : 'Create User'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Edit User Modal ──────────────────────────────────────────────────────────

function EditUserModal({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ full_name: user.full_name, email: user.email })

  const mutation = useMutation({
    mutationFn: () => updateUser(user.user_id, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('User updated'); onClose() },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? 'Update failed'),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white border border-app-border rounded-xl w-full max-w-md p-6 shadow-xl">
        <h2 className="text-base font-semibold text-gray-900 mb-5">Edit User</h2>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate() }} className="space-y-4">
          <Field label="Full Name">
            <input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="input w-full" />
          </Field>
          <Field label="Email">
            <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input w-full" />
          </Field>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
              {mutation.isPending ? 'Saving…' : 'Save'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Manage Roles Modal ───────────────────────────────────────────────────────

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white border border-app-border rounded-xl w-full max-w-lg p-6 shadow-xl">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Manage Roles</h2>
        <p className="text-sm text-gray-500 mb-5">{user.full_name} — {user.email}</p>

        <div className="mb-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Current Roles</p>
          {user.roles.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No roles assigned</p>
          ) : (
            <div className="space-y-2">
              {user.roles.map((roleName) => {
                const roleObj = allRoles.find((r) => r.name === roleName)
                return (
                  <div key={roleName} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 border border-app-border">
                    <RoleBadge name={roleName} />
                    {roleObj && !roleObj.is_system ? (
                      <button onClick={() => removeMutation.mutate(roleObj.role_id)} disabled={removeMutation.isPending}
                        className="text-xs text-red-500 hover:text-red-700 transition-colors">
                        Remove
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">System</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {availableRoles.length > 0 && (
          <div className="border-t border-app-border pt-4 mb-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Assign Role</p>
            <div className="flex gap-2 flex-wrap">
              <select value={selectedRoleId} onChange={(e) => setSelectedRoleId(e.target.value)} className="input flex-1 min-w-[140px]">
                <option value="">Select role…</option>
                {availableRoles.map((r) => <option key={r.role_id} value={r.role_id}>{r.name}</option>)}
              </select>
              <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)}
                className="input w-36" title="Optional expiry date" />
              <button onClick={() => selectedRoleId && assignMutation.mutate()} disabled={!selectedRoleId || assignMutation.isPending}
                className="btn-primary px-4">
                Assign
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button onClick={onClose} className="btn-secondary">Close</button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function UserManagement() {
  const { can } = usePermissions()
  const qc = useQueryClient()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(undefined)
  const [showCreate, setShowCreate] = useState(false)
  const [editUser, setEditUser] = useState<AdminUser | null>(null)
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">{data ? `${data.total} users` : '…'}</p>
        </div>
        {can('admin:users:create') && (
          <button onClick={() => setShowCreate(true)} className="btn-primary">+ Create User</button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search by name or email…" className="input w-64" />
        <select value={activeFilter === undefined ? '' : String(activeFilter)}
          onChange={(e) => { setActiveFilter(e.target.value === '' ? undefined : e.target.value === 'true'); setPage(1) }}
          className="input">
          <option value="">All status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-app-border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-app-border">
            <tr className="text-gray-500 text-xs uppercase tracking-wider">
              <th className="text-left px-4 py-3 font-semibold">User</th>
              <th className="text-left px-4 py-3 font-semibold">Roles</th>
              <th className="text-left px-4 py-3 font-semibold">Status</th>
              <th className="text-left px-4 py-3 font-semibold">Last Login</th>
              <th className="text-right px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-app-border">
            {isLoading ? (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400">Loading…</td></tr>
            ) : data?.items.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400">No users found</td></tr>
            ) : (
              data?.items.map((user) => (
                <tr key={user.user_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{user.full_name}</div>
                    <div className="text-gray-400 text-xs mt-0.5">{user.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {user.roles.length > 0
                        ? user.roles.map((r) => <RoleBadge key={r} name={r} />)
                        : <span className="text-gray-400 text-xs italic">None</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${
                      user.is_active
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3 justify-end">
                      {can('admin:users:edit') && (
                        <button onClick={() => setEditUser(user)} className="text-xs text-primary hover:text-primary-dark font-medium transition-colors">Edit</button>
                      )}
                      {can('admin:users:roles') && (
                        <button onClick={() => setManageRolesUser(user)} className="text-xs text-primary hover:text-primary-dark font-medium transition-colors">Roles</button>
                      )}
                      {can('admin:users:deactivate') && (
                        <button onClick={() => toggleActive.mutate(user)} disabled={toggleActive.isPending}
                          className={`text-xs font-medium transition-colors ${user.is_active ? 'text-red-500 hover:text-red-700' : 'text-emerald-600 hover:text-emerald-800'}`}>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-gray-500">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary disabled:opacity-40">Previous</button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary disabled:opacity-40">Next</button>
          </div>
        </div>
      )}

      {showCreate && <CreateUserModal roles={roles} onClose={() => setShowCreate(false)} />}
      {editUser && <EditUserModal user={editUser} onClose={() => setEditUser(null)} />}
      {manageRolesUser && <ManageRolesModal user={manageRolesUser} allRoles={roles} onClose={() => setManageRolesUser(null)} />}
    </div>
  )
}
