import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ConfidenceBadge } from '@/components/dashboard/ConfidenceBadge'

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ConfidenceBadge — 4/4 (full confidence)', () => {
  it('displays "Confiance élevée" text', () => {
    render(<ConfidenceBadge llmCount={4} totalLlms={4} />)
    const badge = screen.getByTestId('confidence-badge')
    expect(badge).toHaveTextContent('Confiance élevée')
  })

  it('has green styling classes', () => {
    render(<ConfidenceBadge llmCount={4} totalLlms={4} />)
    const badge = screen.getByTestId('confidence-badge')
    expect(badge.className).toContain('emerald')
  })

  it('displays the count ratio 4/4', () => {
    render(<ConfidenceBadge llmCount={4} totalLlms={4} />)
    expect(screen.getByTestId('confidence-badge')).toHaveTextContent('4/4')
  })
})

describe('ConfidenceBadge — 3/4 (medium confidence)', () => {
  it('displays "Confiance moyenne" text', () => {
    render(<ConfidenceBadge llmCount={3} totalLlms={4} />)
    expect(screen.getByTestId('confidence-badge')).toHaveTextContent('Confiance moyenne')
  })

  it('has orange styling classes', () => {
    render(<ConfidenceBadge llmCount={3} totalLlms={4} />)
    expect(screen.getByTestId('confidence-badge').className).toContain('orange')
  })

  it('displays the count ratio 3/4', () => {
    render(<ConfidenceBadge llmCount={3} totalLlms={4} />)
    expect(screen.getByTestId('confidence-badge')).toHaveTextContent('3/4')
  })
})

describe('ConfidenceBadge — 2/4 (medium confidence)', () => {
  it('displays "Confiance moyenne" for 2/4', () => {
    render(<ConfidenceBadge llmCount={2} totalLlms={4} />)
    expect(screen.getByTestId('confidence-badge')).toHaveTextContent('Confiance moyenne')
  })

  it('has orange styling classes for 2/4', () => {
    render(<ConfidenceBadge llmCount={2} totalLlms={4} />)
    expect(screen.getByTestId('confidence-badge').className).toContain('orange')
  })
})

describe('ConfidenceBadge — 1/4 (low confidence)', () => {
  it('displays "Faible confiance" text', () => {
    render(<ConfidenceBadge llmCount={1} totalLlms={4} />)
    expect(screen.getByTestId('confidence-badge')).toHaveTextContent('Faible confiance')
  })

  it('has red styling classes', () => {
    render(<ConfidenceBadge llmCount={1} totalLlms={4} />)
    expect(screen.getByTestId('confidence-badge').className).toContain('red')
  })

  it('displays the count ratio 1/4', () => {
    render(<ConfidenceBadge llmCount={1} totalLlms={4} />)
    expect(screen.getByTestId('confidence-badge')).toHaveTextContent('1/4')
  })
})

describe('ConfidenceBadge — 0/4 (low confidence)', () => {
  it('displays "Faible confiance" for 0/4', () => {
    render(<ConfidenceBadge llmCount={0} totalLlms={4} />)
    expect(screen.getByTestId('confidence-badge')).toHaveTextContent('Faible confiance')
  })

  it('has red styling classes for 0/4', () => {
    render(<ConfidenceBadge llmCount={0} totalLlms={4} />)
    expect(screen.getByTestId('confidence-badge').className).toContain('red')
  })
})

describe('ConfidenceBadge — default totalLlms', () => {
  it('defaults to 4 total LLMs when totalLlms not provided', () => {
    render(<ConfidenceBadge llmCount={4} />)
    expect(screen.getByTestId('confidence-badge')).toHaveTextContent('4/4')
    expect(screen.getByTestId('confidence-badge')).toHaveTextContent('Confiance élevée')
  })
})

describe('ConfidenceBadge — renders as inline badge', () => {
  it('renders a span element with inline-flex', () => {
    render(<ConfidenceBadge llmCount={3} />)
    const badge = screen.getByTestId('confidence-badge')
    expect(badge.tagName.toLowerCase()).toBe('span')
    expect(badge.className).toContain('inline-flex')
  })
})
