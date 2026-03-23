import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AlertsPanel } from '@/components/dashboard/AlertsPanel'

// ---------------------------------------------------------------------------
// Mock global fetch
// ---------------------------------------------------------------------------

global.fetch = vi.fn()

function mockFetch(data: unknown, ok = true) {
  ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
    ok,
    json: () => Promise.resolve(data),
  })
}

const MOCK_ALERTS = [
  {
    id: 'alert-1',
    type: 'drift',
    llm: 'CHATGPT',
    message: 'Score CHATGPT en baisse de 20 points (80 → 60)',
    read: false,
    createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1h ago
  },
  {
    id: 'alert-2',
    type: 'competitor_appeared',
    llm: 'GEMINI',
    message: 'RivalCo est apparu dans GEMINI',
    read: false,
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30min ago
  },
]

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AlertsPanel', () => {
  it('displays skeleton while fetching', () => {
    // Fetch never resolves during this test
    ;(global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}))

    render(<AlertsPanel brandId="brand-1" />)

    expect(screen.getByTestId('alerts-skeleton')).toBeInTheDocument()
  })

  it('shows empty state message when there are 0 alerts', async () => {
    mockFetch({ alerts: [] })

    render(<AlertsPanel brandId="brand-1" />)

    await waitFor(() => {
      expect(screen.getByText(/Aucune alerte/i)).toBeInTheDocument()
    })
  })

  it('displays 2 alert items when API returns 2 alerts', async () => {
    mockFetch({ alerts: MOCK_ALERTS })

    render(<AlertsPanel brandId="brand-1" />)

    await waitFor(() => {
      expect(
        screen.getByText('Score CHATGPT en baisse de 20 points (80 → 60)'),
      ).toBeInTheDocument()
      expect(screen.getByText('RivalCo est apparu dans GEMINI')).toBeInTheDocument()
    })
  })

  it('shows correct badge labels for each alert type', async () => {
    mockFetch({ alerts: MOCK_ALERTS })

    render(<AlertsPanel brandId="brand-1" />)

    await waitFor(() => {
      expect(screen.getByText('Dérive')).toBeInTheDocument()
      expect(screen.getByText('Concurrent')).toBeInTheDocument()
    })
  })

  it('calls the read API and removes the alert on "Marquer comme lue" click', async () => {
    mockFetch({ alerts: MOCK_ALERTS })

    render(<AlertsPanel brandId="brand-1" />)

    await waitFor(() => {
      expect(screen.getAllByText('Marquer comme lue')).toHaveLength(2)
    })

    // Mock next fetch call for the PATCH/POST to mark as read
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ alert: { ...MOCK_ALERTS[0], read: true } }),
    })

    const buttons = screen.getAllByText('Marquer comme lue')
    await userEvent.click(buttons[0])

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/alerts/${MOCK_ALERTS[0].id}`,
        { method: 'POST' },
      )
    })

    // Alert should be removed from list
    await waitFor(() => {
      expect(
        screen.queryByText('Score CHATGPT en baisse de 20 points (80 → 60)'),
      ).not.toBeInTheDocument()
    })
  })

  it('fetches with the correct brandId query param', async () => {
    mockFetch({ alerts: [] })

    render(<AlertsPanel brandId="brand-xyz" />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/alerts?brandId=brand-xyz&unread=true',
      )
    })
  })
})
