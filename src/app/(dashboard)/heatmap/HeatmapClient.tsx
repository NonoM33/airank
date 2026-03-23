'use client'

import { useRouter, useSearchParams } from 'next/navigation'

export function HeatmapBrandSelector({ brands, selectedId }: { brands: { id: string; name: string }[]; selectedId: string }) {
  const router = useRouter()

  if (brands.length <= 1) {
    return (
      <p className="text-xs text-muted-foreground mb-4">
        Marque : <span className="text-foreground font-medium">{brands[0]?.name}</span>
      </p>
    )
  }

  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-xs text-muted-foreground">Marque :</span>
      <div className="flex flex-wrap gap-2">
        {brands.map(b => (
          <button
            key={b.id}
            onClick={() => router.push(`/heatmap?brand=${b.id}`)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
              b.id === selectedId
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-secondary/50 text-muted-foreground border-border hover:border-primary/50'
            }`}
          >
            {b.name}
          </button>
        ))}
      </div>
    </div>
  )
}
