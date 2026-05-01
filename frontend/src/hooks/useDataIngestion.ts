import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listSources, getLoadHistory, getQualityIssues, triggerIngestion, uploadMacroCSV } from '../api/dataIngestion'
import toast from 'react-hot-toast'

export const useDataSources = () =>
  useQuery({ queryKey: ['data-ingestion', 'sources'], queryFn: listSources, staleTime: 30_000 })

export const useLoadHistory = (source_id?: string, limit = 50) =>
  useQuery({
    queryKey: ['data-ingestion', 'history', source_id, limit],
    queryFn: () => getLoadHistory(source_id, limit),
    staleTime: 30_000,
  })

export const useQualityIssues = (load_id?: number, page = 1, page_size = 50) =>
  useQuery({
    queryKey: ['data-ingestion', 'quality', load_id, page, page_size],
    queryFn: () => getQualityIssues(load_id, page, page_size),
    staleTime: 30_000,
  })

export const useTriggerIngestion = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (source_id: string) => triggerIngestion(source_id),
    onSuccess: (data) => {
      toast.success(`Ingestion triggered (load #${data.load_id})`)
      qc.invalidateQueries({ queryKey: ['data-ingestion'] })
    },
    onError: () => toast.error('Failed to trigger ingestion'),
  })
}

export const useUploadMacroCSV = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => uploadMacroCSV(file),
    onSuccess: (data) => {
      toast.success(`Uploaded ${data.filename} — ${data.rows_processed} rows`)
      qc.invalidateQueries({ queryKey: ['data-ingestion'] })
    },
    onError: () => toast.error('Upload failed'),
  })
}
