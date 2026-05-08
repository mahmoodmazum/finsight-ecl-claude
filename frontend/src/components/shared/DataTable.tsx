import { type ReactNode } from 'react'
import { COLORS, STYLES, rowBg } from '../../styles/design-system'

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
  const end   = Math.min(page * pageSize, totalCount)

  const paginationBtn = (disabled: boolean): React.CSSProperties => ({
    padding:      '4px 10px',
    borderRadius: 5,
    border:       `1px solid ${COLORS.border}`,
    background:   'transparent',
    color:        disabled ? COLORS.border : COLORS.textMuted,
    cursor:       disabled ? 'default' : 'pointer',
    fontSize:     12,
    fontWeight:   600,
    opacity:      disabled ? 0.4 : 1,
  })

  const activePaginationBtn: React.CSSProperties = {
    padding:      '4px 10px',
    borderRadius: 5,
    border:       `1px solid ${COLORS.primary}`,
    background:   COLORS.primary,
    color:        '#FFFFFF',
    cursor:       'default',
    fontSize:     12,
    fontWeight:   600,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {searchable && onSearch && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <input
            type="search"
            placeholder="Search…"
            style={{ ...STYLES.input, width: 220 }}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
      )}

      <div style={{
        border:       `1px solid ${COLORS.border}`,
        borderRadius: 10,
        overflow:     'hidden',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={col.headerClassName}
                    style={STYLES.th}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} style={rowBg(i)}>
                    {columns.map((col) => (
                      <td key={col.key} style={STYLES.td}>
                        <div className="skeleton" style={{ height: 14 }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    style={{ ...STYLES.td, textAlign: 'center', padding: '40px 14px', color: COLORS.textMuted, borderBottom: 'none' }}
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                data.map((row, idx) => (
                  <tr
                    key={rowKey(row)}
                    style={rowBg(idx)}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = COLORS.primaryLight }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = rowBg(idx).background as string }}
                  >
                    {columns.map((col) => (
                      <td key={col.key} className={col.className} style={STYLES.td}>
                        {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        <div style={{
          background:   '#FFFFFF',
          borderTop:    `1px solid ${COLORS.border}`,
          padding:      '10px 16px',
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 12, color: COLORS.textMuted }}>
            {totalCount === 0 ? 'No records' : `Showing ${start}–${end} of ${totalCount.toLocaleString()}`}
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => onPageChange(1)} disabled={page <= 1} style={paginationBtn(page <= 1)}>«</button>
            <button onClick={() => onPageChange(page - 1)} disabled={page <= 1} style={paginationBtn(page <= 1)}>‹</button>
            <span style={activePaginationBtn}>{page}</span>
            <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} style={paginationBtn(page >= totalPages)}>›</button>
            <button onClick={() => onPageChange(totalPages)} disabled={page >= totalPages} style={paginationBtn(page >= totalPages)}>»</button>
          </div>
        </div>
      </div>
    </div>
  )
}
