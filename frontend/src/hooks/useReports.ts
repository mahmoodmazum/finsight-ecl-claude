import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getReportLibrary, generateReport, getBBRegulatory, getIFRS7, downloadReport } from '../api/reports'
import toast from 'react-hot-toast'

export const useReportLibrary = () =>
  useQuery({ queryKey: ['reports', 'library'], queryFn: getReportLibrary, staleTime: 300_000 })

export const useGenerateReport = () =>
  useMutation({
    mutationFn: ({ report_id, month, run_id }: { report_id: string; month: string; run_id?: string }) =>
      generateReport(report_id, month, run_id),
    onSuccess: (data) => toast.success(`Report generated: ${data.row_count} rows`),
    onError: () => toast.error('Report generation failed'),
  })

export const useBBRegulatory = (month: string) =>
  useQuery({
    queryKey: ['reports', 'bb-regulatory', month],
    queryFn: () => getBBRegulatory(month),
    enabled: !!month,
    staleTime: 60_000,
  })

export const useIFRS7 = (period: string) =>
  useQuery({
    queryKey: ['reports', 'ifrs7', period],
    queryFn: () => getIFRS7(period),
    enabled: !!period,
    staleTime: 60_000,
  })

export const useDownloadReport = () =>
  useMutation({
    mutationFn: ({ report_id, month, run_id }: { report_id: string; month: string; run_id?: string }) =>
      downloadReport(report_id, month, run_id),
    onSuccess: () => toast.success('Download started'),
    onError: () => toast.error('Download failed'),
  })
