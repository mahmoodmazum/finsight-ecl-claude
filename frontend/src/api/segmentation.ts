import apiClient from './client'
import type { Segment, PDParameter, LGDParameter } from '../types'

export const listSegments = async (): Promise<Segment[]> => {
  const { data } = await apiClient.get<Segment[]>('/segmentation/segments')
  return data
}

export const updateSegment = async (segment_id: string, body: Partial<Segment>): Promise<Segment> => {
  const { data } = await apiClient.put<Segment>(`/segmentation/segments/${segment_id}`, body)
  return data
}

// PD Parameters
export const getPDParameters = async (month: string, segment_id?: string): Promise<PDParameter[]> => {
  const { data } = await apiClient.get<PDParameter[]>('/segmentation/pd-parameters', {
    params: { month, segment_id },
  })
  return data
}

export interface PDParameterPayload {
  segment_id: string
  reporting_month: string
  observation_no: number
  start_month: string
  end_month: string
  total_accounts: number
  default_accounts: number
  observation_weight: number
}

export const createPDParameter = async (body: PDParameterPayload): Promise<PDParameter> => {
  const { data } = await apiClient.post<PDParameter>('/segmentation/pd-parameters', body)
  return data
}

export const updatePDParameter = async (id: string, body: Partial<PDParameterPayload>): Promise<PDParameter> => {
  const { data } = await apiClient.put<PDParameter>(`/segmentation/pd-parameters/${id}`, body)
  return data
}

export const deletePDParameter = async (id: string): Promise<void> => {
  await apiClient.delete(`/segmentation/pd-parameters/${id}`)
}

// LGD Parameters
export const getLGDRules = async (month: string): Promise<LGDParameter[]> => {
  const { data } = await apiClient.get<LGDParameter[]>('/segmentation/lgd-rules', { params: { month } })
  return data
}

export interface LGDParameterPayload {
  segment_id: string
  reporting_month: string
  security_tier: string
  lgd_value: number
  haircut_pct: number
  is_active: boolean
}

export const createLGDParameter = async (body: LGDParameterPayload): Promise<LGDParameter> => {
  const { data } = await apiClient.post<LGDParameter>('/segmentation/lgd-parameters', body)
  return data
}

export const updateLGDParameter = async (id: string, body: Partial<LGDParameterPayload>): Promise<LGDParameter> => {
  const { data } = await apiClient.put<LGDParameter>(`/segmentation/lgd-parameters/${id}`, body)
  return data
}

export const deleteLGDParameter = async (id: string): Promise<void> => {
  await apiClient.delete(`/segmentation/lgd-parameters/${id}`)
}
