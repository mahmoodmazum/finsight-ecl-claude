import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listRuns, getRun, submitRunForApproval, approveRun, lockRun, getRunMovement, getGLEntries } from '../api/provision'
import toast from 'react-hot-toast'

export const useProvisionRuns = (month?: string, status?: string, page = 1, page_size = 20) =>
  useQuery({
    queryKey: ['provision', 'runs', month, status, page, page_size],
    queryFn: () => listRuns(month, status, page, page_size),
    staleTime: 30_000,
  })

export const useProvisionRun = (run_id: string) =>
  useQuery({
    queryKey: ['provision', 'run', run_id],
    queryFn: () => getRun(run_id),
    enabled: !!run_id,
    staleTime: 30_000,
  })

export const useSubmitRun = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (run_id: string) => submitRunForApproval(run_id),
    onSuccess: () => {
      toast.success('Run submitted for approval')
      qc.invalidateQueries({ queryKey: ['provision'] })
    },
    onError: () => toast.error('Failed to submit run'),
  })
}

export const useApproveRun = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (run_id: string) => approveRun(run_id),
    onSuccess: () => {
      toast.success('Run approved')
      qc.invalidateQueries({ queryKey: ['provision'] })
    },
    onError: () => toast.error('Failed to approve run'),
  })
}

export const useLockRun = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (run_id: string) => lockRun(run_id),
    onSuccess: () => {
      toast.success('Run locked — immutable')
      qc.invalidateQueries({ queryKey: ['provision'] })
    },
    onError: () => toast.error('Failed to lock run'),
  })
}

export const useRunMovement = (run_id: string) =>
  useQuery({
    queryKey: ['provision', 'movement', run_id],
    queryFn: () => getRunMovement(run_id),
    enabled: !!run_id,
    staleTime: 30_000,
  })

export const useGLEntries = (run_id: string) =>
  useQuery({
    queryKey: ['provision', 'gl-entries', run_id],
    queryFn: () => getGLEntries(run_id),
    enabled: !!run_id,
    staleTime: 30_000,
  })
