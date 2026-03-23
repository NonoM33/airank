'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { ScanComparison, type ScanSummary } from '@/components/dashboard/ScanComparison'
import { Columns } from 'lucide-react'

interface Brand {
  id: string
  name: string
}

export default function ComparePage() {
  const { data: session } = useSession()
  const [brands, setBrands] = useState<Brand[] | null>(null)
  const [selectedBrandId, setSelectedBrandId] = useState<string>('')
  const [scans, setScans] = useState<ScanSummary[]>([])

  useEffect(() => {
    fetch('/api/brands')
      .then((r) => r.json())
      .then((data: Brand[]) => {
        setBrands(data)
        if (data[0]) setSelectedBrandId(data[0].id)
      })
      .catch(() => setBrands([]))
  }, [])

  useEffect(() => {
    if (!selectedBrandId) return
    fetch(`/api/scans?brandId=${selectedBrandId}&take=50`)
      .then((r) => r.json())
      .then((rawScans: ScanSummary[]) => setScans(rawScans))
      .catch(() => setScans([]))
  }, [selectedBrandId])

  const plan = (session?.user as { plan?: string })?.plan ?? 'FREE'
  const selectedBrand = brands?.find(b => b.id === selectedBrandId)

  if (brands === null) {
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
      ) : (
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          {/* Brand selector */}
          {brands.length > 1 && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">Marque :</span>
              <div className="flex flex-wrap gap-2">
                {brands.map(b => (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBrandId(b.id)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                      b.id === selectedBrandId
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-secondary/50 text-muted-foreground border-border hover:border-primary/50'
                    }`}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          {brands.length === 1 && (
            <p className="text-xs text-muted-foreground">
              Marque : <span className="text-foreground font-medium">{selectedBrand?.name}</span>
            </p>
          )}

          {scans.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Aucun scan pour cette marque. Lancez un scan d'abord !
            </div>
          ) : (
            <ScanComparison brandId={selectedBrandId} scans={scans} plan={plan} />
          )}
        </div>
      )}
    </div>
  )
}
