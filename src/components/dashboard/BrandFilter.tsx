'use client'

import { useRouter } from 'next/navigation'

interface Props {
  brands: { id: string; name: string }[]
  activeBrandId: string | null
}

export function BrandFilter({ brands, activeBrandId }: Props) {
  const router = useRouter()

  return (
    <select
      value={activeBrandId ?? ''}
      onChange={(e) => {
        const val = e.target.value
        router.push(val ? `/scans?brand=${val}` : '/scans')
      }}
      className="h-9 rounded-lg border border-border bg-card px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
    >
      <option value="">Toutes les marques</option>
      {brands.map((b) => (
        <option key={b.id} value={b.id}>
          {b.name}
        </option>
      ))}
    </select>
  )
}
