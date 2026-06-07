import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/stripe', () => ({
  stripe: {
    checkout: { sessions: { list: vi.fn() } },
    subscriptions: { list: vi.fn() },
  },
  LIFETIME_TIERS: { tier1: {}, tier2: {}, tier3: {} },
  planFromPriceId: vi.fn(() => null),
}))
vi.mock('@/lib/billing', () => ({
  applyPlanUpgrade: vi.fn(),
  grantLifetime: vi.fn(async () => ({ granted: true })),
}))
vi.mock('@/lib/db', () => ({
  prisma: { user: { findUnique: vi.fn() } },
}))

import { auth } from '@/lib/auth'
import { stripe, planFromPriceId } from '@/lib/stripe'
import { applyPlanUpgrade, grantLifetime } from '@/lib/billing'
import { prisma } from '@/lib/db'
import { POST } from '@/app/api/stripe/sync/route'

type AnyMock = ReturnType<typeof vi.fn>
const sessionsList = (stripe as unknown as { checkout: { sessions: { list: AnyMock } } }).checkout
  .sessions.list
const subsList = (stripe as unknown as { subscriptions: { list: AnyMock } }).subscriptions.list

beforeEach(() => {
  vi.clearAllMocks()
  ;(auth as AnyMock).mockResolvedValue({ user: { id: 'u1' } })
  ;(prisma.user.findUnique as AnyMock).mockResolvedValue({ stripeId: null, plan: 'FREE' })
  ;(sessionsList as AnyMock).mockResolvedValue({ data: [] })
  ;(subsList as AnyMock).mockResolvedValue({ data: [] })
})

describe('POST /api/stripe/sync — verified grants only', () => {
  it('returns 401 when not authenticated', async () => {
    ;(auth as AnyMock).mockResolvedValue(null)
    const res = await POST()
    expect(res.status).toBe(401)
  })

  it('REGRESSION: does NOT grant a plan from unverified session metadata when there is no active subscription', async () => {
    // A paid session that merely *claims* AGENCY in metadata, customer present,
    // but NO active subscription on that customer.
    ;(sessionsList as AnyMock).mockResolvedValue({
      data: [
        {
          id: 'cs_1',
          client_reference_id: 'u1',
          payment_status: 'paid',
          customer: 'cus_1',
          metadata: { plan: 'AGENCY' },
        },
      ],
    })
    ;(subsList as AnyMock).mockResolvedValue({ data: [] }) // no real subscription

    const res = await POST()
    const json = await res.json()
    expect(applyPlanUpgrade).not.toHaveBeenCalled()
    expect(json.synced).toBe(false)
  })

  it('grants the plan only when an active subscription really exists', async () => {
    ;(prisma.user.findUnique as AnyMock).mockResolvedValue({ stripeId: 'cus_1', plan: 'FREE' })
    ;(subsList as AnyMock).mockResolvedValue({
      data: [{ items: { data: [{ price: { id: 'price_pro' } }] } }],
    })
    ;(planFromPriceId as AnyMock).mockReturnValue('PRO')

    await POST()
    expect(applyPlanUpgrade).toHaveBeenCalledWith('u1', 'PRO', 'cus_1')
  })

  it('grants a lifetime tier from a paid lifetime session belonging to the user', async () => {
    ;(sessionsList as AnyMock).mockResolvedValue({
      data: [
        {
          id: 'cs_life',
          client_reference_id: 'u1',
          payment_status: 'paid',
          customer: 'cus_1',
          metadata: { type: 'lifetime', tier: 'tier2' },
        },
      ],
    })

    await POST()
    expect(grantLifetime).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', tier: 'tier2', sessionId: 'cs_life' })
    )
  })

  it('ignores paid sessions that belong to a different user', async () => {
    ;(sessionsList as AnyMock).mockResolvedValue({
      data: [
        {
          id: 'cs_other',
          client_reference_id: 'someone-else',
          payment_status: 'paid',
          customer: 'cus_x',
          metadata: { type: 'lifetime', tier: 'tier3' },
        },
      ],
    })

    await POST()
    expect(grantLifetime).not.toHaveBeenCalled()
  })
})
