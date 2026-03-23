import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ScoreObjective } from '@/components/dashboard/ScoreObjective'

const BRAND_ID = 'brand-123'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

beforeEach(() => {
  mockFetch.mockReset()
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      id: 'obj-1',
      brandId: BRAND_ID,
      targetScore: 70,
      targetDate: new Date('2026-12-31').toISOString(),
      achieved: false,
    }),
  })
})

describe('ScoreObjective — no objective (form)', () => {
  it('shows form when no objective is provided', () => {
    render(<ScoreObjective brandId={BRAND_ID} currentScore={30} objective={null} />)
    expect(screen.getByTestId('objective-form')).toBeInTheDocument()
  })

  it('shows "Définir un objectif" button', () => {
    render(<ScoreObjective brandId={BRAND_ID} currentScore={30} objective={null} />)
    expect(screen.getByText(/Définir un objectif/)).toBeInTheDocument()
  })

  it('shows target score input', () => {
    render(<ScoreObjective brandId={BRAND_ID} currentScore={30} objective={null} />)
    expect(screen.getByTestId('target-score-input')).toBeInTheDocument()
  })

  it('shows target date input', () => {
    render(<ScoreObjective brandId={BRAND_ID} currentScore={30} objective={null} />)
    expect(screen.getByTestId('target-date-input')).toBeInTheDocument()
  })

  it('shows validation error when submitting with empty fields', async () => {
    render(<ScoreObjective brandId={BRAND_ID} currentScore={30} objective={null} />)
    fireEvent.submit(screen.getByTestId('objective-form'))
    await waitFor(() => {
      expect(screen.getByText(/Veuillez renseigner/i)).toBeInTheDocument()
    })
  })

  it('calls fetch POST when form is submitted with valid data', async () => {
    render(<ScoreObjective brandId={BRAND_ID} currentScore={30} objective={null} />)
    fireEvent.change(screen.getByTestId('target-score-input'), { target: { value: '70' } })
    fireEvent.change(screen.getByTestId('target-date-input'), { target: { value: '2026-12-31' } })
    fireEvent.submit(screen.getByTestId('objective-form'))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/objective',
        expect.objectContaining({ method: 'POST' })
      )
    })
  })

  it('shows progress bar after successful objective creation', async () => {
    render(<ScoreObjective brandId={BRAND_ID} currentScore={30} objective={null} />)
    fireEvent.change(screen.getByTestId('target-score-input'), { target: { value: '70' } })
    fireEvent.change(screen.getByTestId('target-date-input'), { target: { value: '2026-12-31' } })
    fireEvent.submit(screen.getByTestId('objective-form'))

    await waitFor(() => {
      expect(screen.getByTestId('objective-progress')).toBeInTheDocument()
    })
  })
})

describe('ScoreObjective — with objective (progress bar)', () => {
  const objective = {
    targetScore: 70,
    targetDate: new Date('2026-12-31').toISOString(),
    achieved: false,
  }

  it('shows progress bar when objective is provided', () => {
    render(<ScoreObjective brandId={BRAND_ID} currentScore={30} objective={objective} />)
    expect(screen.getByTestId('objective-progress')).toBeInTheDocument()
  })

  it('does not show form when objective is provided', () => {
    render(<ScoreObjective brandId={BRAND_ID} currentScore={30} objective={objective} />)
    expect(screen.queryByTestId('objective-form')).not.toBeInTheDocument()
  })

  it('shows current/target score', () => {
    render(<ScoreObjective brandId={BRAND_ID} currentScore={30} objective={objective} />)
    expect(screen.getByText(/30 \/ 70/)).toBeInTheDocument()
  })

  it('shows remaining points', () => {
    render(<ScoreObjective brandId={BRAND_ID} currentScore={30} objective={objective} />)
    expect(screen.getByText(/\+40 pts restants/)).toBeInTheDocument()
  })
})

describe('ScoreObjective — objective achieved', () => {
  it('shows achieved badge when achieved=true', () => {
    const objective = {
      targetScore: 70,
      targetDate: new Date('2026-12-31').toISOString(),
      achieved: true,
    }
    render(<ScoreObjective brandId={BRAND_ID} currentScore={80} objective={objective} />)
    expect(screen.getByTestId('objective-achieved')).toBeInTheDocument()
    expect(screen.getByText(/Objectif atteint/)).toBeInTheDocument()
  })

  it('shows achieved badge when current score >= target score (even if achieved=false)', () => {
    const objective = {
      targetScore: 70,
      targetDate: new Date('2026-12-31').toISOString(),
      achieved: false,
    }
    render(<ScoreObjective brandId={BRAND_ID} currentScore={75} objective={objective} />)
    expect(screen.getByTestId('objective-achieved')).toBeInTheDocument()
  })

  it('does not show achieved badge when current score < target score', () => {
    const objective = {
      targetScore: 70,
      targetDate: new Date('2026-12-31').toISOString(),
      achieved: false,
    }
    render(<ScoreObjective brandId={BRAND_ID} currentScore={50} objective={objective} />)
    expect(screen.queryByTestId('objective-achieved')).not.toBeInTheDocument()
  })
})
