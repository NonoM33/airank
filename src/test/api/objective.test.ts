import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Hoist mocks so they are available before imports ─────────────────────────
const { mockAuth, mockPrisma } = vi.hoisted(() => {
  const mockAuth = vi.fn()
  const mockPrisma = {
    brand: { findFirst: vi.fn() },
    scoreObjective: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn() },
    scan: { findFirst: vi.fn() },
  }
  return { mockAuth, mockPrisma }
})

vi.mock('@/lib/auth', () => ({ auth: mockAuth }))
vi.mock('@/lib/db', () => ({ prisma: mockPrisma }))

// ── Import after mocks ────────────────────────────────────────────────────────
import { GET, POST, PUT } from '@/app/api/objective/route'

// Helper to create a Request object
function makeRequest(method: string, body?: unknown, url = 'http://localhost/api/objective') {
  return new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
}

function makeGetRequest(params: Record<string, string>) {
  const url = new URL('http://localhost/api/objective')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return new Request(url.toString(), { method: 'GET' })
}

beforeEach(() => {
  vi.clearAllMocks()
  // Default: authenticated
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockAuth.mockResolvedValue({ user: { id: 'user-1', email: 'test@test.com', name: 'Test' } } as any)
})

// ── GET ───────────────────────────────────────────────────────────────────────

describe('GET /api/objective', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const req = makeGetRequest({ brandId: 'brand-1' })
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 when brandId is missing', async () => {
    const req = makeGetRequest({})
    const res = await GET(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/brandId/i)
  })

  it('returns 404 when brand does not belong to user', async () => {
    mockPrisma.brand.findFirst.mockResolvedValue(null)
    const req = makeGetRequest({ brandId: 'brand-1' })
    const res = await GET(req)
    expect(res.status).toBe(404)
  })

  it('returns objective when found', async () => {
    const objective = {
      id: 'obj-1',
      userId: 'user-1',
      brandId: 'brand-1',
      targetScore: 70,
      targetDate: new Date('2026-12-31'),
      achieved: false,
      createdAt: new Date(),
    }
    mockPrisma.brand.findFirst.mockResolvedValue({ id: 'brand-1' })
    mockPrisma.scoreObjective.findUnique.mockResolvedValue(objective)
    const req = makeGetRequest({ brandId: 'brand-1' })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.targetScore).toBe(70)
  })

  it('returns null when no objective exists', async () => {
    mockPrisma.brand.findFirst.mockResolvedValue({ id: 'brand-1' })
    mockPrisma.scoreObjective.findUnique.mockResolvedValue(null)
    const req = makeGetRequest({ brandId: 'brand-1' })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toBeNull()
  })
})

// ── POST ──────────────────────────────────────────────────────────────────────

