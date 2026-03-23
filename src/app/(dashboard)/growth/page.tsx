import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { ActionPlanTab } from './ActionPlanTab'
import { ROISimulator } from './ROISimulator'
import { HeadToHeadTab } from './HeadToHeadTab'
import { WidgetTab } from './WidgetTab'

export const metadata = { title: 'Croissance — AIRank' }

export default async function GrowthPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const brands = await prisma.brand.findMany({
    where: { userId: session.user.id, isCompetitor: false },
    select: { id: true, name: true },
    orderBy: { createdAt: 'asc' },
  })

  if (brands.length === 0) {
    return (
      <div className="p-6 max-w-2xl">
        <h1 className="text-2xl font-bold mb-2">Outils de croissance</h1>
        <p className="text-muted-foreground">Ajoutez d&apos;abord une marque dans <a href="/settings" className="text-primary hover:underline">Mes Marques</a>.</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Outils de croissance</h1>
        <p className="text-muted-foreground text-sm mt-1">Développez votre visibilité IA avec des outils actionnables.</p>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Plan d&apos;action</h2>
        <ActionPlanTab brands={brands} />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Simulateur ROI</h2>
        <ROISimulator />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Comparateur Head-to-Head</h2>
        <HeadToHeadTab />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Widget de badge</h2>
        <WidgetTab brands={brands} />
      </section>
    </div>
  )
}
