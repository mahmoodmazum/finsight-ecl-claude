import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBadge } from '../StatusBadge'

describe('StatusBadge', () => {
  it('renders status text with underscores replaced by spaces', () => {
    render(<StatusBadge status="PENDING_APPROVAL" />)
    expect(screen.getByText('PENDING APPROVAL')).toBeInTheDocument()
  })

  it('renders known status DRAFT', () => {
    render(<StatusBadge status="DRAFT" />)
    expect(screen.getByText('DRAFT')).toBeInTheDocument()
  })

  it('renders known status APPROVED', () => {
    render(<StatusBadge status="APPROVED" />)
    expect(screen.getByText('APPROVED')).toBeInTheDocument()
  })

  it('renders known status LOCKED', () => {
    render(<StatusBadge status="LOCKED" />)
    expect(screen.getByText('LOCKED')).toBeInTheDocument()
  })

  it('renders known status RUNNING', () => {
    render(<StatusBadge status="RUNNING" />)
    expect(screen.getByText('RUNNING')).toBeInTheDocument()
  })

  it('renders known status QUEUED', () => {
    render(<StatusBadge status="QUEUED" />)
    expect(screen.getByText('QUEUED')).toBeInTheDocument()
  })

  it('renders known status FAILED with red style', () => {
    const { container } = render(<StatusBadge status="FAILED" />)
    const badge = container.firstChild as HTMLElement
    expect(badge.className).toContain('red')
  })

  it('renders unknown status with fallback gray style', () => {
    const { container } = render(<StatusBadge status="UNKNOWN_STATUS" />)
    const badge = container.firstChild as HTMLElement
    expect(badge.className).toContain('gray')
  })

  it('renders size sm with smaller padding', () => {
    const { container } = render(<StatusBadge status="DRAFT" size="sm" />)
    const badge = container.firstChild as HTMLElement
    expect(badge.className).toContain('text-xs')
  })

  it('renders size md (default) with standard padding', () => {
    const { container } = render(<StatusBadge status="DRAFT" />)
    const badge = container.firstChild as HTMLElement
    expect(badge.className).toContain('text-sm')
  })

  it('renders as a span element', () => {
    const { container } = render(<StatusBadge status="ACTIVE" />)
    expect(container.firstChild?.nodeName).toBe('SPAN')
  })
})
