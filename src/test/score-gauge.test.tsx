import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ScoreGauge, getScoreCategory } from '@/components/dashboard/ScoreGauge'

// ─── Mock framer-motion ───────────────────────────────────────────────────────

vi.mock('framer-motion', () => ({
  motion: {
    circle: (props: React.SVGProps<SVGCircleElement> & { initial?: unknown; animate?: unknown; transition?: unknown }) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { initial, animate, transition, ...rest } = props
      return <circle {...rest} />
    },
  },
}))

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ScoreGauge — score labels', () => {
  it('score 0 → label "Fantôme"', () => {
    render(<ScoreGauge score={0} />)
    expect(screen.getByTestId('score-label')).toHaveTextContent('Fantôme')
  })

  it('score 24 → label "Fantôme"', () => {
    render(<ScoreGauge score={24} />)
    expect(screen.getByTestId('score-label')).toHaveTextContent('Fantôme')
  })

  it('score 25 → label "Émergent"', () => {
    render(<ScoreGauge score={25} />)
    expect(screen.getByTestId('score-label')).toHaveTextContent('Émergent')
  })

  it('score 30 → label "Émergent"', () => {
    render(<ScoreGauge score={30} />)
    expect(screen.getByTestId('score-label')).toHaveTextContent('Émergent')
  })

  it('score 49 → label "Émergent"', () => {
    render(<ScoreGauge score={49} />)
    expect(screen.getByTestId('score-label')).toHaveTextContent('Émergent')
  })

  it('score 50 → label "Visible"', () => {
    render(<ScoreGauge score={50} />)
    expect(screen.getByTestId('score-label')).toHaveTextContent('Visible')
  })

  it('score 60 → label "Visible"', () => {
    render(<ScoreGauge score={60} />)
    expect(screen.getByTestId('score-label')).toHaveTextContent('Visible')
  })

  it('score 74 → label "Visible"', () => {
    render(<ScoreGauge score={74} />)
    expect(screen.getByTestId('score-label')).toHaveTextContent('Visible')
  })

  it('score 75 → label "Référent"', () => {
    render(<ScoreGauge score={75} />)
    expect(screen.getByTestId('score-label')).toHaveTextContent('Référent')
  })

  it('score 80 → label "Référent"', () => {
    render(<ScoreGauge score={80} />)
    expect(screen.getByTestId('score-label')).toHaveTextContent('Référent')
  })

  it('score 100 → label "Référent"', () => {
    render(<ScoreGauge score={100} />)
    expect(screen.getByTestId('score-label')).toHaveTextContent('Référent')
  })
})

describe('ScoreGauge — score number display', () => {
  it('displays the score number', () => {
    render(<ScoreGauge score={74} />)
    expect(screen.getByText('74')).toBeInTheDocument()
  })

  it('clamps negative score to 0', () => {
    render(<ScoreGauge score={-10} />)
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('clamps score above 100 to 100', () => {
    render(<ScoreGauge score={150} />)
    expect(screen.getByText('100')).toBeInTheDocument()
  })
})

describe('ScoreGauge — sizes', () => {
  it('renders size sm without error', () => {
    const { container } = render(<ScoreGauge score={50} size="sm" />)
    expect(container.firstChild).toBeTruthy()
  })

  it('renders size md without error', () => {
    const { container } = render(<ScoreGauge score={50} size="md" />)
    expect(container.firstChild).toBeTruthy()
  })

  it('renders size lg without error', () => {
    const { container } = render(<ScoreGauge score={50} size="lg" />)
    expect(container.firstChild).toBeTruthy()
  })
})

describe('ScoreGauge — showLabel prop', () => {
  it('hides label when showLabel=false', () => {
    render(<ScoreGauge score={80} showLabel={false} />)
    expect(screen.queryByTestId('score-label')).not.toBeInTheDocument()
  })

  it('shows label by default', () => {
    render(<ScoreGauge score={80} />)
    expect(screen.getByTestId('score-label')).toBeInTheDocument()
  })
})

describe('ScoreGauge — SVG arc animation', () => {
  it('renders the gauge arc with data-testid', () => {
    render(<ScoreGauge score={60} />)
    expect(screen.getByTestId('gauge-arc')).toBeInTheDocument()
  })
})

describe('getScoreCategory helper', () => {
  it('returns correct stroke color for each range', () => {
    expect(getScoreCategory(0).strokeColor).toBe('#EF4444')
    expect(getScoreCategory(25).strokeColor).toBe('#F97316')
    expect(getScoreCategory(50).strokeColor).toBe('#F59E0B')
    expect(getScoreCategory(75).strokeColor).toBe('#10B981')
  })
})
