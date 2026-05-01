import apiClient from './client'
import type { DataSource, DataLoadHistory, DataQualityIssue, PaginatedResponse } from '../types'

export const listSources = async (): Promise<DataSource[]> => {
  const { data } = await apiClient.get<DataSource[]>('/data-ingestion/sources')
  return data
}

export const getLoadHistory = async (source_id?: string, limit = 50): Promise<DataLoadHistory[]> => {
  const { data } = await apiClient.get<DataLoadHistory[]>('/data-ingestion/history', {
    params: { source_id, limit },
  })
  return data
}

export const getQualityIssues = async (
  load_id?: number,
  page = 1,
  page_size = 50
): Promise<PaginatedResponse<DataQualityIssue>> => {
  const { data } = await apiClient.get<PaginatedResponse<DataQualityIssue>>(
    '/data-ingestion/quality',
    { params: { load_id, page, page_size } }
  )
  return data
}

export const triggerIngestion = async (source_id: string): Promise<{ message: string; load_id: number }> => {
  const { data } = await apiClient.post(`/data-ingestion/trigger/${source_id}`)
  return data
}

export const uploadMacroCSV = async (file: File): Promise<{ message: string; filename: string; rows_processed: number }> => {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await apiClient.post('/data-ingestion/upload/macro', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}
