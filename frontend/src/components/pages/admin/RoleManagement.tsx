import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  listRoles, createRole, updateRole, deleteRole,
  getRolePermissions, setRolePermissions, listPermissions,
} from '../../../api/admin'
import type { AdminRole, AdminPermission } from '../../../types'
import { usePermissions } from '../../../hooks/usePermissions'

const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  data: 'Data Ingestion',
  segmentation: 'Segmentation',
  staging: 'Staging',
  sicr: 'SICR Assessment',
  ecl: 'ECL Calculation',
  macro: 'Macro Scenarios',
  provision: 'Provision & GL',
  overlays: 'Overlays',
  reports: 'Reports',
  governance: 'Model Governance',
  audit: 'Audit Trail',
  admin: 'Administration',
}

// ── Role Form Modal ──────────────────────────────────────────────────────────

function RoleFormModal({ role, onClose }: { role?: AdminRole; onClose: () => void }) {
  const qc = useQueryClient()
  const [name, setName] = useState(role?.name ?? '')
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white border border-app-border rounded-xl w-full max-w-md p-6 shadow-xl">
        <h2 className="text-base font-semibold text-gray-900 mb-5">{role ? 'Edit Role' : 'Create Role'}</h2>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate() }} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Role Name</label>
            <input required value={name} onChange={(e) => setName(e.target.value)}
              className="input w-full" placeholder="e.g. Junior Analyst" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              className="input w-full resize-none" rows={3} placeholder="Optional description…" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
              {mutation.isPending ? 'Saving…' : role ? 'Save' : 'Create'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Permission Matrix Modal ──────────────────────────────────────────────────

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white border border-app-border rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-xl">
        <div className="px-6 py-4 border-b border-app-border flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Permission Matrix</h2>
            <p className="text-sm text-gray-500">{role.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">{selected.size} selected</span>
            {role.is_system && (
              <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded font-medium">
                System — read only
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="text-center py-8 text-gray-400">Loading permissions…</div>
          ) : (
            modules.map(([module, perms]) => {
              const allChecked = perms.every((p) => selected.has(p.permission_id))
              const someChecked = perms.some((p) => selected.has(p.permission_id))
              return (
                <div key={module}>
                  <div className="flex items-center gap-2 mb-2">
                    {!role.is_system && (
                      <input type="checkbox" checked={allChecked}
                        ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked }}
                        onChange={() => toggleModule(perms)}
                        className="w-4 h-4 rounded accent-primary cursor-pointer" />
                    )}
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {MODULE_LABELS[module] ?? module}
                    </p>
                  </div>
                  <div className={`grid grid-cols-1 md:grid-cols-2 gap-1.5 ${!role.is_system ? 'ml-6' : ''}`}>
                    {perms.map((perm) => (
                      <label key={perm.permission_id}
                        className={`flex items-start gap-3 bg-gray-50 hover:bg-gray-100 rounded-lg px-3 py-2 border border-app-border transition-colors ${
                          role.is_system ? 'cursor-default' : 'cursor-pointer'
                        }`}>
                        <input type="checkbox" checked={selected.has(perm.permission_id)}
                          onChange={() => toggle(perm.permission_id)}
                          disabled={role.is_system}
                          className="mt-0.5 w-4 h-4 rounded accent-primary flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm text-gray-800 font-medium">{perm.name}</p>
                          <p className="text-xs text-gray-400 font-mono">{perm.code}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="px-6 py-4 border-t border-app-border flex gap-3 justify-end">
          {!role.is_system && (
            <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="btn-primary">
              {saveMutation.isPending ? 'Saving…' : 'Save Permissions'}
            </button>
          )}
          <button onClick={onClose} className="btn-secondary">Close</button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function RoleManagement() {
  const { can } = usePermissions()
  const qc = useQueryClient()

  const [showCreate, setShowCreate] = useState(false)
  const [editRole, setEditRole] = useState<AdminRole | null>(null)
  const [permRole, setPermRole] = useState<AdminRole | null>(null)

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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Role Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {roles.length} roles · {totalPermCount} permissions
          </p>
        </div>
        {can('admin:roles:create') && (
          <button onClick={() => setShowCreate(true)} className="btn-primary">+ Create Role</button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-app-border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-app-border">
            <tr className="text-gray-500 text-xs uppercase tracking-wider">
              <th className="text-left px-4 py-3 font-semibold">Role</th>
              <th className="text-left px-4 py-3 font-semibold">Type</th>
              <th className="text-left px-4 py-3 font-semibold">Status</th>
              <th className="text-right px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-app-border">
            {isLoading ? (
              <tr><td colSpan={4} className="text-center py-12 text-gray-400">Loading…</td></tr>
            ) : roles.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-12 text-gray-400">No roles found</td></tr>
            ) : (
              roles.map((role) => (
                <tr key={role.role_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{role.name}</div>
                    {role.description && (
                      <div className="text-gray-400 text-xs mt-0.5 max-w-xs truncate">{role.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {role.is_system ? (
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium border bg-amber-50 text-amber-700 border-amber-200">System</span>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium border bg-blue-50 text-blue-700 border-blue-200">Custom</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${
                      role.is_active
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      {role.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3 justify-end">
                      {can('admin:roles:view') && (
                        <button onClick={() => setPermRole(role)} className="text-xs text-primary hover:text-primary-dark font-medium transition-colors">
                          Permissions
                        </button>
                      )}
                      {can('admin:roles:edit') && !role.is_system && (
                        <button onClick={() => setEditRole(role)} className="text-xs text-primary hover:text-primary-dark font-medium transition-colors">
                          Edit
                        </button>
                      )}
                      {can('admin:roles:delete') && !role.is_system && (
                        <button onClick={() => handleDelete(role)} disabled={deleteMutation.isPending}
                          className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors">
                          Delete
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

      {showCreate && <RoleFormModal onClose={() => setShowCreate(false)} />}
      {editRole && <RoleFormModal role={editRole} onClose={() => setEditRole(null)} />}
      {permRole && <PermissionMatrixModal role={permRole} allPermissions={allPermissions} onClose={() => setPermRole(null)} />}
    </div>
  )
}
