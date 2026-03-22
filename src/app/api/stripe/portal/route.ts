export const dynamic = "force-dynamic"
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { stripe } from '@/lib/stripe'
import { NextResponse } from 'next/server'

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { stripeId: true },
  })

  if (!user?.stripeId) {
    return NextResponse.json({ error: 'Aucun abonnement actif trouvé.' }, { status: 400 })
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: user.stripeId,
    return_url: `${baseUrl}/billing`,
  })

  return NextResponse.json({ url: portalSession.url })
}
