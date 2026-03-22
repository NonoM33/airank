export const dynamic = "force-dynamic"
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { BillingClient } from '@/components/dashboard/BillingClient'
import { PLANS } from '@/lib/stripe'
import { getPlanLimits } from '@/lib/plan-limits'

export default async function BillingPage() {
  const session = await auth()
  const userId = session!.user.id
  const plan = session!.user.plan ?? 'FREE'

  const [user, creditUsage] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { stripeId: true, plan: true, credits: true },
    }),
    prisma.creditUsage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ])

  const limits = getPlanLimits(plan)
  const brandCount = await prisma.brand.count({ where: { userId } })

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Abonnement</h1>
        <p className="text-muted-foreground">Gérez votre abonnement AIRank</p>
      </div>

      <BillingClient
        currentPlan={plan}
        stripeId={user?.stripeId ?? null}
        limits={limits}
        usage={{ brandCount, credits: user?.credits ?? 0 }}
        plans={PLANS}
        creditUsage={creditUsage.map((u) => ({
          id: u.id,
          action: u.action,
          amount: u.amount,
          details: u.details ?? null,
          createdAt: u.createdAt.toISOString(),
        }))}
      />
    </div>
  )
}
