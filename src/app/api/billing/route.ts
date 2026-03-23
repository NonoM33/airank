export const dynamic = "force-dynamic"
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { PLANS } from '@/lib/stripe'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const userId = session.user.id

  const [user, creditUsage, brandCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { stripeId: true, plan: true, credits: true },
    }),
    prisma.creditUsage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.brand.count({ where: { userId } }),
  ])

  return NextResponse.json({ user, creditUsage, brandCount, plans: PLANS })
}
