import apiClient from './client'
import type { SICRAssessmentRow, SICRFactorSummary, SICRRulesConfig, PaginatedResponse } from '../types'

export const getSICRAssessment = async (
  month: string,
  sicr_only = false,
  page = 1,
  page_size = 100
): Promise<PaginatedResponse<SICRAssessmentRow>> => {
  const { data } = await apiClient.get<PaginatedResponse<SICRAssessmentRow>>('/sicr/assessment', {
    params: { month, sicr_only, page, page_size },
  })
  return data
}

export const getSICRFactorSummary = async (month: string): Promise<SICRFactorSummary> => {
  const { data } = await apiClient.get<SICRFactorSummary>('/sicr/factor-summary', { params: { month } })
  return data
}

export const getSICRRulesConfig = async (): Promise<SICRRulesConfig> => {
  const { data } = await apiClient.get<SICRRulesConfig>('/sicr/rules-config')
  return data
}

export const updateSICRRulesConfig = async (body: Partial<SICRRulesConfig>): Promise<SICRRulesConfig> => {
  const { data } = await apiClient.put<SICRRulesConfig>('/sicr/rules-config', body)
  return data
}
