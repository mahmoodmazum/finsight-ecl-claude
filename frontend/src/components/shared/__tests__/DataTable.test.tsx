import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DataTable, type ColumnDef } from '../DataTable'

interface Row {
  id: number
  name: string
  amount: number
}

const columns: ColumnDef<Row>[] = [
  { key: 'id', header: 'ID' },
  { key: 'name', header: 'Name' },
  { key: 'amount', header: 'Amount', render: (r) => `৳${r.amount}` },
]

const makeRows = (n: number): Row[] =>
  Array.from({ length: n }, (_, i) => ({ id: i + 1, name: `Loan ${i + 1}`, amount: (i + 1) * 100 }))

describe('DataTable', () => {
  it('renders column headers', () => {
    render(
      <DataTable
        columns={columns}
        data={[]}
        totalCount={0}
        page={1}
        pageSize={10}
        onPageChange={() => {}}
        rowKey={(r) => r.id}
      />
    )
    expect(screen.getByText('ID')).toBeInTheDocument()
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Amount')).toBeInTheDocument()
  })

  it('renders empty message when no data', () => {
    render(
      <DataTable
        columns={columns}
        data={[]}
        totalCount={0}
        page={1}
        pageSize={10}
        onPageChange={() => {}}
        rowKey={(r) => r.id}
        emptyMessage="No loans found."
      />
    )
    expect(screen.getByText('No loans found.')).toBeInTheDocument()
  })

  it('renders row data', () => {
    render(
      <DataTable
        columns={columns}
        data={makeRows(3)}
        totalCount={3}
        page={1}
        pageSize={10}
        onPageChange={() => {}}
        rowKey={(r) => r.id}
      />
    )
    expect(screen.getByText('Loan 1')).toBeInTheDocument()
    expect(screen.getByText('Loan 2')).toBeInTheDocument()
    expect(screen.getByText('৳100')).toBeInTheDocument()
  })

  it('renders custom cell via render function', () => {
    render(
      <DataTable
        columns={columns}
        data={[{ id: 1, name: 'Test', amount: 999 }]}
        totalCount={1}
        page={1}
        pageSize={10}
        onPageChange={() => {}}
        rowKey={(r) => r.id}
      />
    )
    expect(screen.getByText('৳999')).toBeInTheDocument()
  })

  it('shows loading skeletons when isLoading=true', () => {
    const { container } = render(
      <DataTable
        columns={columns}
        data={[]}
        totalCount={0}
        page={1}
        pageSize={10}
        onPageChange={() => {}}
        isLoading
        rowKey={(r) => r.id}
      />
    )
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })

  it('does not render data rows when loading', () => {
    render(
      <DataTable
        columns={columns}
        data={makeRows(5)}
        totalCount={5}
        page={1}
        pageSize={10}
        onPageChange={() => {}}
        isLoading
        rowKey={(r) => r.id}
      />
    )
    expect(screen.queryByText('Loan 1')).toBeNull()
  })

  it('shows pagination count text', () => {
    render(
      <DataTable
        columns={columns}
        data={makeRows(10)}
        totalCount={50}
        page={1}
        pageSize={10}
        onPageChange={() => {}}
        rowKey={(r) => r.id}
      />
    )
    expect(screen.getByText(/Showing 1–10 of 50/)).toBeInTheDocument()
  })

  it('calls onPageChange when next page clicked', () => {
    const onPageChange = vi.fn()
    render(
      <DataTable
        columns={columns}
        data={makeRows(10)}
        totalCount={50}
        page={1}
        pageSize={10}
        onPageChange={onPageChange}
        rowKey={(r) => r.id}
      />
    )
    fireEvent.click(screen.getByText('›'))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('prev button is disabled on page 1', () => {
    render(
      <DataTable
        columns={columns}
        data={makeRows(5)}
        totalCount={50}
        page={1}
        pageSize={10}
        onPageChange={() => {}}
        rowKey={(r) => r.id}
      />
    )
    const prevBtn = screen.getByText('‹')
    expect(prevBtn).toBeDisabled()
  })

  it('shows search input when searchable=true', () => {
    render(
      <DataTable
        columns={columns}
        data={[]}
        totalCount={0}
        page={1}
        pageSize={10}
        onPageChange={() => {}}
        rowKey={(r) => r.id}
        searchable
        onSearch={() => {}}
      />
    )
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument()
  })

  it('does not show search input when searchable=false', () => {
    render(
      <DataTable
        columns={columns}
        data={[]}
        totalCount={0}
        page={1}
        pageSize={10}
        onPageChange={() => {}}
        rowKey={(r) => r.id}
      />
    )
    expect(screen.queryByPlaceholderText('Search...')).toBeNull()
  })
})
