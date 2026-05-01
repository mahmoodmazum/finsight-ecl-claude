import apiClient from './client'
import type { TokenResponse } from '../types'

export const login = async (email: string, password: string): Promise<TokenResponse> => {
  const { data } = await apiClient.post<TokenResponse>('/auth/login', { email, password })
  return data
}

export const refreshAuth = async (refreshToken: string): Promise<TokenResponse> => {
  const { data } = await apiClient.post<TokenResponse>('/auth/refresh', { refresh_token: refreshToken })
  return data
}

export const logout = async (refreshToken: string): Promise<void> => {
  await apiClient.post('/auth/logout', { refresh_token: refreshToken })
}
