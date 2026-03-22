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
    select: { stripeId: true, plan: true },
  })

  if (!user?.stripeId || !stripe) {
    // Check if there's a checkout session for this user
    const sessions = await stripe?.checkout.sessions.list({
      limit: 5,
    })
    
    const userSession = sessions?.data.find(s => s.client_reference_id === session.user.id)
    if (userSession?.customer && userSession.metadata?.plan) {
      const customerId = typeof userSession.customer === 'string' ? userSession.customer : null
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          plan: userSession.metadata.plan as 'STARTER' | 'PRO' | 'AGENCY',
          ...(customerId ? { stripeId: customerId } : {}),
        },
      })
      return NextResponse.json({ plan: userSession.metadata.plan, synced: true })
    }
    
    return NextResponse.json({ plan: user?.plan ?? 'FREE', synced: false })
  }

  // Check active subscriptions
  const subscriptions = await stripe.subscriptions.list({
    customer: user.stripeId,
    status: 'active',
    limit: 1,
  })

  if (subscriptions.data.length > 0) {
    const priceId = subscriptions.data[0].items.data[0]?.price?.id
    let plan = 'FREE'
    if (priceId === process.env.STRIPE_STARTER_PRICE_ID) plan = 'STARTER'
    else if (priceId === process.env.STRIPE_PRO_PRICE_ID) plan = 'PRO'
    else if (priceId === process.env.STRIPE_AGENCY_PRICE_ID) plan = 'AGENCY'

    await prisma.user.update({
      where: { id: session.user.id },
      data: { plan: plan as 'FREE' | 'STARTER' | 'PRO' | 'AGENCY' },
    })
    return NextResponse.json({ plan, synced: true })
  }

  return NextResponse.json({ plan: 'FREE', synced: false })
}
