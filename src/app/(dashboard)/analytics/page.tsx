'use client'

import { AnalyticsDashboard } from '@/components/dashboard/AnalyticsDashboard'
import { useBrand } from '@/lib/brand-context'

export default function AnalyticsPage() {
  const { brands, loading } = useBrand()

  if (loading) {
    return (
      <div className="p-4 lg:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Analyses avancées</h1>
          <p className="text-muted-foreground text-sm mt-1">Chargement…</p>
        </div>
      </div>
    )
  }

  // AnalyticsDashboard still takes the brands prop (it needs names for display)
  // but reads the active brand id from the shared BrandContext.
  const brandsForDashboard = brands.map((b) => ({
    id: b.id,
    name: b.name,
    sector: (b as { sector?: string | null }).sector ?? null,
  }))

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analyses avancées</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Benchmark sectoriel, analyse sentiment, matrice de couverture et score d&apos;autorité IA.
        </p>
      </div>
      <AnalyticsDashboard brands={brandsForDashboard} />
    </div>
  )
}
