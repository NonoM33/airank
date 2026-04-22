import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { BrandProvider, useBrand } from '@/lib/brand-context'

const STORAGE_KEY = 'airank:currentBrandId'

function Consumer() {
  const { brands, currentBrandId, currentBrand, setCurrentBrandId, loading } = useBrand()
  return (
    <div>
      <div data-testid="loading">{loading ? 'yes' : 'no'}</div>
      <div data-testid="count">{brands.length}</div>
      <div data-testid="current-id">{currentBrandId ?? ''}</div>
      <div data-testid="current-name">{currentBrand?.name ?? ''}</div>
      {brands.map((b) => (
        <button key={b.id} data-testid={`pick-${b.id}`} onClick={() => setCurrentBrandId(b.id)}>
          {b.name}
        </button>
      ))}
    </div>
  )
}

function mockFetch(response: unknown, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    json: () => Promise.resolve(response),
  })
}

describe('BrandContext', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  it('loads brands from /api/brands and selects the first one by default', async () => {
    globalThis.fetch = mockFetch([
      { id: 'b1', name: 'Alpha', domain: 'alpha.io' },
      { id: 'b2', name: 'Beta', domain: 'beta.io' },
    ]) as unknown as typeof fetch

    render(
      <BrandProvider>
        <Consumer />
      </BrandProvider>
    )

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('no'))
    expect(screen.getByTestId('count').textContent).toBe('2')
    expect(screen.getByTestId('current-id').textContent).toBe('b1')
    expect(screen.getByTestId('current-name').textContent).toBe('Alpha')
  })

  it('restores previously selected brand from localStorage', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'b2')
    globalThis.fetch = mockFetch([
      { id: 'b1', name: 'Alpha' },
      { id: 'b2', name: 'Beta' },
    ]) as unknown as typeof fetch

    render(
      <BrandProvider>
        <Consumer />
      </BrandProvider>
    )

    await waitFor(() => expect(screen.getByTestId('current-id').textContent).toBe('b2'))
    expect(screen.getByTestId('current-name').textContent).toBe('Beta')
  })

  it('falls back to the first brand when the stored id no longer exists', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'deleted-brand')
    globalThis.fetch = mockFetch([{ id: 'b1', name: 'Alpha' }]) as unknown as typeof fetch

    render(
      <BrandProvider>
        <Consumer />
      </BrandProvider>
    )

    await waitFor(() => expect(screen.getByTestId('current-id').textContent).toBe('b1'))
  })

  it('setCurrentBrandId updates the selection and persists to localStorage', async () => {
    globalThis.fetch = mockFetch([
      { id: 'b1', name: 'Alpha' },
      { id: 'b2', name: 'Beta' },
    ]) as unknown as typeof fetch

    render(
      <BrandProvider>
        <Consumer />
      </BrandProvider>
    )

    await waitFor(() => expect(screen.getByTestId('current-id').textContent).toBe('b1'))
    act(() => {
      screen.getByTestId('pick-b2').click()
    })
    expect(screen.getByTestId('current-id').textContent).toBe('b2')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('b2')
  })

  it('handles empty brand list gracefully', async () => {
    globalThis.fetch = mockFetch([]) as unknown as typeof fetch

    render(
      <BrandProvider>
        <Consumer />
      </BrandProvider>
    )

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('no'))
    expect(screen.getByTestId('count').textContent).toBe('0')
    expect(screen.getByTestId('current-id').textContent).toBe('')
    expect(screen.getByTestId('current-name').textContent).toBe('')
  })

  it('throws when useBrand is used outside the provider', () => {
    expect(() => render(<Consumer />)).toThrow(/must be used within a BrandProvider/)
  })
})
