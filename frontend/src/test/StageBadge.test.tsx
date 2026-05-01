import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StageBadge } from '../components/shared/StageBadge'

describe('StageBadge', () => {
  it('renders Stage 1 with green styling', () => {
    render(<StageBadge stage={1} />)
    expect(screen.getByText('Stage 1')).toBeInTheDocument()
  })

  it('renders Stage 2 with amber styling', () => {
    render(<StageBadge stage={2} />)
    expect(screen.getByText('Stage 2')).toBeInTheDocument()
  })

  it('renders Stage 3 with red styling', () => {
    render(<StageBadge stage={3} />)
    expect(screen.getByText('Stage 3')).toBeInTheDocument()
  })
})
