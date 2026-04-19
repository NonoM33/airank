export const dynamic = "force-dynamic"
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { stripe, LIFETIME_TIERS } from '@/lib/stripe'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  tier: z.enum(['tier1', 'tier2', 'tier3']),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Tier invalide' }, { status: 400 })
  }

  const { tier } = parsed.data
  const tierConfig = LIFETIME_TIERS[tier]
  if (!tierConfig.priceId) {
    return NextResponse.json({ error: 'Configuration Stripe manquante' }, { status: 500 })
  }

  const userId = session.user.id
  const userEmail = session.user.email ?? undefined

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeId: true, isLifetime: true, lifetimeTier: true },
  })

  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price: tierConfig.priceId, quantity: 1 }],
    success_url: `${baseUrl}/api/stripe/success?session_id={CHECKOUT_SESSION_ID}&lifetime=1`,
    cancel_url: `${baseUrl}/billing`,
    customer: user?.stripeId ?? undefined,
    customer_email: user?.stripeId ? undefined : userEmail,
    client_reference_id: userId,
    metadata: { tier, userId, type: 'lifetime', stackable: 'true' },
  })

  return NextResponse.json({ url: checkoutSession.url })
}
