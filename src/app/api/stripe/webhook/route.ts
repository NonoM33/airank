import { stripe, LIFETIME_TIERS, planFromPriceId, type LifetimeTierId } from '@/lib/stripe'
import { prisma } from '@/lib/db'
import { PLAN_CREDITS } from '@/lib/credits'
import { applyPlanUpgrade, grantLifetime } from '@/lib/billing'
import { NextResponse } from 'next/server'
import type Stripe from 'stripe'

const PLAN_RANK: Record<'FREE' | 'STARTER' | 'PRO' | 'AGENCY', number> = {
  FREE: 0, STARTER: 1, PRO: 2, AGENCY: 3,
}

const VALID_PLANS = new Set(['STARTER', 'PRO', 'AGENCY'])

// Disable body parsing - Stripe needs raw body for signature verification
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function updateUserPlan(customerId: string, plan: 'FREE' | 'STARTER' | 'PRO' | 'AGENCY') {
  // Fetch current plan/credits so we can seed credits on upgrade without punishing on downgrade
  const users = await prisma.user.findMany({
    where: { stripeId: customerId },
    select: { id: true, plan: true, credits: true },
  })
  for (const u of users) {
    const isUpgrade = PLAN_RANK[plan] > PLAN_RANK[u.plan as keyof typeof PLAN_RANK]
    const targetAllotment = PLAN_CREDITS[plan]
    const nextCredits = isUpgrade ? Math.max(u.credits, targetAllotment) : u.credits
    await prisma.user.update({
      where: { id: u.id },
      data: { plan, credits: nextCredits },
    })
  }
  console.log(`[Webhook] Updated ${users.length} user(s) to plan ${plan} for customer ${customerId}`)
  return { count: users.length }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.client_reference_id ?? session.metadata?.userId
  const customerId = typeof session.customer === 'string' ? session.customer : null

  if (!userId) {
    console.error('[Webhook] checkout.session.completed: no userId found')
    return
  }

  // Credit recharge (one-time payment)
  if (session.metadata?.type === 'credit_recharge') {
    const credits = parseInt(session.metadata.credits ?? '0', 10)
    if (credits > 0) {
      console.log(`[Webhook] Credit recharge: userId=${userId}, credits=${credits}`)
      await prisma.user.update({
        where: { id: userId },
        data: {
          credits: { increment: credits },
          ...(customerId ? { stripeId: customerId } : {}),
        },
      })
      await prisma.creditUsage.create({
        data: {
          userId,
          amount: -credits, // negative = credits added
          action: 'recharge',
          details: `Recharge ${session.metadata.pack}: +${credits} crédits`,
        },
      })
    }
    return
  }

  // Lifetime deal (AppSumo, one-time payment) — idempotent per session id
  if (session.metadata?.type === 'lifetime') {
    const tier = session.metadata.tier as LifetimeTierId
    if (!tier || !(tier in LIFETIME_TIERS)) {
      console.error(`[Webhook] lifetime checkout with invalid tier: ${session.metadata.tier}`)
      return
    }
    const { granted } = await grantLifetime({ userId, tier, sessionId: session.id, customerId })
    console.log(`[Webhook] lifetime ${tier} for userId=${userId}: granted=${granted}`)
    return
  }

  // Subscription checkout — never default to a plan; an unknown plan must not grant PRO
  const plan = session.metadata?.plan
  if (!plan || !VALID_PLANS.has(plan)) {
    console.error(
      `[Webhook] checkout.session.completed without a valid plan (got "${plan}") — ` +
        `deferring to customer.subscription.updated for userId=${userId}`
    )
    // Still persist the Stripe customer link so the subscription event can resolve the user.
    if (customerId) {
      await prisma.user.update({ where: { id: userId }, data: { stripeId: customerId } })
    }
    return
  }

  console.log(`[Webhook] checkout.session.completed: userId=${userId}, plan=${plan}, customer=${customerId}`)
  await applyPlanUpgrade(userId, plan as 'STARTER' | 'PRO' | 'AGENCY', customerId)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : null
  if (!customerId) return

  const priceId = subscription.items.data[0]?.price?.id ?? ''
  const plan = planFromPriceId(priceId) ?? 'FREE'

  console.log(`[Webhook] subscription.updated: customer=${customerId}, status=${subscription.status}, plan=${plan}`)

  if (subscription.status === 'active' || subscription.status === 'trialing') {
    await updateUserPlan(customerId, plan)
  } else if (subscription.status === 'past_due') {
    // Keep plan active but log warning - give them time to pay
    console.log(`[Webhook] subscription past_due for ${customerId} - keeping plan active`)
  } else if (subscription.status === 'unpaid' || subscription.status === 'incomplete_expired') {
    // Failed to pay - downgrade to FREE
    await updateUserPlan(customerId, 'FREE')
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : null
  if (!customerId) return

  console.log(`[Webhook] subscription.deleted: customer=${customerId} → FREE`)
  await updateUserPlan(customerId, 'FREE')
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : null
  if (!customerId) return

  const attemptCount = invoice.attempt_count ?? 0
  console.log(`[Webhook] invoice.payment_failed: customer=${customerId}, attempt=${attemptCount}`)

  // After 3 failed attempts, downgrade to FREE
  if (attemptCount >= 3) {
    console.log(`[Webhook] 3+ failed payments for ${customerId} → downgrading to FREE`)
    await updateUserPlan(customerId, 'FREE')
  }
}

export async function POST(req: Request) {
  if (!stripe) {
    console.error('[Webhook] Stripe not initialized')
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }

  const body = await req.text()
  const sig = req.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  // Log for debugging
  console.log(`[Webhook] Received event. Sig: ${sig ? 'present' : 'missing'}, Secret: ${webhookSecret ? 'configured' : 'MISSING'}`)

  if (!sig || !webhookSecret) {
    console.error('[Webhook] Missing signature or webhook secret')
    return NextResponse.json({ error: 'Missing signature or secret' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error(`[Webhook] Signature verification FAILED: ${message}`)
    return NextResponse.json({ error: message }, { status: 400 })
  }

  console.log(`[Webhook] Event verified: ${event.type} (${event.id})`)

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`)
    }
  } catch (err) {
    console.error(`[Webhook] Handler error for ${event.type}:`, err)
    // Money-critical grants must not be silently dropped: return 5xx so Stripe
    // retries the delivery (with backoff, up to ~3 days). Handlers are written
    // to be idempotent so replays are safe.
    return NextResponse.json({ error: 'handler_error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
