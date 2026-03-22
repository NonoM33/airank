import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { BrandManager } from '@/components/dashboard/BrandManager'
import { getPlanLimits } from '@/lib/plan-limits'

export default async function SettingsPage() {
  const session = await auth()
  const userId = session!.user.id
  const plan = session!.user.plan ?? 'FREE'

  const brands = await prisma.brand.findMany({
    where: { userId },
    include: { competitors: true, _count: { select: { scans: true } } },
    orderBy: { createdAt: 'asc' },
  })

  const limits = getPlanLimits(plan)
  const brandsJson = brands.map((b) => ({
    ...b,
    keywords: (() => { try { return JSON.parse(b.keywords) } catch { return [] } })() as string[],
  }))

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Paramètres</h1>
        <p className="text-muted-foreground">Gérez vos marques et requêtes de scan</p>
      </div>

      <BrandManager
        brands={brandsJson}
        maxBrands={limits.brands}
        plan={plan}
      />
    </div>
  )
}
