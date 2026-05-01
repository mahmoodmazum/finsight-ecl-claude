import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listOverlays, submitOverlay, approveOverlay, rejectOverlay, expireOverlay } from '../api/overlays'
import type { OverlayCreate } from '../types'
import toast from 'react-hot-toast'

export const useOverlays = (status?: string, segment_id?: string, page = 1, page_size = 50) =>
  useQuery({
    queryKey: ['overlays', status, segment_id, page, page_size],
    queryFn: () => listOverlays(status, segment_id, page, page_size),
    staleTime: 30_000,
  })

export const useSubmitOverlay = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: OverlayCreate) => submitOverlay(body),
    onSuccess: () => {
      toast.success('Overlay submitted for approval')
      qc.invalidateQueries({ queryKey: ['overlays'] })
    },
    onError: () => toast.error('Failed to submit overlay'),
  })
}

export const useApproveOverlay = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (overlay_id: string) => approveOverlay(overlay_id),
    onSuccess: () => {
      toast.success('Overlay approved')
      qc.invalidateQueries({ queryKey: ['overlays'] })
    },
    onError: () => toast.error('Failed to approve overlay'),
  })
}

export const useRejectOverlay = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (overlay_id: string) => rejectOverlay(overlay_id),
    onSuccess: () => {
      toast.success('Overlay rejected')
      qc.invalidateQueries({ queryKey: ['overlays'] })
    },
    onError: () => toast.error('Failed to reject overlay'),
  })
}

export const useExpireOverlay = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (overlay_id: string) => expireOverlay(overlay_id),
    onSuccess: () => {
      toast.success('Overlay expired')
      qc.invalidateQueries({ queryKey: ['overlays'] })
    },
    onError: () => toast.error('Failed to expire overlay'),
  })
}
