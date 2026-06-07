import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mock prisma ─────────────────────────────────────────────────────────────
vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    creditUsage: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(async (ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
  },
}))

import { prisma } from '@/lib/db'
import { applyPlanUpgrade, grantLifetime } from '@/lib/billing'

type AnyMock = ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
})

describe('applyPlanUpgrade', () => {
  it('seeds credits to plan allotment on upgrade FREE → PRO', async () => {
    ;(prisma.user.findUnique as AnyMock).mockResolvedValue({ plan: 'FREE', credits: 20 })
    await applyPlanUpgrade('u1', 'PRO', 'cus_1')
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u1' },
        data: expect.objectContaining({ plan: 'PRO', credits: 2000, stripeId: 'cus_1' }),
      })
    )
  })

  it('keeps a higher existing balance on upgrade (does not reset top-ups)', async () => {
    ;(prisma.user.findUnique as AnyMock).mockResolvedValue({ plan: 'FREE', credits: 5000 })
    await applyPlanUpgrade('u1', 'STARTER')
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ plan: 'STARTER', credits: 5000 }) })
    )
  })

  it('does NOT reduce credits on downgrade AGENCY → PRO', async () => {
    ;(prisma.user.findUnique as AnyMock).mockResolvedValue({ plan: 'AGENCY', credits: 8500 })
    await applyPlanUpgrade('u1', 'PRO')
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ plan: 'PRO', credits: 8500 }) })
    )
  })

  it('no-ops when the user does not exist', async () => {
    ;(prisma.user.findUnique as AnyMock).mockResolvedValue(null)
    const res = await applyPlanUpgrade('ghost', 'PRO')
    expect(res.updated).toBe(false)
    expect(prisma.user.update).not.toHaveBeenCalled()
  })
})

describe('grantLifetime', () => {
  it('grants tier1: isLifetime, plan STARTER, +500 credits, ledger entry', async () => {
    ;(prisma.creditUsage.findFirst as AnyMock).mockResolvedValue(null)
    ;(prisma.user.findUnique as AnyMock).mockResolvedValue({ lifetimeTier: null })

    const res = await grantLifetime({ userId: 'u1', tier: 'tier1', sessionId: 'cs_test_1', customerId: 'cus_1' })

    expect(res.granted).toBe(true)
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u1' },
        data: expect.objectContaining({
          isLifetime: true,
          lifetimeTier: 'tier1',
          plan: 'STARTER',
          credits: { increment: 500 },
          stripeId: 'cus_1',
        }),
      })
    )
    expect(prisma.creditUsage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'u1', action: 'lifetime' }),
      })
    )
    const ledgerArg = (prisma.creditUsage.create as AnyMock).mock.calls[0][0]
    expect(ledgerArg.data.details).toContain('cs_test_1')
  })

  it('is idempotent: a session already in the ledger is not granted twice', async () => {
    ;(prisma.creditUsage.findFirst as AnyMock).mockResolvedValue({ id: 'already' })

    const res = await grantLifetime({ userId: 'u1', tier: 'tier1', sessionId: 'cs_test_1' })

    expect(res.granted).toBe(false)
    expect(prisma.user.update).not.toHaveBeenCalled()
    expect(prisma.creditUsage.create).not.toHaveBeenCalled()
  })

  it('stacking: buying a higher tier upgrades the effective plan to the highest', async () => {
    ;(prisma.creditUsage.findFirst as AnyMock).mockResolvedValue(null)
    ;(prisma.user.findUnique as AnyMock).mockResolvedValue({ lifetimeTier: 'tier1' })

    await grantLifetime({ userId: 'u1', tier: 'tier3', sessionId: 'cs_test_2' })

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ lifetimeTier: 'tier3', plan: 'AGENCY', credits: { increment: 10000 } }),
      })
    )
  })

  it('stacking: buying a lower tier keeps the higher effective tier but still adds its credits', async () => {
    ;(prisma.creditUsage.findFirst as AnyMock).mockResolvedValue(null)
    ;(prisma.user.findUnique as AnyMock).mockResolvedValue({ lifetimeTier: 'tier3' })

    await grantLifetime({ userId: 'u1', tier: 'tier1', sessionId: 'cs_test_3' })

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ lifetimeTier: 'tier3', plan: 'AGENCY', credits: { increment: 500 } }),
      })
    )
  })
})
