import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ─── Mocks ───────────────────────────────────────────────────────────────────
// vi.mock is hoisted — no references to module-scope vars in the factory.

vi.mock('@/lib/db', () => ({
  prisma: {
    $transaction: vi.fn(),
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    referral: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    creditUsage: {
      create: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

// ─── Imports after mocks ──────────────────────────────────────────────────────

import { GET } from '@/app/api/referral/route'
import { POST } from '@/app/api/referral/use/route'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockReferral = {
  id: 'referral-1',
  code: 'TESTCODE',
  referrerId: 'user-2',
  referredUserId: null as string | null,
  usedAt: null as Date | null,
  rewardGranted: false,
  referrer: { id: 'user-2' },
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GET /api/referral', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  beforeEach(() => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user-1', email: 'test@example.com', plan: 'FREE' },
    } as never)
    vi.mocked(prisma.referral.findMany).mockResolvedValue([])
    vi.mocked(prisma.user.update).mockResolvedValue({ id: 'user-1', referralCode: 'GENCODE1' } as never)
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null as never)
    const req = new Request('http://localhost/api/referral')
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('creates a referral code if none exists', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user-1', referralCode: null } as never)
    vi.mocked(prisma.user.update).mockResolvedValue({ id: 'user-1', referralCode: 'GENCODE1' } as never)
    // No existing code with that name
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ id: 'user-1', referralCode: null } as never) // first call: get user
      .mockResolvedValueOnce(null as never) // second call: check uniqueness

    const res = await GET()
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.referralCode).toBeTruthy()
    expect(prisma.user.update).toHaveBeenCalled()
  })

  it('returns existing referral code if already set', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      referralCode: 'EXISTING',
    } as never)

    const res = await GET()
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.referralCode).toBe('EXISTING')
    expect(prisma.user.update).not.toHaveBeenCalled()
  })

  it('returns referrals list', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      referralCode: 'EXISTING',
    } as never)
    vi.mocked(prisma.referral.findMany).mockResolvedValue([
      { id: 'ref-1', code: 'EXISTING', usedAt: new Date(), rewardGranted: true, referredUser: { email: 'friend@test.com' } },
    ] as never)

    const res = await GET()
    const data = await res.json()
    expect(data.referrals).toHaveLength(1)
    expect(data.referrals[0].rewardGranted).toBe(true)
  })
})

describe('POST /api/referral/use', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  beforeEach(() => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user-1', email: 'test@example.com', plan: 'FREE' },
    } as never)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user-1', referralCode: 'MYCODE' } as never)
    vi.mocked(prisma.referral.findFirst).mockResolvedValue(null as never) // no existing referral received
    vi.mocked(prisma.referral.findUnique).mockResolvedValue({
      ...mockReferral,
      referredUserId: null,
    } as never)
    ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockResolvedValue([])
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null as never)
    const req = new Request('http://localhost/api/referral/use', {
      method: 'POST',
      body: JSON.stringify({ code: 'TESTCODE' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('links user and grants credits with a valid unused code', async () => {
    const req = new Request('http://localhost/api/referral/use', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'TESTCODE' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.creditsGranted).toBe(500)
    expect(prisma.$transaction).toHaveBeenCalled()
  })

  it('returns 400 when code is already used', async () => {
    vi.mocked(prisma.referral.findUnique).mockResolvedValue({
      ...mockReferral,
      referredUserId: 'another-user',
    } as never)
    const req = new Request('http://localhost/api/referral/use', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'TESTCODE' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('déjà été utilisé')
  })

  it('returns 400 when using own referral code', async () => {
    // user-1 has referralCode 'MYCODE', trying to use 'MYCODE'
    const req = new Request('http://localhost/api/referral/use', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'MYCODE' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('propre code')
  })

  it('returns 400 when user already used a referral code', async () => {
    vi.mocked(prisma.referral.findFirst).mockResolvedValue({ id: 'existing-ref' } as never)
    const req = new Request('http://localhost/api/referral/use', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'TESTCODE' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid/missing code', async () => {
    vi.mocked(prisma.referral.findUnique).mockResolvedValue(null as never)
    const req = new Request('http://localhost/api/referral/use', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'BADCODE' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('invalide')
  })
})
