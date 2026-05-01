import apiClient from './client'
import type { MLModel, MLModelCreate } from '../types'

export const listModels = async (model_type?: string, status?: string): Promise<MLModel[]> => {
  const { data } = await apiClient.get<MLModel[]>('/governance/models', {
    params: { model_type, status },
  })
  return data
}

export const createModel = async (body: MLModelCreate): Promise<MLModel> => {
  const { data } = await apiClient.post<MLModel>('/governance/models', body)
  return data
}

export const updateModel = async (model_id: string, body: Partial<MLModel>): Promise<MLModel> => {
  const { data } = await apiClient.put<MLModel>(`/governance/models/${model_id}`, body)
  return data
}

export const approveModel = async (model_id: string): Promise<MLModel> => {
  const { data } = await apiClient.post<MLModel>(`/governance/models/${model_id}/approve`)
  return data
}

export const getBacktesting = async (model_type?: string): Promise<MLModel[]> => {
  const { data } = await apiClient.get<MLModel[]>('/governance/backtesting', {
    params: { model_type },
  })
  return data
}

export const getRoadmap = async (): Promise<{ model_id: string; model_name: string; model_type: string; current_status: string; version: string }[]> => {
  const { data } = await apiClient.get('/governance/roadmap')
  return data
}
