import apiClient from './client'
import type { DashboardSummary } from '../types'

export const getDashboardSummary = async (month: string): Promise<DashboardSummary> => {
  const { data } = await apiClient.get<DashboardSummary>('/dashboard/summary', { params: { month } })
  return data
}
