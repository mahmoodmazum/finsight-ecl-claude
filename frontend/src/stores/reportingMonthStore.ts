import { create } from 'zustand'
import apiClient from '../api/client'

interface ReportingMonthState {
  selectedMonth: string
  availableMonths: string[]
  setMonth: (month: string) => void
  loadAvailableMonths: () => Promise<void>
}

export const useReportingMonthStore = create<ReportingMonthState>((set, get) => ({
  selectedMonth: '',
  availableMonths: [],

  setMonth: (month) => set({ selectedMonth: month }),

  loadAvailableMonths: async () => {
    try {
      const { data } = await apiClient.get<string[]>('/dashboard/available-months')
      const months = data ?? []
      set({
        availableMonths: months,
        selectedMonth: get().selectedMonth || months[0] || '',
      })
    } catch {
      // If endpoint fails, fall back to current calendar month
      const fallback = new Date().toISOString().slice(0, 7).replace('-', '')
      if (!get().selectedMonth) set({ selectedMonth: fallback })
    }
  },
}))
