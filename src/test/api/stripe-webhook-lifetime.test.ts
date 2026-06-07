import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/stripe', () => ({
  stripe: { webhooks: { constructEvent: vi.fn() } },
  LIFETIME_TIERS: { tier1: {}, tier2: {}, tier3: {} },
  planFromPriceId: vi.fn(() => null),
}))
vi.mock('@/lib/billing', () => ({
  applyPlanUpgrade: vi.fn(),
  grantLifetime: vi.fn(async () => ({ granted: true })),
}))
vi.mock('@/lib/db', () => ({
  prisma: {
    user: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    creditUsage: { create: vi.fn() },
  },
}))

import { stripe } from '@/lib/stripe'
import { applyPlanUpgrade, grantLifetime } from '@/lib/billing'
import { prisma } from '@/lib/db'
import { POST } from '@/app/api/stripe/webhook/route'

type AnyMock = ReturnType<typeof vi.fn>
const constructEvent = (stripe as unknown as { webhooks: { constructEvent: AnyMock } }).webhooks
  .constructEvent

function makeReq() {
  return new Request('http://localhost/api/stripe/webhook', {
    method: 'POST',
    body: 'raw-body',
    headers: { 'stripe-signature': 'sig_test' },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
})

describe('POST /api/stripe/webhook — lifetime handling', () => {
  it('REGRESSION: lifetime checkout grants the lifetime tier', async () => {
    ;(constructEvent as AnyMock).mockReturnValue({
      id: 'evt_1',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_life',
          client_reference_id: 'u1',
          customer: 'cus_1',
          metadata: { type: 'lifetime', tier: 'tier1' },
        },
      },
    })

    const res = await POST(makeReq())
    expect(res.status).toBe(200)
    expect(grantLifetime).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', tier: 'tier1', sessionId: 'cs_life', customerId: 'cus_1' })
    )
  })

  it('REGRESSION: a handler failure returns 500 (so Stripe retries) instead of swallowing it', async () => {
    ;(constructEvent as AnyMock).mockReturnValue({
      id: 'evt_2',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_life',
          client_reference_id: 'u1',
          customer: 'cus_1',
          metadata: { type: 'lifetime', tier: 'tier1' },
        },
      },
    })
    ;(grantLifetime as AnyMock).mockRejectedValueOnce(new Error('db down'))

    const res = await POST(makeReq())
    expect(res.status).toBe(500)
  })

  it('subscription checkout WITHOUT a valid plan does not grant PRO (just links the customer)', async () => {
    ;(constructEvent as AnyMock).mockReturnValue({
      id: 'evt_3',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_sub',
          client_reference_id: 'u1',
          customer: 'cus_1',
          metadata: {},
        },
      },
    })

    const res = await POST(makeReq())
    expect(res.status).toBe(200)
    expect(applyPlanUpgrade).not.toHaveBeenCalled()
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { stripeId: 'cus_1' } })
  })

  it('subscription checkout WITH a valid plan applies it', async () => {
    ;(constructEvent as AnyMock).mockReturnValue({
      id: 'evt_4',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_sub',
          client_reference_id: 'u1',
          customer: 'cus_1',
          metadata: { plan: 'AGENCY' },
        },
      },
    })

    const res = await POST(makeReq())
    expect(res.status).toBe(200)
    expect(applyPlanUpgrade).toHaveBeenCalledWith('u1', 'AGENCY', 'cus_1')
  })
})
