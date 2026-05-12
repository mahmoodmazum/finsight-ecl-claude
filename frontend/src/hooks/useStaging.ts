import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getStagingResults, getMigrationMatrix, submitStageOverride, approveStageOverride, runStagingEngine, getStagingRunStatus } from '../api/staging'
import toast from 'react-hot-toast'

export const useStagingResults = (month: string, stage?: number, overrides_only = false, page = 1, page_size = 100) =>
  useQuery({
    queryKey: ['staging', 'results', month, stage, overrides_only, page, page_size],
    queryFn: () => getStagingResults(month, stage, overrides_only, page, page_size),
    enabled: !!month,
    staleTime: 30_000,
  })

export const useMigrationMatrix = (month: string, segment_id?: string) =>
  useQuery({
    queryKey: ['staging', 'matrix', month, segment_id],
    queryFn: () => getMigrationMatrix(month, segment_id),
    enabled: !!month,
    staleTime: 60_000,
  })

export const useSubmitOverride = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: submitStageOverride,
    onSuccess: () => {
      toast.success('Override submitted — awaiting dual approval')
      qc.invalidateQueries({ queryKey: ['staging'] })
    },
    onError: () => toast.error('Failed to submit override'),
  })
}

export const useApproveOverride = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (staging_id: number) => approveStageOverride(staging_id),
    onSuccess: () => {
      toast.success('Override approved')
      qc.invalidateQueries({ queryKey: ['staging'] })
    },
    onError: () => toast.error('Failed to approve override'),
  })
}

export const useRunStaging = () =>
  useMutation({
    mutationFn: (month: string) => runStagingEngine(month),
    onError: () => toast.error('Failed to start staging run'),
  })

export const useStagingRunStatus = (run_id: string | null) =>
  useQuery({
    queryKey: ['staging', 'run', run_id],
    queryFn: () => getStagingRunStatus(run_id!),
    enabled: !!run_id,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (!status || status === 'PENDING' || status === 'RUNNING') return 2000
      return false
    },
  })
