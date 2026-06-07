import { prisma } from './db'
import { PLAN_CREDITS } from './credits'
import { LIFETIME_TIERS, type LifetimeTierId } from './stripe'

export type PaidPlan = 'STARTER' | 'PRO' | 'AGENCY'

const PLAN_RANK: Record<'FREE' | 'STARTER' | 'PRO' | 'AGENCY', number> = {
  FREE: 0,
  STARTER: 1,
  PRO: 2,
  AGENCY: 3,
}

const TIER_RANK: Record<LifetimeTierId, number> = {
  tier1: 1,
  tier2: 2,
  tier3: 3,
}

/**
 * Apply a paid subscription plan to a user, seeding credits on upgrade only.
 * Never reduces an existing balance (no punishment on downgrade / mid-cycle).
 * Caller MUST pass an explicit, validated plan — there is intentionally no
 * default plan here so a missing/garbage value can never silently grant PRO.
 */
export async function applyPlanUpgrade(
  userId: string,
  plan: PaidPlan,
  customerId?: string | null
): Promise<{ updated: boolean }> {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, credits: true },
  })
  if (!existing) return { updated: false }

  const isUpgrade = PLAN_RANK[plan] > PLAN_RANK[existing.plan as keyof typeof PLAN_RANK]
  const nextCredits = isUpgrade
    ? Math.max(existing.credits, PLAN_CREDITS[plan])
    : existing.credits

  await prisma.user.update({
    where: { id: userId },
    data: {
      plan,
      credits: nextCredits,
      ...(customerId ? { stripeId: customerId } : {}),
    },
  })
  return { updated: true }
}

/**
 * Grant an AppSumo-style lifetime deal. Idempotent per Stripe checkout session:
 * we record the grant in the CreditUsage ledger (action="lifetime") with the
 * session id embedded in `details`, and refuse to grant the same session twice.
 * This lets BOTH the webhook and the success-redirect call it safely without
 * double-crediting (stackable purchases use distinct session ids).
 *
 * Stacking rules: credits accumulate; the effective plan/tier is the HIGHEST
 * tier the user has ever purchased.
 */
export async function grantLifetime(params: {
  userId: string
  tier: LifetimeTierId
  sessionId: string
  customerId?: string | null
}): Promise<{ granted: boolean }> {
  const { userId, tier, sessionId, customerId } = params
  const config = LIFETIME_TIERS[tier]
  if (!config) return { granted: false }

  // Idempotency guard: this exact checkout session already applied?
  const already = await prisma.creditUsage.findFirst({
    where: { userId, action: 'lifetime', details: { contains: sessionId } },
    select: { id: true },
  })
  if (already) return { granted: false }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lifetimeTier: true },
  })
  if (!user) return { granted: false }

  const currentRank = user.lifetimeTier
    ? TIER_RANK[user.lifetimeTier as LifetimeTierId] ?? 0
    : 0
  const effectiveTier: LifetimeTierId =
    TIER_RANK[tier] >= currentRank ? tier : (user.lifetimeTier as LifetimeTierId)
  const effectivePlan = LIFETIME_TIERS[effectiveTier].equivalent as PaidPlan

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        isLifetime: true,
        lifetimeTier: effectiveTier,
        plan: effectivePlan,
        credits: { increment: config.credits },
        ...(customerId ? { stripeId: customerId } : {}),
      },
    }),
    prisma.creditUsage.create({
      data: {
        userId,
        amount: -config.credits, // negative = credits added
        action: 'lifetime',
        details: `Lifetime ${tier} (${config.name}): +${config.credits} crédits [session:${sessionId}]`,
      },
    }),
  ])

  return { granted: true }
}
