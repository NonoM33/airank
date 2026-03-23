import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ScansHeatmap, type HeatmapScan } from '@/components/dashboard/ScansHeatmap'

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

const MOCK_SCANS: HeatmapScan[] = [
  {
    id: 'scan-1',
    query: 'Quel est le meilleur CRM ?',
    results: [
      { llm: 'CHATGPT', mentioned: true, score: 80 },
      { llm: 'CLAUDE', mentioned: true, score: 45 },
      { llm: 'PERPLEXITY', mentioned: false, score: 0 },
      { llm: 'GEMINI', mentioned: true, score: 20 },
    ],
  },
  {
    id: 'scan-2',
    query: 'Meilleurs outils de gestion de projet',
    results: [
      { llm: 'CHATGPT', mentioned: false, score: 0 },
      { llm: 'CLAUDE', mentioned: true, score: 70 },
      { llm: 'PERPLEXITY', mentioned: true, score: 55 },
      { llm: 'GEMINI', mentioned: false, score: 0 },
    ],
  },
  {
    id: 'scan-3',
    query: 'Solutions de facturation en ligne',
    results: [
      { llm: 'CHATGPT', mentioned: true, score: 90 },
      { llm: 'CLAUDE', mentioned: true, score: 60 },
      { llm: 'PERPLEXITY', mentioned: true, score: 30 },
      { llm: 'GEMINI', mentioned: true, score: 75 },
    ],
  },
]

describe('ScansHeatmap — PRO plan', () => {
  it('renders 4 LLM column headers', () => {
    render(<ScansHeatmap brandId="brand-1" scans={MOCK_SCANS} plan="PRO" />)
    expect(screen.getByText('ChatGPT')).toBeInTheDocument()
    expect(screen.getByText('Claude')).toBeInTheDocument()
    expect(screen.getByText('Perplexity')).toBeInTheDocument()
    expect(screen.getByText('Gemini')).toBeInTheDocument()
  })

  it('renders all scan queries', () => {
    render(<ScansHeatmap brandId="brand-1" scans={MOCK_SCANS} plan="PRO" />)
    expect(screen.getByText('Quel est le meilleur CRM ?')).toBeInTheDocument()
    expect(screen.getByText('Meilleurs outils de gestion de projet')).toBeInTheDocument()
    expect(screen.getByText('Solutions de facturation en ligne')).toBeInTheDocument()
  })

  it('displays mentioned score in cell', () => {
    render(<ScansHeatmap brandId="brand-1" scans={MOCK_SCANS} plan="PRO" />)
    // Score 80 from scan-1 CHATGPT
    expect(screen.getByText('80')).toBeInTheDocument()
  })

  it('displays em dash for non-mentioned result', () => {
    render(<ScansHeatmap brandId="brand-1" scans={MOCK_SCANS} plan="PRO" />)
    // scan-1 PERPLEXITY is not mentioned → shows "—"
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThan(0)
  })

  it('renders legend items', () => {
    render(<ScansHeatmap brandId="brand-1" scans={MOCK_SCANS} plan="PRO" />)
    expect(screen.getByText('Non mentionné')).toBeInTheDocument()
    expect(screen.getByText('Faible (1–33)')).toBeInTheDocument()
    expect(screen.getByText('Moyen (34–66)')).toBeInTheDocument()
    expect(screen.getByText('Élevé (67–100)')).toBeInTheDocument()
  })

  it('does not show upgrade overlay for PRO plan', () => {
    render(<ScansHeatmap brandId="brand-1" scans={MOCK_SCANS} plan="PRO" />)
    expect(screen.queryByText('Fonctionnalité Pro')).not.toBeInTheDocument()
  })

  it('does not show upgrade overlay for AGENCY plan', () => {
    render(<ScansHeatmap brandId="brand-1" scans={MOCK_SCANS} plan="AGENCY" />)
    expect(screen.queryByText('Fonctionnalité Pro')).not.toBeInTheDocument()
  })
})

describe('ScansHeatmap — FREE plan gating', () => {
  it('shows the upgrade overlay for FREE plan', () => {
    render(<ScansHeatmap brandId="brand-1" scans={MOCK_SCANS} plan="FREE" />)
    expect(screen.getByText('Fonctionnalité Pro')).toBeInTheDocument()
  })

  it('shows upgrade button linking to billing', () => {
    render(<ScansHeatmap brandId="brand-1" scans={MOCK_SCANS} plan="FREE" />)
    const link = screen.getByRole('link', { name: /passer au plan pro/i })
    expect(link).toHaveAttribute('href', '/billing')
  })

  it('shows upgrade overlay for STARTER plan', () => {
    render(<ScansHeatmap brandId="brand-1" scans={MOCK_SCANS} plan="STARTER" />)
    expect(screen.getByText('Fonctionnalité Pro')).toBeInTheDocument()
  })
})

describe('ScansHeatmap — empty state', () => {
  it('shows empty message when no scans provided', () => {
    render(<ScansHeatmap brandId="brand-1" scans={[]} plan="PRO" />)
    expect(screen.getByText('Aucun scan disponible pour la heatmap.')).toBeInTheDocument()
  })
})
