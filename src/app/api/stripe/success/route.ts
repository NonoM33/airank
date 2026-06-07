export const dynamic = "force-dynamic"
import { stripe, LIFETIME_TIERS, type LifetimeTierId } from '@/lib/stripe'
import { applyPlanUpgrade, grantLifetime } from '@/lib/billing'
import { NextResponse } from 'next/server'

const VALID_PLANS = new Set(['STARTER', 'PRO', 'AGENCY'])

/**
 * Browser redirect target after a successful Stripe checkout. This is a *fast
 * path* fallback so the user sees their upgrade immediately; the signed webhook
 * remains the source of truth. All grants here are idempotent and mirror the
 * webhook exactly. Critically: we NEVER default to a plan — a paid session with
 * no/garbage plan metadata (e.g. a credit pack) must never silently grant PRO.
 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const sessionId = url.searchParams.get('session_id')
  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://airank.fr'

  if (!sessionId || !stripe) {
    return NextResponse.redirect(`${baseUrl}/billing?error=missing_session`)
  }

  try {
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId)

    if (checkoutSession.payment_status !== 'paid') {
      return NextResponse.redirect(`${baseUrl}/billing?error=not_paid`)
    }

    const userId = checkoutSession.client_reference_id ?? checkoutSession.metadata?.userId
    const customerId =
      typeof checkoutSession.customer === 'string' ? checkoutSession.customer : null
    const type = checkoutSession.metadata?.type

    if (userId) {
      if (type === 'credit_recharge') {
        // Credits are granted by the (idempotent) webhook only — do nothing here.
      } else if (type === 'lifetime') {
        const tier = checkoutSession.metadata?.tier as LifetimeTierId | undefined
        if (tier && tier in LIFETIME_TIERS) {
          await grantLifetime({ userId, tier, sessionId: checkoutSession.id, customerId })
        }
      } else {
        // Subscription checkout — only apply an explicit, valid plan.
        const plan = checkoutSession.metadata?.plan
        if (plan && VALID_PLANS.has(plan)) {
          await applyPlanUpgrade(userId, plan as 'STARTER' | 'PRO' | 'AGENCY', customerId)
        }
      }
    }

    return NextResponse.redirect(`${baseUrl}/billing?success=true`)
  } catch (err) {
    console.error('Stripe success sync error:', err)
    return NextResponse.redirect(`${baseUrl}/billing?error=sync_failed`)
  }
}
