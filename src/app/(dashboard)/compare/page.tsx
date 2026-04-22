'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { ScanComparison, type ScanSummary } from '@/components/dashboard/ScanComparison'
import { Columns } from 'lucide-react'
import { useBrand } from '@/lib/brand-context'

export default function ComparePage() {
  const { data: session } = useSession()
  const { brands, currentBrandId, currentBrand, loading: brandsLoading } = useBrand()
  const [scans, setScans] = useState<ScanSummary[]>([])

  useEffect(() => {
    if (!currentBrandId) return
    fetch(`/api/scans?brandId=${currentBrandId}&take=50`)
      .then((r) => r.json())
      .then((rawScans: ScanSummary[]) => setScans(rawScans))
      .catch(() => setScans([]))
  }, [currentBrandId])

  const plan = (session?.user as { plan?: string })?.plan ?? 'FREE'

  if (brandsLoading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Columns className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Comparaison de Scans</h1>
            <p className="text-sm text-muted-foreground">Chargement…</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Columns className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Comparaison de Scans</h1>
          <p className="text-sm text-muted-foreground">
            Comparez deux scans côte à côte pour mesurer votre progression
          </p>
        </div>
      </div>

      {brands.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground text-sm">
          Ajoutez une marque et lancez des scans pour utiliser la comparaison.
        </div>
      ) : !currentBrandId || !currentBrand ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground text-sm">
          Sélectionnez une marque dans la barre latérale.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <p className="text-xs text-muted-foreground">
            Comparaison pour <span className="text-foreground font-medium">{currentBrand.name}</span>
          </p>

          {scans.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Aucun scan pour cette marque. Lancez un scan d&apos;abord !
            </div>
          ) : (
            <ScanComparison brandId={currentBrandId} scans={scans} plan={plan} />
          )}
        </div>
      )}
    </div>
  )
}
