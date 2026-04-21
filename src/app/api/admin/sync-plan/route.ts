export const dynamic = "force-dynamic"
import { prisma } from '@/lib/db'
import { PLAN_CREDITS } from '@/lib/credits'
import { NextResponse } from 'next/server'

type PlanKey = 'FREE' | 'STARTER' | 'PRO' | 'AGENCY'

// Admin endpoint to sync plan - protected by secret
export async function POST(req: Request) {
  const { userId, plan, stripeId, secret, topUpCredits } = await req.json()

  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!['FREE', 'STARTER', 'PRO', 'AGENCY'].includes(plan)) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  const planKey = plan as PlanKey
  const targetCredits = PLAN_CREDITS[planKey]

  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true, plan: true },
  })
  if (!existing) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Credit policy on plan change:
  // - Upgrade OR topUpCredits=true → set credits to the plan's allotment
  //   (never decrease — if user already has more, keep the higher value).
  // - Downgrade with topUpCredits=false → keep existing credits
  //   (don't punish users mid-cycle).
  const isUpgrade =
    planRank(planKey) > planRank(existing.plan as PlanKey)
  const shouldSeed = topUpCredits === true || isUpgrade
  const nextCredits = shouldSeed
    ? Math.max(existing.credits, targetCredits)
    : existing.credits

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      plan: planKey,
      credits: nextCredits,
      ...(stripeId ? { stripeId } : {}),
    },
  })

  return NextResponse.json({
    id: user.id,
    plan: user.plan,
    email: user.email,
    credits: user.credits,
  })
}

function planRank(p: PlanKey): number {
  return { FREE: 0, STARTER: 1, PRO: 2, AGENCY: 3 }[p]
}
