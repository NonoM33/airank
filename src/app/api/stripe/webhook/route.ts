import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import type Stripe from 'stripe'

export const dynamic = 'force-dynamic'

const PRICE_TO_PLAN: Record<string, string> = {
  [process.env.STRIPE_STARTER_PRICE_ID ?? '']: 'STARTER',
  [process.env.STRIPE_PRO_PRICE_ID ?? '']: 'PRO',
  [process.env.STRIPE_AGENCY_PRICE_ID ?? '']: 'AGENCY',
}

async function getPlanFromPriceId(priceId: string): Promise<string> {
  return PRICE_TO_PLAN[priceId] ?? 'FREE'
}

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature or secret' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook error'
    console.error('Webhook signature verification failed:', message)
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.client_reference_id ?? session.metadata?.userId
        const plan = session.metadata?.plan ?? 'STARTER'
        const customerId = typeof session.customer === 'string' ? session.customer : null

        if (userId) {
          await prisma.user.update({
            where: { id: userId },
            data: {
              plan: plan as 'STARTER' | 'PRO' | 'AGENCY',
              ...(customerId ? { stripeId: customerId } : {}),
            },
          })
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = typeof subscription.customer === 'string' ? subscription.customer : null
        if (!customerId) break

        const priceId = subscription.items.data[0]?.price?.id
        const plan = priceId ? await getPlanFromPriceId(priceId) : 'FREE'

        if (subscription.status === 'active' || subscription.status === 'trialing') {
          await prisma.user.updateMany({
            where: { stripeId: customerId },
            data: { plan: plan as 'FREE' | 'STARTER' | 'PRO' | 'AGENCY' },
          })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = typeof subscription.customer === 'string' ? subscription.customer : null
        if (!customerId) break

        await prisma.user.updateMany({
          where: { stripeId: customerId },
          data: { plan: 'FREE' },
        })
        break
      }

      default:
        // Ignore other events
        break
    }
  } catch (err) {
    console.error('Webhook handler error:', err)
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
