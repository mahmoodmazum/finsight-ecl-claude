import apiClient from './client'
import type { ProvisionRun, ProvisionMovement, GLEntry, PaginatedResponse } from '../types'

interface ProvisionRunPage extends PaginatedResponse<ProvisionRun> {}

export const listRuns = async (month?: string, status?: string, page = 1, page_size = 20): Promise<ProvisionRunPage> => {
  const { data } = await apiClient.get<ProvisionRunPage>('/provision/runs', {
    params: { month, status, page, page_size },
  })
  return data
}

export const getRun = async (run_id: string): Promise<ProvisionRun> => {
  const { data } = await apiClient.get<ProvisionRun>(`/provision/runs/${run_id}`)
  return data
}

export const submitRunForApproval = async (run_id: string): Promise<ProvisionRun> => {
  const { data } = await apiClient.post<ProvisionRun>(`/provision/runs/${run_id}/submit`)
  return data
}

export const approveRun = async (run_id: string): Promise<ProvisionRun> => {
  const { data } = await apiClient.post<ProvisionRun>(`/provision/runs/${run_id}/approve`)
  return data
}

export const lockRun = async (run_id: string): Promise<ProvisionRun> => {
  const { data } = await apiClient.post<ProvisionRun>(`/provision/runs/${run_id}/lock`)
  return data
}

export const getRunMovement = async (run_id: string): Promise<ProvisionMovement[]> => {
  const { data } = await apiClient.get<ProvisionMovement[]>(`/provision/runs/${run_id}/movement`)
  return data
}

export const getGLEntries = async (run_id: string): Promise<GLEntry[]> => {
  const { data } = await apiClient.get<GLEntry[]>(`/provision/runs/${run_id}/gl-entries`)
  return data
}
