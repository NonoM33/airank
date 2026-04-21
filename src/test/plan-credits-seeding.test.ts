import { describe, it, expect } from 'vitest'
import { PLAN_CREDITS } from '@/lib/credits'

const PLAN_RANK: Record<'FREE' | 'STARTER' | 'PRO' | 'AGENCY', number> = {
  FREE: 0, STARTER: 1, PRO: 2, AGENCY: 3,
}

// Pure function version of the seeding rule used in sync-plan and Stripe webhook.
function computeNextCredits(
  currentPlan: 'FREE' | 'STARTER' | 'PRO' | 'AGENCY',
  targetPlan: 'FREE' | 'STARTER' | 'PRO' | 'AGENCY',
  currentCredits: number,
  topUpRequested: boolean = false
): number {
  const isUpgrade = PLAN_RANK[targetPlan] > PLAN_RANK[currentPlan]
  const targetAllotment = PLAN_CREDITS[targetPlan]
  const shouldSeed = topUpRequested || isUpgrade
  return shouldSeed ? Math.max(currentCredits, targetAllotment) : currentCredits
}

describe('plan credits seeding', () => {
  it('seeds credits on upgrade from FREE to AGENCY', () => {
    expect(computeNextCredits('FREE', 'AGENCY', 20)).toBe(10000)
  })

  it('seeds credits on upgrade from STARTER to PRO', () => {
    expect(computeNextCredits('STARTER', 'PRO', 450)).toBe(2000)
  })

  it('keeps higher balance on upgrade if user already had more (prevents resetting top-ups)', () => {
    expect(computeNextCredits('FREE', 'STARTER', 800)).toBe(800)
  })

  it('does NOT change credits on downgrade by default', () => {
    expect(computeNextCredits('AGENCY', 'PRO', 8500)).toBe(8500)
  })

  it('does seed credits on same-plan call when topUpRequested=true', () => {
    expect(computeNextCredits('AGENCY', 'AGENCY', 50, true)).toBe(10000)
  })

  it('does NOT seed credits on same-plan call without topUp', () => {
    expect(computeNextCredits('AGENCY', 'AGENCY', 50)).toBe(50)
  })

  it('PLAN_CREDITS contract matches expected tiers', () => {
    expect(PLAN_CREDITS.FREE).toBe(20)
    expect(PLAN_CREDITS.STARTER).toBe(500)
    expect(PLAN_CREDITS.PRO).toBe(2000)
    expect(PLAN_CREDITS.AGENCY).toBe(10000)
  })
})
