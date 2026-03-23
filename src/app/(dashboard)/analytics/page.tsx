import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { AnalyticsDashboard } from '@/components/dashboard/AnalyticsDashboard'

export const metadata = { title: 'Analytics — AIRank' }

export default async function AnalyticsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const brands = await prisma.brand.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true, sector: true },
    orderBy: { createdAt: 'asc' },
  })

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics Avancées</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Benchmark sectoriel, analyse sentiment, matrice de couverture et score d&apos;autorité IA.
        </p>
      </div>
      <AnalyticsDashboard brands={brands} />
    </div>
  )
}
