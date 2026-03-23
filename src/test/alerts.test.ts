import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock prisma
// ---------------------------------------------------------------------------

const mockFindMany = vi.fn()
const mockFindFirst = vi.fn()
const mockCreate = vi.fn()
const mockFindUnique = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: {
    scan: {
      findMany: mockFindMany,
      findFirst: vi.fn(),
    },
    scoreAlert: {
      findFirst: mockFindFirst,
      create: mockCreate,
      findMany: vi.fn(),
    },
    user: {
      findUnique: mockFindUnique,
    },
    brand: {
      findUnique: mockFindUnique,
    },
  },
}))

// Mock email so we don't call Resend in unit tests
vi.mock('@/lib/email', () => ({
  sendCompetitorAlert: vi.fn().mockResolvedValue({ success: true }),
  sendHealthCheck: vi.fn().mockResolvedValue({ success: true }),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeScan(score: number, competitors: string[] = [], llm = 'CHATGPT') {
  return {
    id: `scan-${Math.random()}`,
    globalScore: score,
    createdAt: new Date(),
    results: [
      {
        llm,
        score,
        competitors: JSON.stringify(competitors),
      },
    ],
  }
}

// ---------------------------------------------------------------------------
// Tests: detectDrift
// ---------------------------------------------------------------------------

describe('detectDrift', () => {
  beforeEach(() => {
    vi.resetModules()
    mockFindMany.mockReset()
    mockFindFirst.mockReset()
    mockCreate.mockReset()
  })

  it('returns empty array when fewer than 2 scans exist', async () => {
    mockFindMany.mockResolvedValue([makeScan(60)])
    const { detectDrift } = await import('@/lib/alerts')
    const result = await detectDrift('brand-1', 'user-1')
    expect(result).toHaveLength(0)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('returns empty array when scores are identical (no drift)', async () => {
    mockFindMany.mockResolvedValue([makeScan(60), makeScan(60)])
    mockFindFirst.mockResolvedValue(null) // no existing alert
    const { detectDrift } = await import('@/lib/alerts')
    const result = await detectDrift('brand-1', 'user-1')
    expect(result).toHaveLength(0)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('returns empty array when variation is <= 15 points', async () => {
    mockFindMany.mockResolvedValue([makeScan(70), makeScan(60)])
    mockFindFirst.mockResolvedValue(null)
    const { detectDrift } = await import('@/lib/alerts')
    const result = await detectDrift('brand-1', 'user-1')
    expect(result).toHaveLength(0)
  })

  it('creates an alert when variation > 15 points', async () => {
    mockFindMany.mockResolvedValue([makeScan(40), makeScan(80)])
    mockFindFirst.mockResolvedValue(null) // no existing alert → create
    mockCreate.mockResolvedValue({ id: 'alert-1' })

    const { detectDrift } = await import('@/lib/alerts')
    const result = await detectDrift('brand-1', 'user-1')

    expect(result).toHaveLength(1)
    expect(result[0]).toBe('alert-1')
    expect(mockCreate).toHaveBeenCalledOnce()
    const createArg = mockCreate.mock.calls[0][0].data
    expect(createArg.type).toBe('drift')
    expect(createArg.llm).toBe('CHATGPT')
  })

  it('does NOT create an alert if an identical alert exists within 24h (dedup)', async () => {
    mockFindMany.mockResolvedValue([makeScan(20), makeScan(80)])
    // Simulate existing recent alert
    mockFindFirst.mockResolvedValue({ id: 'existing-alert' })

    const { detectDrift } = await import('@/lib/alerts')
    const result = await detectDrift('brand-1', 'user-1')

    expect(result).toHaveLength(0)
    expect(mockCreate).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Tests: detectCompetitorAppeared
// ---------------------------------------------------------------------------

describe('detectCompetitorAppeared', () => {
  beforeEach(() => {
    vi.resetModules()
    mockFindMany.mockReset()
    mockFindFirst.mockReset()
    mockCreate.mockReset()
  })

  it('returns empty array when fewer than 2 scans exist', async () => {
    mockFindMany.mockResolvedValue([makeScan(60, ['CompA'])])
    const { detectCompetitorAppeared } = await import('@/lib/alerts')
    const result = await detectCompetitorAppeared('brand-1', 'user-1')
    expect(result).toHaveLength(0)
  })

  it('returns empty array when no new competitors appear', async () => {
    mockFindMany.mockResolvedValue([
      makeScan(60, ['CompA', 'CompB']),
      makeScan(55, ['CompA', 'CompB']),
    ])
    mockFindFirst.mockResolvedValue(null)
    const { detectCompetitorAppeared } = await import('@/lib/alerts')
    const result = await detectCompetitorAppeared('brand-1', 'user-1')
    expect(result).toHaveLength(0)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('creates an alert when a new competitor appears', async () => {
    mockFindMany.mockResolvedValue([
      makeScan(60, ['CompA', 'NewRival']),
      makeScan(55, ['CompA']),
    ])
    mockFindFirst.mockResolvedValue(null) // no existing alert
    mockCreate.mockResolvedValue({ id: 'alert-2' })

    const { detectCompetitorAppeared } = await import('@/lib/alerts')
    const result = await detectCompetitorAppeared('brand-1', 'user-1')

    expect(result).toHaveLength(1)
    expect(result[0]).toBe('alert-2')
    expect(mockCreate).toHaveBeenCalledOnce()
    const createArg = mockCreate.mock.calls[0][0].data
    expect(createArg.type).toBe('competitor_appeared')
    expect(createArg.message).toContain('NewRival')
  })

  it('does NOT create duplicate alert if one exists within 24h', async () => {
    mockFindMany.mockResolvedValue([
      makeScan(60, ['CompA', 'NewRival']),
      makeScan(55, ['CompA']),
    ])
    mockFindFirst.mockResolvedValue({ id: 'existing-alert' })

    const { detectCompetitorAppeared } = await import('@/lib/alerts')
    const result = await detectCompetitorAppeared('brand-1', 'user-1')

    expect(result).toHaveLength(0)
    expect(mockCreate).not.toHaveBeenCalled()
  })
})
