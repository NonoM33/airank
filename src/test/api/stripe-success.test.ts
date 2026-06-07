import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/stripe', () => ({
  stripe: { checkout: { sessions: { retrieve: vi.fn() } } },
  LIFETIME_TIERS: {
    tier1: { equivalent: 'STARTER' },
    tier2: { equivalent: 'PRO' },
    tier3: { equivalent: 'AGENCY' },
  },
}))
vi.mock('@/lib/billing', () => ({
  applyPlanUpgrade: vi.fn(),
  grantLifetime: vi.fn(),
}))

import { stripe } from '@/lib/stripe'
import { applyPlanUpgrade, grantLifetime } from '@/lib/billing'
import { GET } from '@/app/api/stripe/success/route'

type AnyMock = ReturnType<typeof vi.fn>
const retrieve = (stripe as unknown as { checkout: { sessions: { retrieve: AnyMock } } }).checkout
  .sessions.retrieve

function makeReq(sessionId = 'cs_1') {
  return new Request(`http://localhost/api/stripe/success?session_id=${sessionId}`)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/stripe/success — never silently grants PRO', () => {
  it('REGRESSION: a paid subscription session with NO plan metadata does NOT grant any plan', async () => {
    ;(retrieve as AnyMock).mockResolvedValue({
      id: 'cs_1',
      payment_status: 'paid',
      client_reference_id: 'u1',
      customer: 'cus_1',
      metadata: {}, // no plan, no type → must NOT become PRO
    })
    await GET(makeReq())
    expect(applyPlanUpgrade).not.toHaveBeenCalled()
    expect(grantLifetime).not.toHaveBeenCalled()
  })

  it('a credit_recharge session does NOT touch the plan (webhook handles credits)', async () => {
    ;(retrieve as AnyMock).mockResolvedValue({
      id: 'cs_1',
      payment_status: 'paid',
      client_reference_id: 'u1',
      customer: 'cus_1',
      metadata: { type: 'credit_recharge', credits: '50' },
    })
    await GET(makeReq())
    expect(applyPlanUpgrade).not.toHaveBeenCalled()
    expect(grantLifetime).not.toHaveBeenCalled()
  })

  it('a lifetime session grants the lifetime tier (not PRO)', async () => {
    ;(retrieve as AnyMock).mockResolvedValue({
      id: 'cs_life',
      payment_status: 'paid',
      client_reference_id: 'u1',
      customer: 'cus_1',
      metadata: { type: 'lifetime', tier: 'tier1' },
    })
    await GET(makeReq('cs_life'))
    expect(grantLifetime).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', tier: 'tier1', sessionId: 'cs_life' })
    )
    expect(applyPlanUpgrade).not.toHaveBeenCalled()
  })

  it('a subscription session WITH a valid plan applies exactly that plan', async () => {
    ;(retrieve as AnyMock).mockResolvedValue({
      id: 'cs_1',
      payment_status: 'paid',
      client_reference_id: 'u1',
      customer: 'cus_1',
      metadata: { plan: 'STARTER' },
    })
    await GET(makeReq())
    expect(applyPlanUpgrade).toHaveBeenCalledWith('u1', 'STARTER', 'cus_1')
  })

  it('an unpaid session grants nothing', async () => {
    ;(retrieve as AnyMock).mockResolvedValue({
      id: 'cs_1',
      payment_status: 'unpaid',
      client_reference_id: 'u1',
      metadata: { plan: 'PRO' },
    })
    await GET(makeReq())
    expect(applyPlanUpgrade).not.toHaveBeenCalled()
    expect(grantLifetime).not.toHaveBeenCalled()
  })
})
