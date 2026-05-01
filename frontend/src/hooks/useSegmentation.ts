import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listSegments, updateSegment,
  getPDParameters, createPDParameter, updatePDParameter, deletePDParameter,
  getLGDRules, createLGDParameter, updateLGDParameter, deleteLGDParameter,
  type PDParameterPayload, type LGDParameterPayload,
} from '../api/segmentation'
import type { Segment } from '../types'
import toast from 'react-hot-toast'

export const useSegments = () =>
  useQuery({ queryKey: ['segmentation', 'segments'], queryFn: listSegments, staleTime: 60_000 })

export const useUpdateSegment = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ segment_id, body }: { segment_id: string; body: Partial<Segment> }) =>
      updateSegment(segment_id, body),
    onSuccess: () => {
      toast.success('Segment updated')
      qc.invalidateQueries({ queryKey: ['segmentation'] })
    },
    onError: () => toast.error('Failed to update segment'),
  })
}

// PD Parameters
export const usePDParameters = (month: string, segment_id?: string) =>
  useQuery({
    queryKey: ['segmentation', 'pd-params', month, segment_id],
    queryFn: () => getPDParameters(month, segment_id),
    enabled: !!month,
    staleTime: 30_000,
  })

export const useCreatePDParameter = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: PDParameterPayload) => createPDParameter(body),
    onSuccess: () => {
      toast.success('PD parameter created')
      qc.invalidateQueries({ queryKey: ['segmentation', 'pd-params'] })
    },
    onError: () => toast.error('Failed to create PD parameter'),
  })
}

export const useUpdatePDParameter = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<PDParameterPayload> }) => updatePDParameter(id, body),
    onSuccess: () => {
      toast.success('PD parameter updated')
      qc.invalidateQueries({ queryKey: ['segmentation', 'pd-params'] })
    },
    onError: () => toast.error('Failed to update PD parameter'),
  })
}

export const useDeletePDParameter = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deletePDParameter(id),
    onSuccess: () => {
      toast.success('PD parameter deleted')
      qc.invalidateQueries({ queryKey: ['segmentation', 'pd-params'] })
    },
    onError: () => toast.error('Failed to delete PD parameter'),
  })
}

// LGD Rules
export const useLGDRules = (month: string) =>
  useQuery({
    queryKey: ['segmentation', 'lgd-rules', month],
    queryFn: () => getLGDRules(month),
    enabled: !!month,
    staleTime: 30_000,
  })

export const useCreateLGDParameter = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: LGDParameterPayload) => createLGDParameter(body),
    onSuccess: () => {
      toast.success('LGD rule created')
      qc.invalidateQueries({ queryKey: ['segmentation', 'lgd-rules'] })
    },
    onError: () => toast.error('Failed to create LGD rule'),
  })
}

export const useUpdateLGDParameter = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<LGDParameterPayload> }) => updateLGDParameter(id, body),
    onSuccess: () => {
      toast.success('LGD rule updated')
      qc.invalidateQueries({ queryKey: ['segmentation', 'lgd-rules'] })
    },
    onError: () => toast.error('Failed to update LGD rule'),
  })
}

export const useDeleteLGDParameter = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteLGDParameter(id),
    onSuccess: () => {
      toast.success('LGD rule deleted')
      qc.invalidateQueries({ queryKey: ['segmentation', 'lgd-rules'] })
    },
    onError: () => toast.error('Failed to delete LGD rule'),
  })
}
