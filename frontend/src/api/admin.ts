import apiClient from './client'
import type {
  AdminUser,
  AdminUserPage,
  UserCreatePayload,
  UserUpdatePayload,
  UserRoleAssign,
  AdminRole,
  AdminRoleCreate,
  AdminRoleUpdate,
  AdminPermission,
} from '../types'

// ── Users ───────────────────────────────────────────────────────────────────

export const listUsers = async (params: {
  page?: number
  page_size?: number
  search?: string
  is_active?: boolean
}): Promise<AdminUserPage> => {
  const { data } = await apiClient.get<AdminUserPage>('/admin/users', { params })
  return data
}

export const createUser = async (body: UserCreatePayload): Promise<AdminUser> => {
  const { data } = await apiClient.post<AdminUser>('/admin/users', body)
  return data
}

export const updateUser = async (
  userId: string,
  body: UserUpdatePayload
): Promise<AdminUser> => {
  const { data } = await apiClient.put<AdminUser>(`/admin/users/${userId}`, body)
  return data
}

export const deactivateUser = async (userId: string): Promise<void> => {
  await apiClient.post(`/admin/users/${userId}/deactivate`)
}

export const activateUser = async (userId: string): Promise<void> => {
  await apiClient.post(`/admin/users/${userId}/activate`)
}

export const getUserRoles = async (userId: string): Promise<string[]> => {
  const { data } = await apiClient.get<string[]>(`/admin/users/${userId}/roles`)
  return data
}

export const assignRoleToUser = async (
  userId: string,
  body: UserRoleAssign
): Promise<void> => {
  await apiClient.post(`/admin/users/${userId}/roles`, body)
}

export const removeRoleFromUser = async (
  userId: string,
  roleId: string
): Promise<void> => {
  await apiClient.delete(`/admin/users/${userId}/roles/${roleId}`)
}

// ── Roles ────────────────────────────────────────────────────────────────────

export const listRoles = async (): Promise<AdminRole[]> => {
  const { data } = await apiClient.get<AdminRole[]>('/admin/roles')
  return data
}

export const createRole = async (body: AdminRoleCreate): Promise<AdminRole> => {
  const { data } = await apiClient.post<AdminRole>('/admin/roles', body)
  return data
}

export const updateRole = async (
  roleId: string,
  body: AdminRoleUpdate
): Promise<AdminRole> => {
  const { data } = await apiClient.put<AdminRole>(`/admin/roles/${roleId}`, body)
  return data
}

export const deleteRole = async (roleId: string): Promise<void> => {
  await apiClient.delete(`/admin/roles/${roleId}`)
}

export const getRolePermissions = async (
  roleId: string
): Promise<AdminPermission[]> => {
  const { data } = await apiClient.get<AdminPermission[]>(
    `/admin/roles/${roleId}/permissions`
  )
  return data
}

export const setRolePermissions = async (
  roleId: string,
  permissionIds: string[]
): Promise<AdminPermission[]> => {
  const { data } = await apiClient.post<AdminPermission[]>(
    `/admin/roles/${roleId}/permissions`,
    { permission_ids: permissionIds }
  )
  return data
}

// ── Permissions ──────────────────────────────────────────────────────────────

export const listPermissions = async (): Promise<
  Record<string, AdminPermission[]>
> => {
  const { data } = await apiClient.get<Record<string, AdminPermission[]>>(
    '/admin/permissions'
  )
  return data
}
