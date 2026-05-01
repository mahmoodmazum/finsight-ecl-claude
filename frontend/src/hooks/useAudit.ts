import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAuditLog, listRisks, createRisk, updateRisk, deleteRisk } from '../api/audit'
import type { RiskCreate, RiskRegister } from '../types'
import toast from 'react-hot-toast'

export const useAuditLog = (event_type?: string, entity_type?: string, user_id?: string, page = 1, page_size = 50) =>
  useQuery({
    queryKey: ['audit', 'log', event_type, entity_type, user_id, page, page_size],
    queryFn: () => getAuditLog(event_type, entity_type, user_id, page, page_size),
    staleTime: 10_000,
  })

export const useRiskRegister = (status?: string, category?: string) =>
  useQuery({
    queryKey: ['audit', 'risks', status, category],
    queryFn: () => listRisks(status, category),
    staleTime: 30_000,
  })

export const useCreateRisk = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: RiskCreate) => createRisk(body),
    onSuccess: () => {
      toast.success('Risk item created')
      qc.invalidateQueries({ queryKey: ['audit', 'risks'] })
    },
    onError: () => toast.error('Failed to create risk item'),
  })
}

export const useUpdateRisk = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ risk_id, body }: { risk_id: string; body: Partial<RiskRegister> }) =>
      updateRisk(risk_id, body),
    onSuccess: () => {
      toast.success('Risk item updated')
      qc.invalidateQueries({ queryKey: ['audit', 'risks'] })
    },
    onError: () => toast.error('Failed to update risk item'),
  })
}

export const useDeleteRisk = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (risk_id: string) => deleteRisk(risk_id),
    onSuccess: () => {
      toast.success('Risk item deleted')
      qc.invalidateQueries({ queryKey: ['audit', 'risks'] })
    },
    onError: () => toast.error('Failed to delete risk item'),
  })
}
