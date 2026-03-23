export const dynamic = "force-dynamic"
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { ScansHeatmap, type HeatmapScan } from '@/components/dashboard/ScansHeatmap'
import { BarChart2 } from 'lucide-react'

export default async function HeatmapPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const plan = (session.user as { plan?: string }).plan ?? 'FREE'

  // Get user's first brand (or all scans across brands)
  const brands = await prisma.brand.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true },
    take: 10,
  })

  const brandId = brands[0]?.id

  let scans: HeatmapScan[] = []

  if (brandId) {
    const rawScans = await prisma.scan.findMany({
      where: { brandId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { results: true },
    })

    scans = rawScans.map((s) => ({
      id: s.id,
      query: s.query,
      results: s.results.map((r) => ({
        llm: r.llm,
        mentioned: r.mentioned,
        score: r.score,
      })),
    }))
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <BarChart2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Heatmap Requêtes × LLMs</h1>
          <p className="text-sm text-muted-foreground">
            Visualisez la présence de votre marque par requête et par IA
          </p>
        </div>
      </div>

      {brands.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground text-sm">
          Ajoutez une marque pour voir la heatmap.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-6">
          {brands.length > 1 && (
            <p className="text-xs text-muted-foreground mb-4">
              Marque affichée : <span className="text-foreground font-medium">{brands[0].name}</span>
            </p>
          )}
          <ScansHeatmap brandId={brandId ?? ''} scans={scans} plan={plan} />
        </div>
      )}
    </div>
  )
}
