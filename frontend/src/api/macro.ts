import apiClient from './client'
import type { MacroScenario, SensitivityResponse } from '../types'

export const listScenarios = async (month: string): Promise<MacroScenario[]> => {
  const { data } = await apiClient.get<MacroScenario[]>('/macro/scenarios', { params: { month } })
  return data
}

export const createScenario = async (body: Omit<MacroScenario, 'scenario_id' | 'status' | 'approved_by' | 'approved_at'>): Promise<MacroScenario> => {
  const { data } = await apiClient.post<MacroScenario>('/macro/scenarios', body)
  return data
}

export const updateScenario = async (scenario_id: string, body: Partial<MacroScenario>): Promise<MacroScenario> => {
  const { data } = await apiClient.put<MacroScenario>(`/macro/scenarios/${scenario_id}`, body)
  return data
}

export const approveScenario = async (scenario_id: string): Promise<MacroScenario> => {
  const { data } = await apiClient.post<MacroScenario>(`/macro/scenarios/${scenario_id}/approve`)
  return data
}

export const getIndicators = async (month: string): Promise<MacroScenario[]> => {
  const { data } = await apiClient.get<MacroScenario[]>('/macro/indicators', { params: { month } })
  return data
}

export const getSensitivity = async (month: string): Promise<SensitivityResponse> => {
  const { data } = await apiClient.get<SensitivityResponse>('/macro/sensitivity', { params: { month } })
  return data
}
