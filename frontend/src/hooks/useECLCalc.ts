import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  triggerECLRun,
  getECLRunStatus,
  getECLResults,
  getPortfolioSummary,
  getECLParameters,
  updateECLParameters,
} from '../api/eclCalc'
import type { LGDParameterUpdate } from '../types'
import toast from 'react-hot-toast'

export const useTriggerECLRun = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ month, run_type }: { month: string; run_type?: string }) =>
      triggerECLRun(month, run_type),
    onSuccess: (data) => {
      toast.success(`ECL run started (ID: ${data.run_id.slice(0, 8)}…)`)
      qc.invalidateQueries({ queryKey: ['ecl'] })
      qc.invalidateQueries({ queryKey: ['provision'] })
    },
    onError: () => toast.error('Failed to trigger ECL run'),
  })
}

export const useECLRunStatus = (run_id: string, enabled = true) =>
  useQuery({
    queryKey: ['ecl', 'run', run_id],
    queryFn: () => getECLRunStatus(run_id),
    enabled: !!run_id && enabled,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'QUEUED' || status === 'RUNNING' ? 3000 : false
    },
  })

export const useECLResults = (month: string, segment?: string, stage?: number, page = 1, page_size = 100) =>
  useQuery({
    queryKey: ['ecl', 'results', month, segment, stage, page, page_size],
    queryFn: () => getECLResults(month, segment, stage, page, page_size),
    enabled: !!month,
    staleTime: 30_000,
  })

export const usePortfolioSummary = (month: string) =>
  useQuery({
    queryKey: ['ecl', 'portfolio-summary', month],
    queryFn: () => getPortfolioSummary(month),
    enabled: !!month,
    staleTime: 30_000,
  })

export const useECLParameters = (month: string) =>
  useQuery({
    queryKey: ['ecl', 'parameters', month],
    queryFn: () => getECLParameters(month),
    enabled: !!month,
    staleTime: 60_000,
  })

export const useUpdateECLParameters = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ month, updates }: { month: string; updates: LGDParameterUpdate[] }) =>
      updateECLParameters(month, updates),
    onSuccess: (_, vars) => {
      toast.success('LGD parameters updated')
      qc.invalidateQueries({ queryKey: ['ecl', 'parameters', vars.month] })
    },
    onError: () => toast.error('Failed to update parameters'),
  })
}
