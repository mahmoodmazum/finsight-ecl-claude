import apiClient from './client'
import type {
  ECLRunResponse,
  ECLRunStatus,
  ECLResultRow,
  PortfolioSummary,
  ParametersResponse,
  LGDParameterUpdate,
  PaginatedResponse,
} from '../types'

interface ECLResultPage extends PaginatedResponse<ECLResultRow> {
  pages: number
}

export const triggerECLRun = async (month: string, run_type = 'MONTH_END'): Promise<ECLRunResponse> => {
  const { data } = await apiClient.post<ECLRunResponse>('/ecl/run', null, {
    params: { month, run_type },
  })
  return data
}

export const getECLRunStatus = async (run_id: string): Promise<ECLRunStatus> => {
  const { data } = await apiClient.get<ECLRunStatus>(`/ecl/run/${run_id}/status`)
  return data
}

export const getECLResults = async (
  month: string,
  segment?: string,
  stage?: number,
  page = 1,
  page_size = 100
): Promise<ECLResultPage> => {
  const { data } = await apiClient.get<ECLResultPage>('/ecl/results', {
    params: { month, segment, stage, page, page_size },
  })
  return data
}

export const getPortfolioSummary = async (month: string): Promise<PortfolioSummary> => {
  const { data } = await apiClient.get<PortfolioSummary>('/ecl/portfolio-summary', { params: { month } })
  return data
}

export const getECLParameters = async (month: string): Promise<ParametersResponse> => {
  const { data } = await apiClient.get<ParametersResponse>('/ecl/parameters', { params: { month } })
  return data
}

export const updateECLParameters = async (
  month: string,
  updates: LGDParameterUpdate[]
): Promise<ParametersResponse> => {
  const { data } = await apiClient.put<ParametersResponse>('/ecl/parameters', updates, {
    params: { month },
  })
  return data
}
