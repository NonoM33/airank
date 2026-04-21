export const dynamic = 'force-dynamic'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { stripe, CREDIT_PACKS } from '@/lib/stripe'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  pack: z.enum(['PACK_50', 'PACK_200', 'PACK_500', 'PACK_2000']),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  if (!stripe) {
    return NextResponse.json({ error: 'Stripe non configuré' }, { status: 500 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Pack invalide' }, { status: 400 })
  }

  const { pack } = parsed.data
  const packConfig = CREDIT_PACKS[pack]

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { stripeId: true, email: true },
  })

  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: `AIRank — ${packConfig.label}`,
            description: `Recharge de ${packConfig.credits} crédits pour votre compte AIRank`,
          },
          unit_amount: packConfig.price * 100,
        },
        quantity: 1,
      }],
      success_url: `${baseUrl}/billing?recharged=${packConfig.credits}`,
      cancel_url: `${baseUrl}/billing`,
      customer: user?.stripeId ?? undefined,
      customer_email: user?.stripeId ? undefined : (user?.email ?? session.user.email ?? undefined),
      client_reference_id: session.user.id,
      metadata: {
        type: 'credit_recharge',
        pack,
        credits: String(packConfig.credits),
        userId: session.user.id,
      },
    })
    return NextResponse.json({ url: checkoutSession.url })
  } catch (err) {
    console.error('[stripe/recharge] create session failed', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      {
        error: 'Le paiement est momentanément indisponible. Réessayez dans quelques instants.',
        detail: process.env.NODE_ENV === 'development' ? message : undefined,
      },
      { status: 502 }
    )
  }
}
