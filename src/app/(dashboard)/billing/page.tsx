import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { BillingClient } from '@/components/dashboard/BillingClient'
import { PLANS } from '@/lib/stripe'
import { getPlanLimits } from '@/lib/plan-limits'

export default async function BillingPage() {
  const session = await auth()
  const userId = session!.user.id
  const plan = session!.user.plan ?? 'FREE'

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeId: true, plan: true },
  })

  const limits = getPlanLimits(plan)

  // Count today's scans
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const todayScans = await prisma.scan.count({
    where: { brand: { userId }, createdAt: { gte: startOfDay } },
  })

  const brandCount = await prisma.brand.count({ where: { userId } })

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Facturation</h1>
        <p className="text-muted-foreground">Gérez votre abonnement AIRank</p>
      </div>

      <BillingClient
        currentPlan={plan}
        stripeId={user?.stripeId ?? null}
        limits={limits}
        usage={{ todayScans, brandCount }}
        plans={PLANS}
      />
    </div>
  )
}
