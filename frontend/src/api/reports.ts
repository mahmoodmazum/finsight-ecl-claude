import apiClient from './client'
import type { ReportDefinition, BBRegulatoryRow, IFRS7DisclosureRow } from '../types'

export const getReportLibrary = async (): Promise<ReportDefinition[]> => {
  const { data } = await apiClient.get<ReportDefinition[]>('/reports/library')
  return data
}

export const generateReport = async (
  report_id: string,
  month: string,
  run_id?: string
): Promise<{ report_id: string; month: string; generated_at: string; row_count: number; status: string }> => {
  const { data } = await apiClient.post('/reports/generate', { report_id, month, run_id })
  return data
}

export const getBBRegulatory = async (month: string): Promise<BBRegulatoryRow[]> => {
  const { data } = await apiClient.get<BBRegulatoryRow[]>('/reports/bb-regulatory', { params: { month } })
  return data
}

export const getIFRS7 = async (period: string): Promise<IFRS7DisclosureRow[]> => {
  const { data } = await apiClient.get<IFRS7DisclosureRow[]>('/reports/ifrs7', { params: { month: period } })
  return data
}

export const downloadReport = async (report_id: string, month: string, run_id?: string): Promise<void> => {
  const params: Record<string, string> = { month }
  if (run_id) params.run_id = run_id
  const response = await apiClient.get(`/reports/download/${report_id}`, {
    params,
    responseType: 'blob',
  })
  const url = URL.createObjectURL(new Blob([response.data]))
  const a = document.createElement('a')
  a.href = url
  a.download = `${report_id}_${month}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
