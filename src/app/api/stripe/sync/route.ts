export const dynamic = "force-dynamic"
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { stripe, LIFETIME_TIERS, planFromPriceId, type LifetimeTierId } from '@/lib/stripe'
import { applyPlanUpgrade, grantLifetime } from '@/lib/billing'
import { NextResponse } from 'next/server'

/**
 * Self-serve reconciliation endpoint (called when a user lands back from Stripe
 * and the webhook may not have fired yet). SECURITY: it must never grant a plan
 * from unverified session metadata. We only ever grant:
 *   - a subscription plan that maps to a *real active subscription* on the
 *     customer (verified via the Stripe API), or
 *   - a lifetime tier from a *paid* checkout session that belongs to this user
 *     (granted idempotently via the shared billing helper).
 */
export async function POST() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  const userId = session.user.id

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeId: true, plan: true },
  })

  if (!stripe) {
    return NextResponse.json({ plan: user?.plan ?? 'FREE', synced: false })
  }

  let customerId = user?.stripeId ?? null
  let synced = false

  // Inspect THIS user's own recent paid checkout sessions to (a) recover the
  // Stripe customer id and (b) apply any lifetime purchase the webhook missed.
  const recent = await stripe.checkout.sessions.list({ limit: 20 })
  const mySessions = recent.data.filter(
    (s) => s.client_reference_id === userId && s.payment_status === 'paid'
  )

  for (const s of mySessions) {
    const sessionCustomer = typeof s.customer === 'string' ? s.customer : null
    if (s.metadata?.type === 'lifetime') {
      const tier = s.metadata.tier as LifetimeTierId
      if (tier && tier in LIFETIME_TIERS) {
        const { granted } = await grantLifetime({
          userId,
          tier,
          sessionId: s.id,
          customerId: sessionCustomer,
        })
        synced = synced || granted
      }
    }
    if (!customerId && sessionCustomer) customerId = sessionCustomer
  }

  // Only grant a subscription plan if the customer actually has an active sub.
  if (customerId) {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    })
    const priceId = subscriptions.data[0]?.items.data[0]?.price?.id
    const plan = planFromPriceId(priceId)
    if (plan) {
      await applyPlanUpgrade(userId, plan, customerId)
      synced = true
    }
  }

  const fresh = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  })
  return NextResponse.json({ plan: fresh?.plan ?? 'FREE', synced })
}
