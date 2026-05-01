import apiClient from './client'
import type { ManagementOverlay, OverlayCreate, PaginatedResponse } from '../types'

interface OverlayPage extends PaginatedResponse<ManagementOverlay> {}

export const listOverlays = async (
  status?: string,
  segment_id?: string,
  page = 1,
  page_size = 50
): Promise<OverlayPage> => {
  const { data } = await apiClient.get<OverlayPage>('/overlays/', {
    params: { status, segment_id, page, page_size },
  })
  return data
}

export const submitOverlay = async (body: OverlayCreate): Promise<ManagementOverlay> => {
  const { data } = await apiClient.post<ManagementOverlay>('/overlays/', body)
  return data
}

export const approveOverlay = async (overlay_id: string): Promise<ManagementOverlay> => {
  const { data } = await apiClient.post<ManagementOverlay>(`/overlays/${overlay_id}/approve`)
  return data
}

export const rejectOverlay = async (overlay_id: string): Promise<ManagementOverlay> => {
  const { data } = await apiClient.post<ManagementOverlay>(`/overlays/${overlay_id}/reject`)
  return data
}

export const expireOverlay = async (overlay_id: string): Promise<ManagementOverlay> => {
  const { data } = await apiClient.post<ManagementOverlay>(`/overlays/${overlay_id}/expire`)
  return data
}
