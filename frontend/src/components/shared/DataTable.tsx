import { type ReactNode } from 'react'
import clsx from 'clsx'

export interface ColumnDef<T> {
  key: string
  header: string
  render?: (row: T) => ReactNode
  className?: string
  headerClassName?: string
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[]
  data: T[]
  totalCount: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  isLoading?: boolean
  searchable?: boolean
  onSearch?: (query: string) => void
  emptyMessage?: string
  rowKey: (row: T) => string | number
}

export function DataTable<T>({
  columns,
  data,
  totalCount,
  page,
  pageSize,
  onPageChange,
  isLoading,
  searchable,
  onSearch,
  emptyMessage = 'No records found.',
  rowKey,
}: DataTableProps<T>) {
  const totalPages = Math.ceil(totalCount / pageSize)
  const start = totalCount === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, totalCount)

  return (
    <div className="flex flex-col gap-3">
      {searchable && onSearch && (
        <div className="flex justify-end">
          <input
            type="search"
            placeholder="Search..."
            className="px-3 py-1.5 text-sm border border-app-border rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-app-border">
        <table className="min-w-full divide-y divide-app-border">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={clsx(
                    'px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider',
                    col.headerClassName
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-app-border">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr key={rowKey(row)} className="hover:bg-gray-50 transition-colors">
                  {columns.map((col) => (
                    <td key={col.key} className={clsx('px-4 py-3 text-sm text-gray-700', col.className)}>
                      {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>
          {totalCount === 0 ? 'No records' : `Showing ${start}–${end} of ${totalCount.toLocaleString()}`}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(1)}
            disabled={page <= 1}
            className="px-2 py-1 rounded border border-app-border disabled:opacity-40 hover:bg-gray-50"
          >
            «
          </button>
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="px-2 py-1 rounded border border-app-border disabled:opacity-40 hover:bg-gray-50"
          >
            ‹
          </button>
          <span className="px-3 py-1 rounded border border-primary bg-primary/5 text-primary font-medium">
            {page}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="px-2 py-1 rounded border border-app-border disabled:opacity-40 hover:bg-gray-50"
          >
            ›
          </button>
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={page >= totalPages}
            className="px-2 py-1 rounded border border-app-border disabled:opacity-40 hover:bg-gray-50"
          >
            »
          </button>
        </div>
      </div>
    </div>
  )
}
