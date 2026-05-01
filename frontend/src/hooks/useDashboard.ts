import { useQuery } from '@tanstack/react-query'
import { getDashboardSummary } from '../api/dashboard'

export const useDashboardSummary = (month: string) =>
  useQuery({
    queryKey: ['dashboard', 'summary', month],
    queryFn: () => getDashboardSummary(month),
    enabled: !!month,
    staleTime: 60_000,
  })
