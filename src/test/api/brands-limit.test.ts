import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/db', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    brand: { count: vi.fn(), create: vi.fn() },
  },
}))

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { POST } from '@/app/api/brands/route'

type AnyMock = ReturnType<typeof vi.fn>

function makeReq(body: unknown) {
  return new Request('http://localhost/api/brands', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(auth as AnyMock).mockResolvedValue({ user: { id: 'u1', plan: 'FREE' } })
})

describe('POST /api/brands — plan brand cap', () => {
  it('returns 401 when not authenticated', async () => {
    ;(auth as AnyMock).mockResolvedValue(null)
    const res = await POST(makeReq({ name: 'Acme' }))
    expect(res.status).toBe(401)
  })

  it('blocks a FREE user (limit 1) from creating a 2nd brand with 403', async () => {
    ;(prisma.user.findUnique as AnyMock).mockResolvedValue({ plan: 'FREE' })
    ;(prisma.brand.count as AnyMock).mockResolvedValue(1) // already at the cap

    const res = await POST(makeReq({ name: 'Acme' }))
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.code).toBe('BRAND_LIMIT')
    expect(json.limit).toBe(1)
    expect(prisma.brand.create).not.toHaveBeenCalled()
  })

  it('allows a FREE user to create their first brand', async () => {
    ;(prisma.user.findUnique as AnyMock).mockResolvedValue({ plan: 'FREE' })
    ;(prisma.brand.count as AnyMock).mockResolvedValue(0)
    ;(prisma.brand.create as AnyMock).mockResolvedValue({ id: 'b1', name: 'Acme' })

    const res = await POST(makeReq({ name: 'Acme' }))
    expect(res.status).toBe(201)
    expect(prisma.brand.create).toHaveBeenCalledTimes(1)
  })

  it('allows an AGENCY user (limit 50) to add a brand when below the cap', async () => {
    ;(auth as AnyMock).mockResolvedValue({ user: { id: 'u1', plan: 'AGENCY' } })
    ;(prisma.user.findUnique as AnyMock).mockResolvedValue({ plan: 'AGENCY' })
    ;(prisma.brand.count as AnyMock).mockResolvedValue(12)
    ;(prisma.brand.create as AnyMock).mockResolvedValue({ id: 'b13' })

    const res = await POST(makeReq({ name: 'Brand 13' }))
    expect(res.status).toBe(201)
  })
})
