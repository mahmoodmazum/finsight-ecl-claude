import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MetricCard } from '../MetricCard'

describe('MetricCard', () => {
  it('renders title and value', () => {
    render(<MetricCard title="Total ECL" value="৳1,234.56 Cr" />)
    expect(screen.getByText('Total ECL')).toBeInTheDocument()
    expect(screen.getByText('৳1,234.56 Cr')).toBeInTheDocument()
  })

  it('renders subtitle when provided', () => {
    render(<MetricCard title="ECL" value="100" subtitle="vs prior month" />)
    expect(screen.getByText('vs prior month')).toBeInTheDocument()
  })

  it('does not render subtitle when not provided', () => {
    const { queryByText } = render(<MetricCard title="ECL" value="100" />)
    expect(queryByText('vs prior month')).toBeNull()
  })

  it('renders loading skeleton when loading=true', () => {
    const { container } = render(<MetricCard title="ECL" value="100" loading />)
    expect(container.querySelector('.animate-pulse')).not.toBeNull()
  })

  it('does not render animate-pulse when not loading', () => {
    const { container } = render(<MetricCard title="ECL" value="100" />)
    expect(container.querySelector('.animate-pulse')).toBeNull()
  })

  it('renders upward trend with red color', () => {
    const { container } = render(
      <MetricCard title="ECL" value="100" trend={{ value: 5, label: 'vs last month' }} />
    )
    const trendEl = container.querySelector('.text-red-600')
    expect(trendEl).not.toBeNull()
    expect(trendEl?.textContent).toContain('5%')
  })

  it('renders downward trend with green color', () => {
    const { container } = render(
      <MetricCard title="ECL" value="100" trend={{ value: -3, label: 'improvement' }} />
    )
    const trendEl = container.querySelector('.text-green-600')
    expect(trendEl).not.toBeNull()
    expect(trendEl?.textContent).toContain('3%')
  })

  it('renders stage1 variant with left border', () => {
    const { container } = render(<MetricCard title="Stage 1" value="500" variant="stage1" />)
    expect(container.firstChild?.toString()).toBeTruthy()
    const card = container.firstChild as HTMLElement
    expect(card.className).toContain('border-l-4')
  })

  it('renders icon when provided', () => {
    render(<MetricCard title="ECL" value="100" icon={<span data-testid="icon">📊</span>} />)
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('renders numeric value as string', () => {
    render(<MetricCard title="Count" value={42} />)
    expect(screen.getByText('42')).toBeInTheDocument()
  })
})
