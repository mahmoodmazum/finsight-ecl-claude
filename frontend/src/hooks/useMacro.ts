import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listScenarios, createScenario, updateScenario, approveScenario, getIndicators, getSensitivity } from '../api/macro'
import type { MacroScenario } from '../types'
import toast from 'react-hot-toast'

export const useMacroScenarios = (month: string) =>
  useQuery({
    queryKey: ['macro', 'scenarios', month],
    queryFn: () => listScenarios(month),
    enabled: !!month,
    staleTime: 30_000,
  })

export const useCreateScenario = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Parameters<typeof createScenario>[0]) => createScenario(body),
    onSuccess: (data) => {
      toast.success(`Scenario '${data.scenario_name}' created`)
      qc.invalidateQueries({ queryKey: ['macro'] })
    },
    onError: () => toast.error('Failed to create scenario'),
  })
}

export const useUpdateScenario = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ scenario_id, body }: { scenario_id: string; body: Partial<MacroScenario> }) =>
      updateScenario(scenario_id, body),
    onSuccess: () => {
      toast.success('Scenario updated')
      qc.invalidateQueries({ queryKey: ['macro'] })
    },
    onError: () => toast.error('Failed to update scenario'),
  })
}

export const useApproveScenario = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (scenario_id: string) => approveScenario(scenario_id),
    onSuccess: () => {
      toast.success('Scenario approved')
      qc.invalidateQueries({ queryKey: ['macro'] })
    },
    onError: () => toast.error('Failed to approve scenario'),
  })
}

export const useMacroIndicators = (month: string) =>
  useQuery({
    queryKey: ['macro', 'indicators', month],
    queryFn: () => getIndicators(month),
    enabled: !!month,
    staleTime: 30_000,
  })

export const useMacroSensitivity = (month: string) =>
  useQuery({
    queryKey: ['macro', 'sensitivity', month],
    queryFn: () => getSensitivity(month),
    enabled: !!month,
    staleTime: 30_000,
  })
