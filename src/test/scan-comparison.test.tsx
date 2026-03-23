import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ScanComparison, type ScanSummary } from '@/components/dashboard/ScanComparison'

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

const MOCK_SCANS: ScanSummary[] = [
  {
    id: 'scan-a',
    query: 'Quel est le meilleur CRM ?',
    globalScore: 72,
    createdAt: '2026-01-15T10:00:00.000Z',
  },
  {
    id: 'scan-b',
    query: 'Meilleurs logiciels RH ?',
    globalScore: 55,
    createdAt: '2026-02-20T14:30:00.000Z',
  },
  {
    id: 'scan-c',
    query: 'Outils de facturation recommandés',
    globalScore: 88,
    createdAt: '2026-03-10T09:15:00.000Z',
  },
]

const MOCK_SCAN_DETAIL_A = {
  id: 'scan-a',
  query: 'Quel est le meilleur CRM ?',
  globalScore: 72,
  createdAt: '2026-01-15T10:00:00.000Z',
  results: [
    { llm: 'CHATGPT', mentioned: true, score: 80, sentiment: 'POSITIVE' },
    { llm: 'CLAUDE', mentioned: true, score: 70, sentiment: 'POSITIVE' },
    { llm: 'PERPLEXITY', mentioned: false, score: 0, sentiment: null },
    { llm: 'GEMINI', mentioned: true, score: 65, sentiment: 'NEUTRAL' },
  ],
}

const MOCK_SCAN_DETAIL_B = {
  id: 'scan-b',
  query: 'Meilleurs logiciels RH ?',
  globalScore: 55,
  createdAt: '2026-02-20T14:30:00.000Z',
  results: [
    { llm: 'CHATGPT', mentioned: false, score: 0, sentiment: null },
    { llm: 'CLAUDE', mentioned: true, score: 60, sentiment: 'NEUTRAL' },
    { llm: 'PERPLEXITY', mentioned: true, score: 55, sentiment: 'POSITIVE' },
    { llm: 'GEMINI', mentioned: true, score: 50, sentiment: 'NEUTRAL' },
  ],
}

describe('ScanComparison — initial render', () => {
  it('renders both scan selectors', () => {
    render(<ScanComparison brandId="brand-1" scans={MOCK_SCANS} plan="PRO" />)
    const selects = screen.getAllByRole('combobox')
    expect(selects).toHaveLength(2)
  })

  it('shows placeholder text for scan A', () => {
    render(<ScanComparison brandId="brand-1" scans={MOCK_SCANS} plan="PRO" />)
    const selects = screen.getAllByRole('combobox')
    expect(selects[0]).toHaveDisplayValue('— Choisir un scan —')
  })

  it('shows placeholder text for scan B', () => {
    render(<ScanComparison brandId="brand-1" scans={MOCK_SCANS} plan="PRO" />)
    const selects = screen.getAllByRole('combobox')
    expect(selects[1]).toHaveDisplayValue('— Choisir un scan —')
  })

  it('shows "Scan A" and "Scan B" labels', () => {
    render(<ScanComparison brandId="brand-1" scans={MOCK_SCANS} plan="PRO" />)
    expect(screen.getByText('Scan A')).toBeInTheDocument()
    expect(screen.getByText('Scan B')).toBeInTheDocument()
  })
})

describe('ScanComparison — selecting scans', () => {
  beforeEach(() => {
    vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
      const urlStr = String(url)
      if (urlStr.includes('scan-a')) {
        return new Response(JSON.stringify(MOCK_SCAN_DETAIL_A), { status: 200 })
      }
      if (urlStr.includes('scan-b')) {
        return new Response(JSON.stringify(MOCK_SCAN_DETAIL_B), { status: 200 })
      }
      return new Response(JSON.stringify({}), { status: 404 })
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches scan detail when scan A is selected', async () => {
    const user = userEvent.setup()
    render(<ScanComparison brandId="brand-1" scans={MOCK_SCANS} plan="PRO" />)

    const selects = screen.getAllByRole('combobox')
    await user.selectOptions(selects[0], 'scan-a')

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/scan/scan-a')
    })
  })

  it('displays score 72 after selecting scan A', async () => {
    const user = userEvent.setup()
    render(<ScanComparison brandId="brand-1" scans={MOCK_SCANS} plan="PRO" />)

    const selects = screen.getAllByRole('combobox')
    await user.selectOptions(selects[0], 'scan-a')

    await waitFor(() => {
      expect(screen.getByText('72')).toBeInTheDocument()
    })
  })

  it('displays score diff when both scans are selected', async () => {
    const user = userEvent.setup()
    render(<ScanComparison brandId="brand-1" scans={MOCK_SCANS} plan="PRO" />)

    const selects = screen.getAllByRole('combobox')
    await user.selectOptions(selects[0], 'scan-a')
    await user.selectOptions(selects[1], 'scan-b')

    // Both scores appear at least once in the document (score blocks + option text)
    await waitFor(() => {
      const all72 = screen.getAllByText('72')
      expect(all72.length).toBeGreaterThan(0)
      const all55 = screen.getAllByText('55')
      expect(all55.length).toBeGreaterThan(0)
    })

    // Global diff: 55 - 72 = -17
    await waitFor(() => {
      expect(screen.getByText('-17')).toBeInTheDocument()
    })
  })

  it('shows "Meilleur" badge on the scan with higher score', async () => {
    const user = userEvent.setup()
    render(<ScanComparison brandId="brand-1" scans={MOCK_SCANS} plan="PRO" />)

    const selects = screen.getAllByRole('combobox')
    await user.selectOptions(selects[0], 'scan-a') // score 72
    await user.selectOptions(selects[1], 'scan-b') // score 55

    await waitFor(() => {
      expect(screen.getByText('Meilleur')).toBeInTheDocument()
    })
  })
})

describe('ScanComparison — plan gating', () => {
  it('shows upgrade overlay for FREE plan', () => {
    render(<ScanComparison brandId="brand-1" scans={MOCK_SCANS} plan="FREE" />)
    expect(screen.getByText('Fonctionnalité Pro')).toBeInTheDocument()
  })

  it('shows upgrade link for STARTER plan', () => {
    render(<ScanComparison brandId="brand-1" scans={MOCK_SCANS} plan="STARTER" />)
    const link = screen.getByRole('link', { name: /passer au plan pro/i })
    expect(link).toHaveAttribute('href', '/billing')
  })

  it('does not show upgrade overlay for PRO plan', () => {
    render(<ScanComparison brandId="brand-1" scans={MOCK_SCANS} plan="PRO" />)
    expect(screen.queryByText('Fonctionnalité Pro')).not.toBeInTheDocument()
  })

  it('does not show upgrade overlay for AGENCY plan', () => {
    render(<ScanComparison brandId="brand-1" scans={MOCK_SCANS} plan="AGENCY" />)
    expect(screen.queryByText('Fonctionnalité Pro')).not.toBeInTheDocument()
  })
})
