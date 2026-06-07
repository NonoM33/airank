import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/scanner', () => ({ scanBrand: vi.fn() }))
vi.mock('@/lib/credits', () => ({
  CREDIT_COSTS: { scan: 10 },
  useCredits: vi.fn(),
  getCredits: vi.fn(),
}))
vi.mock('@/lib/db', () => ({
  prisma: {
    brand: { findFirst: vi.fn() },
    scan: { findFirst: vi.fn(), create: vi.fn() },
  },
}))

import { auth } from '@/lib/auth'
import { scanBrand } from '@/lib/scanner'
import { useCredits, getCredits } from '@/lib/credits'
import { prisma } from '@/lib/db'
import { POST } from '@/app/api/scan/route'

type AnyMock = ReturnType<typeof vi.fn>

function makeReq(body: unknown) {
  return new Request('http://localhost/api/scan', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(auth as AnyMock).mockResolvedValue({ user: { id: 'u1' } })
  ;(prisma.brand.findFirst as AnyMock).mockResolvedValue({ id: 'b1', name: 'Acme' })
})

describe('POST /api/scan — 24h cache (never pay twice)', () => {
  it('REGRESSION: returns a recent identical scan WITHOUT scanning or charging credits', async () => {
    const cachedScan = { id: 'scan-cached', query: 'meilleur CRM', results: [] }
    ;(prisma.scan.findFirst as AnyMock).mockResolvedValue(cachedScan)

    const res = await POST(makeReq({ brandId: 'b1', query: 'meilleur CRM' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.cached).toBe(true)
    expect(json.scan.id).toBe('scan-cached')
    expect(scanBrand).not.toHaveBeenCalled()
    expect(useCredits).not.toHaveBeenCalled()
  })

  it('on a cache miss, proceeds to the credit gate (402 when insufficient) without charging', async () => {
    ;(prisma.scan.findFirst as AnyMock).mockResolvedValue(null)
    ;(getCredits as AnyMock).mockResolvedValue(0)

    const res = await POST(makeReq({ brandId: 'b1', query: 'meilleur CRM' }))
    expect(res.status).toBe(402)
    expect(scanBrand).not.toHaveBeenCalled()
    expect(useCredits).not.toHaveBeenCalled()
  })
})
