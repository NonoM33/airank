import { describe, it, expect, vi } from 'vitest'

// ─── Mock next/og (edge runtime, not available in test env) ──────────────────
// ImageResponse must be mocked as a class (constructor function) because the
// route uses `new ImageResponse(...)`.

vi.mock('next/og', () => {
  class ImageResponse extends Response {
    constructor(_element: unknown, _options?: unknown) {
      super('', { status: 200, headers: { 'content-type': 'image/png' } })
    }
  }
  return { ImageResponse }
})

// ─── Import after mock ────────────────────────────────────────────────────────

import { GET } from '@/app/api/og/score/route'

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GET /api/og/score', () => {
  it('is accessible without authentication', async () => {
    const req = new Request('http://localhost/api/og/score?brand=Acme&score=74&label=Visible')
    const res = await GET(req)
    expect(res.status).toBe(200)
  })

  it('uses default score=0 when score param is missing', async () => {
    const req = new Request('http://localhost/api/og/score?brand=TestBrand')
    // Should not throw
    await expect(GET(req)).resolves.toBeDefined()
  })

  it('uses default brand="Marque" when brand param is missing', async () => {
    const req = new Request('http://localhost/api/og/score?score=50')
    const res = await GET(req)
    expect(res.status).toBe(200)
  })

  it('uses default values for all missing params', async () => {
    const req = new Request('http://localhost/api/og/score')
    const res = await GET(req)
    expect(res.status).toBe(200)
  })

  it('clamps score above 100 to 100', async () => {
    const req = new Request('http://localhost/api/og/score?score=999&brand=Test')
    const res = await GET(req)
    expect(res.status).toBe(200)
  })

  it('clamps score below 0 to 0', async () => {
    const req = new Request('http://localhost/api/og/score?score=-50&brand=Test')
    const res = await GET(req)
    expect(res.status).toBe(200)
  })
})
