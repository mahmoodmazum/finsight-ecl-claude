import apiClient from './client'
import type { StagingResult, PaginatedResponse } from '../types'

interface StagingResultPage extends PaginatedResponse<StagingResult> {}

export const getStagingResults = async (
  month: string,
  stage?: number,
  overrides_only = false,
  page = 1,
  page_size = 100
): Promise<StagingResultPage> => {
  const { data } = await apiClient.get<StagingResultPage>('/staging/results', {
    params: { month, stage, overrides_only, page, page_size },
  })
  return data
}

export const getMigrationMatrix = async (month: string, segment_id?: string) => {
  const { data } = await apiClient.get('/staging/migration-matrix', {
    params: { month, segment_id },
  })
  return data
}

export const submitStageOverride = async (body: {
  staging_id: number
  new_stage: number
  reason: string
}): Promise<StagingResult> => {
  const { data } = await apiClient.post<StagingResult>('/staging/override', body)
  return data
}

export const approveStageOverride = async (staging_id: number): Promise<StagingResult> => {
  const { data } = await apiClient.post<StagingResult>(`/staging/override/${staging_id}/approve`)
  return data
}

export const runStagingEngine = async (month: string) => {
  const { data } = await apiClient.post('/staging/run', null, { params: { month } })
  return data
}
