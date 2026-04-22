'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { ScansHeatmap, type HeatmapScan } from '@/components/dashboard/ScansHeatmap'
import { BarChart2 } from 'lucide-react'
import { useBrand } from '@/lib/brand-context'

export default function HeatmapPage() {
  const { data: session } = useSession()
  const { brands, currentBrandId, currentBrand, loading: brandsLoading } = useBrand()
  const [scans, setScans] = useState<HeatmapScan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (brandsLoading) return
    if (!currentBrandId) {
      setLoading(false)
      return
    }
    setLoading(true)
    fetch(`/api/scans?brandId=${currentBrandId}&take=20&results=true`)
      .then((r) => r.json())
      .then((rawScans: { id: string; query: string; results: { llm: string; mentioned: boolean; score: number | null }[] }[]) => {
        setScans(rawScans.map((s) => ({
          id: s.id,
          query: s.query,
          results: s.results.map((r) => ({
            llm: r.llm,
            mentioned: r.mentioned,
            score: r.score ?? 0,
          })),
        })))
      })
      .finally(() => setLoading(false))
  }, [currentBrandId, brandsLoading])

  const plan = (session?.user as { plan?: string })?.plan ?? 'FREE'

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <BarChart2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Heatmap Requêtes × LLMs</h1>
          <p className="text-sm text-muted-foreground">
            {currentBrand
              ? `Présence de ${currentBrand.name} par requête et par IA`
              : 'Visualisez la présence de votre marque par requête et par IA'}
          </p>
        </div>
      </div>

      {brands.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground text-sm">
          Ajoutez une marque pour voir la heatmap.
        </div>
      ) : !currentBrandId || loading ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground text-sm">
          Chargement…
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-6">
          <ScansHeatmap brandId={currentBrandId} scans={scans} plan={plan} />
        </div>
      )}
    </div>
  )
}
