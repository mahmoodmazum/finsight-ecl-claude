import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listModels, createModel, updateModel, approveModel, getBacktesting, getRoadmap } from '../api/governance'
import type { MLModel, MLModelCreate } from '../types'
import toast from 'react-hot-toast'

export const useMLModels = (model_type?: string, status?: string) =>
  useQuery({
    queryKey: ['governance', 'models', model_type, status],
    queryFn: () => listModels(model_type, status),
    staleTime: 60_000,
  })

export const useCreateModel = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: MLModelCreate) => createModel(body),
    onSuccess: (data) => {
      toast.success(`Model '${data.model_name}' registered`)
      qc.invalidateQueries({ queryKey: ['governance'] })
    },
    onError: () => toast.error('Failed to register model'),
  })
}

export const useUpdateModel = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ model_id, body }: { model_id: string; body: Partial<MLModel> }) =>
      updateModel(model_id, body),
    onSuccess: () => {
      toast.success('Model updated')
      qc.invalidateQueries({ queryKey: ['governance'] })
    },
    onError: () => toast.error('Failed to update model'),
  })
}

export const useApproveModel = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (model_id: string) => approveModel(model_id),
    onSuccess: (data) => {
      toast.success(`Model '${data.model_name}' approved for production`)
      qc.invalidateQueries({ queryKey: ['governance'] })
    },
    onError: () => toast.error('Failed to approve model'),
  })
}

export const useBacktesting = (model_type?: string) =>
  useQuery({
    queryKey: ['governance', 'backtesting', model_type],
    queryFn: () => getBacktesting(model_type),
    staleTime: 60_000,
  })

export const useRoadmap = () =>
  useQuery({
    queryKey: ['governance', 'roadmap'],
    queryFn: getRoadmap,
    staleTime: 60_000,
  })
