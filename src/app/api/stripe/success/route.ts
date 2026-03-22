export const dynamic = "force-dynamic"
import { prisma } from '@/lib/db'
import { stripe } from '@/lib/stripe'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const sessionId = url.searchParams.get('session_id')
  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://airank.fr'

  if (!sessionId || !stripe) {
    return NextResponse.redirect(`${baseUrl}/billing?error=missing_session`)
  }

  try {
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId)

    if (checkoutSession.payment_status === 'paid') {
      const userId = checkoutSession.client_reference_id ?? checkoutSession.metadata?.userId
      const plan = checkoutSession.metadata?.plan ?? 'PRO'
      const customerId = typeof checkoutSession.customer === 'string' ? checkoutSession.customer : null

      if (userId) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            plan: plan as 'STARTER' | 'PRO' | 'AGENCY',
            ...(customerId ? { stripeId: customerId } : {}),
          },
        })
      }
    }

    return NextResponse.redirect(`${baseUrl}/billing?success=true`)
  } catch (err) {
    console.error('Stripe success sync error:', err)
    return NextResponse.redirect(`${baseUrl}/billing?error=sync_failed`)
  }
}
