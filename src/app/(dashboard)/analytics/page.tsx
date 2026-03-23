'use client'

import { useEffect, useState } from 'react'
import { AnalyticsDashboard } from '@/components/dashboard/AnalyticsDashboard'

interface Brand {
  id: string
  name: string
  sector: string | null
}

export default function AnalyticsPage() {
  const [brands, setBrands] = useState<Brand[] | null>(null)

  useEffect(() => {
    fetch('/api/brands')
      .then((r) => r.json())
      .then((data: Brand[]) => setBrands(data))
      .catch(() => setBrands([]))
  }, [])

  if (!brands) {
    return (
      <div className="p-4 lg:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Analytics Avancées</h1>
          <p className="text-muted-foreground text-sm mt-1">Chargement…</p>
        </div>
      </div>
    )
  }

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
