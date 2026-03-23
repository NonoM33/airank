'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { ScansHeatmap, type HeatmapScan } from '@/components/dashboard/ScansHeatmap'
import { BarChart2 } from 'lucide-react'

interface Brand {
  id: string
  name: string
}

export default function HeatmapPage() {
  const { data: session } = useSession()
  const [brands, setBrands] = useState<Brand[] | null>(null)
  const [scans, setScans] = useState<HeatmapScan[]>([])

  useEffect(() => {
    fetch('/api/brands')
      .then((r) => r.json())
      .then((data: Brand[]) => {
        setBrands(data)
        const firstId = data[0]?.id
        if (firstId) {
          return fetch(`/api/scans?brandId=${firstId}&take=20&results=true`)
            .then((r) => r.json())
            .then((rawScans: { id: string; query: string; results: { llm: string; mentioned: boolean; score: number | null }[] }[]) => {
              setScans(rawScans.map((s) => ({
                id: s.id,
                query: s.query,
                results: s.results.map((r) => ({
                  llm: r.llm,
                  mentioned: r.mentioned,
                  score: r.score,
                })),
              })))
            })
        }
      })
      .catch(() => setBrands([]))
  }, [])

  const plan = (session?.user as { plan?: string })?.plan ?? 'FREE'

  if (!brands) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <BarChart2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Heatmap Requêtes × LLMs</h1>
            <p className="text-sm text-muted-foreground">Chargement…</p>
          </div>
        </div>
      </div>
    )
  }

  const brandId = brands[0]?.id ?? ''

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
          <ScansHeatmap brandId={brandId} scans={scans} plan={plan} />
        </div>
      )}
    </div>
  )
}
