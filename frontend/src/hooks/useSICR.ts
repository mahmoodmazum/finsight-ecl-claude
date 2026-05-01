import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSICRAssessment, getSICRFactorSummary, getSICRRulesConfig, updateSICRRulesConfig } from '../api/sicr'
import type { SICRRulesConfig } from '../types'
import toast from 'react-hot-toast'

export const useSICRAssessment = (month: string, sicr_only = false, page = 1, page_size = 100) =>
  useQuery({
    queryKey: ['sicr', 'assessment', month, sicr_only, page, page_size],
    queryFn: () => getSICRAssessment(month, sicr_only, page, page_size),
    enabled: !!month,
    staleTime: 30_000,
  })

export const useSICRFactorSummary = (month: string) =>
  useQuery({
    queryKey: ['sicr', 'factor-summary', month],
    queryFn: () => getSICRFactorSummary(month),
    enabled: !!month,
    staleTime: 30_000,
  })

export const useSICRRulesConfig = () =>
  useQuery({ queryKey: ['sicr', 'rules-config'], queryFn: getSICRRulesConfig, staleTime: 60_000 })

export const useUpdateSICRRules = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<SICRRulesConfig>) => updateSICRRulesConfig(body),
    onSuccess: () => {
      toast.success('SICR rules updated')
      qc.invalidateQueries({ queryKey: ['sicr', 'rules-config'] })
    },
    onError: () => toast.error('Failed to update SICR rules'),
  })
}