describe('POST /api/objective', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const req = makeRequest('POST', { brandId: 'brand-1', targetScore: 70, targetDate: '2026-12-31' })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 when targetScore is missing', async () => {
    const req = makeRequest('POST', { brandId: 'brand-1', targetDate: '2026-12-31' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when targetDate is missing', async () => {
    const req = makeRequest('POST', { brandId: 'brand-1', targetScore: 70 })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when brandId is missing', async () => {
    const req = makeRequest('POST', { targetScore: 70, targetDate: '2026-12-31' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 404 when brand does not belong to user', async () => {
    mockPrisma.brand.findFirst.mockResolvedValue(null)
    const req = makeRequest('POST', { brandId: 'brand-1', targetScore: 70, targetDate: '2026-12-31' })
    const res = await POST(req)
    expect(res.status).toBe(404)
  })

  it('returns 400 for invalid date', async () => {
    mockPrisma.brand.findFirst.mockResolvedValue({ id: 'brand-1' })
    const req = makeRequest('POST', { brandId: 'brand-1', targetScore: 70, targetDate: 'not-a-date' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('creates objective and returns it on valid input', async () => {
    const objective = {
      id: 'obj-1',
      userId: 'user-1',
      brandId: 'brand-1',
      targetScore: 70,
      targetDate: new Date('2026-12-31'),
      achieved: false,
      createdAt: new Date(),
    }
    mockPrisma.brand.findFirst.mockResolvedValue({ id: 'brand-1' })
    mockPrisma.scoreObjective.upsert.mockResolvedValue(objective)

    const req = makeRequest('POST', { brandId: 'brand-1', targetScore: 70, targetDate: '2026-12-31' })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.targetScore).toBe(70)
    expect(mockPrisma.scoreObjective.upsert).toHaveBeenCalled()
  })

  it('calls upsert with correct data', async () => {
    const objective = {
      id: 'obj-1',
      userId: 'user-1',
      brandId: 'brand-1',
      targetScore: 80,
      targetDate: new Date('2027-06-15'),
      achieved: false,
      createdAt: new Date(),
    }
    mockPrisma.brand.findFirst.mockResolvedValue({ id: 'brand-1' })
    mockPrisma.scoreObjective.upsert.mockResolvedValue(objective)

    const req = makeRequest('POST', { brandId: 'brand-1', targetScore: 80, targetDate: '2027-06-15' })
    await POST(req)

    expect(mockPrisma.scoreObjective.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_brandId: { userId: 'user-1', brandId: 'brand-1' } },
      })
    )
  })
})

// ── PUT ───────────────────────────────────────────────────────────────────────

describe('PUT /api/objective', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const req = makeRequest('PUT', { brandId: 'brand-1' })
    const res = await PUT(req)
    expect(res.status).toBe(401)
  })

  it('returns 404 when brand does not belong to user', async () => {
    mockPrisma.brand.findFirst.mockResolvedValue(null)
    const req = makeRequest('PUT', { brandId: 'brand-1' })
    const res = await PUT(req)
    expect(res.status).toBe(404)
  })

  it('returns 404 when no objective exists', async () => {
    mockPrisma.brand.findFirst.mockResolvedValue({ id: 'brand-1' })
    mockPrisma.scoreObjective.findUnique.mockResolvedValue(null)
    const req = makeRequest('PUT', { brandId: 'brand-1' })
    const res = await PUT(req)
    expect(res.status).toBe(404)
  })

  it('marks objective as achieved when current score >= target', async () => {
    const objective = {
      id: 'obj-1',
      userId: 'user-1',
      brandId: 'brand-1',
      targetScore: 70,
      targetDate: new Date('2026-12-31'),
      achieved: false,
      createdAt: new Date(),
    }
    mockPrisma.brand.findFirst.mockResolvedValue({ id: 'brand-1' })
    mockPrisma.scoreObjective.findUnique.mockResolvedValue(objective)
    mockPrisma.scan.findFirst.mockResolvedValue({ globalScore: 75 })
    mockPrisma.scoreObjective.update.mockResolvedValue({ ...objective, achieved: true })

    const req = makeRequest('PUT', { brandId: 'brand-1' })
    const res = await PUT(req)
    expect(res.status).toBe(200)
    expect(mockPrisma.scoreObjective.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { achieved: true } })
    )
  })

  it('does not mark as achieved when current score < target', async () => {
    const objective = {
      id: 'obj-1',
      userId: 'user-1',
      brandId: 'brand-1',
      targetScore: 70,
      targetDate: new Date('2026-12-31'),
      achieved: false,
      createdAt: new Date(),
    }
    mockPrisma.brand.findFirst.mockResolvedValue({ id: 'brand-1' })
    mockPrisma.scoreObjective.findUnique.mockResolvedValue(objective)
    mockPrisma.scan.findFirst.mockResolvedValue({ globalScore: 50 })

    const req = makeRequest('PUT', { brandId: 'brand-1' })
    const res = await PUT(req)
    expect(res.status).toBe(200)
    expect(mockPrisma.scoreObjective.update).not.toHaveBeenCalled()
  })
})
