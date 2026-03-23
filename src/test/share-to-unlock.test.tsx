import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ShareToUnlock } from '@/components/dashboard/ShareToUnlock'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildLocalStorageMock(initial: Record<string, string> = {}) {
  const store: Record<string, string> = { ...initial }
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { for (const k of Object.keys(store)) delete store[k] }),
    length: 0,
    key: vi.fn(() => null),
  }
}

describe('ShareToUnlock', () => {
  let localStorageMock: ReturnType<typeof buildLocalStorageMock>
  let openSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    // Replace localStorage with a fresh mock each test
    localStorageMock = buildLocalStorageMock()
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true,
    })
    // Mock window.open to return null (simulates popup blocked)
    openSpy = vi.spyOn(window, 'open').mockReturnValue(null as never)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it('shows LinkedIn share button when not yet shared', () => {
    localStorageMock.getItem.mockReturnValue(null as never)

    render(
      <ShareToUnlock score={74} brandName="Acme">
        <div data-testid="secret-content">Rapport détaillé</div>
      </ShareToUnlock>
    )
    expect(screen.getByText(/Partager sur LinkedIn/i)).toBeInTheDocument()
  })

  it('renders children (blurred preview) while locked', () => {
    localStorageMock.getItem.mockReturnValue(null as never)

    render(
      <ShareToUnlock score={74} brandName="Acme">
        <div data-testid="secret-content">Rapport détaillé</div>
      </ShareToUnlock>
    )
    // Children exist in DOM (in the blurred preview section)
    expect(screen.getByTestId('secret-content')).toBeInTheDocument()
    // But the "unlocked" message should NOT be shown
    expect(screen.queryByText(/Rapport complet débloqué — merci/i)).not.toBeInTheDocument()
  })

  it('shows unlocked state when localStorage already has shared=true', () => {
    const storageKey = 'airank-shared-Acme-74'
    localStorageMock.getItem.mockImplementation((key: string): string =>
      key === storageKey ? 'true' : (null as never)
    )

    render(
      <ShareToUnlock score={74} brandName="Acme">
        <div data-testid="unlocked-content">Rapport complet</div>
      </ShareToUnlock>
    )

    expect(screen.getByText(/Rapport complet débloqué — merci/i)).toBeInTheDocument()
    expect(screen.queryByText(/Partager sur LinkedIn/i)).not.toBeInTheDocument()
  })

  it('marks as shared and shows unlock message when share button is clicked (popup blocked)', () => {
    localStorageMock.getItem.mockReturnValue(null as never)

    render(
      <ShareToUnlock score={55} brandName="TestBrand">
        <div data-testid="locked-content">Contenu secret</div>
      </ShareToUnlock>
    )

    const button = screen.getByText(/Partager sur LinkedIn/i)
    fireEvent.click(button)

    // When popup is blocked (window.open returns null), shared immediately
    expect(screen.getByText(/Rapport complet débloqué — merci/i)).toBeInTheDocument()
  })

  it('saves to localStorage when sharing (popup blocked)', () => {
    localStorageMock.getItem.mockReturnValue(null as never)

    render(
      <ShareToUnlock score={60} brandName="Brand60">
        <div>Content</div>
      </ShareToUnlock>
    )

    const button = screen.getByText(/Partager sur LinkedIn/i)
    fireEvent.click(button)

    expect(localStorageMock.setItem).toHaveBeenCalledWith('airank-shared-Brand60-60', 'true')
  })

  it('shows score in share button text', () => {
    localStorageMock.getItem.mockReturnValue(null as never)

    render(
      <ShareToUnlock score={88} brandName="Alpha">
        <div>Content</div>
      </ShareToUnlock>
    )
    expect(screen.getByText(/88\/100/)).toBeInTheDocument()
  })

  it('calls window.open with LinkedIn share URL', () => {
    localStorageMock.getItem.mockReturnValue(null as never)

    render(
      <ShareToUnlock score={74} brandName="Acme">
        <div>Content</div>
      </ShareToUnlock>
    )

    fireEvent.click(screen.getByText(/Partager sur LinkedIn/i))
    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining('linkedin.com/sharing'),
      expect.any(String),
      expect.any(String)
    )
  })
})
