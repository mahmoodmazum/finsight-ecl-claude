import apiClient from './client'
import type { AuditLog, RiskRegister, RiskCreate, PaginatedResponse } from '../types'

interface AuditLogPage extends PaginatedResponse<AuditLog> {}

export const getAuditLog = async (
  event_type?: string,
  entity_type?: string,
  user_id?: string,
  page = 1,
  page_size = 50
): Promise<AuditLogPage> => {
  const { data } = await apiClient.get<AuditLogPage>('/audit/log', {
    params: { event_type, entity_type, user_id, page, page_size },
  })
  return data
}

export const listRisks = async (status?: string, category?: string): Promise<RiskRegister[]> => {
  const { data } = await apiClient.get<RiskRegister[]>('/audit/risk-register', {
    params: { status, category },
  })
  return data
}

export const createRisk = async (body: RiskCreate): Promise<RiskRegister> => {
  const { data } = await apiClient.post<RiskRegister>('/audit/risk-register', body)
  return data
}

export const updateRisk = async (risk_id: string, body: Partial<RiskRegister>): Promise<RiskRegister> => {
  const { data } = await apiClient.put<RiskRegister>(`/audit/risk-register/${risk_id}`, body)
  return data
}

export const deleteRisk = async (risk_id: string): Promise<void> => {
  await apiClient.delete(`/audit/risk-register/${risk_id}`)
}
