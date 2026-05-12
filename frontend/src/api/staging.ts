import apiClient from './client'
import type { StagingResult, PaginatedResponse } from '../types'

interface StagingResultPage extends PaginatedResponse<StagingResult> {}

export interface StagingRunStatus {
  run_id: string
  reporting_month: string
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
  accounts_staged: number | null
  stage1_count: number | null
  stage2_count: number | null
  stage3_count: number | null
  initiated_at: string
  completed_at: string | null
  error_message: string | null
}

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

export const runStagingEngine = async (month: string): Promise<StagingRunStatus> => {
  const { data } = await apiClient.post<StagingRunStatus>('/staging/run', null, { params: { month } })
  return data
}

export const getStagingRunStatus = async (run_id: string): Promise<StagingRunStatus> => {
  const { data } = await apiClient.get<StagingRunStatus>(`/staging/run/${run_id}`)
  return data
}
