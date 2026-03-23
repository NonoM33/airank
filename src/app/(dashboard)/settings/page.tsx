'use client'

import { useEffect, useState } from 'react'
import { BrandManager } from '@/components/dashboard/BrandManager'
import { getPlanLimits } from '@/lib/plan-limits'
import { useSession } from 'next-auth/react'

interface Brand {
  id: string
  name: string
  domain: string | null
  keywords: string
  userId: string
  isCompetitor: boolean
  parentBrandId: string | null
  sector: string | null
  createdAt: string
  updatedAt: string
  competitors: unknown[]
  _count: { scans: number }
}

export default function SettingsPage() {
  const { data: session } = useSession()
  const [brands, setBrands] = useState<Brand[] | null>(null)

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data: Brand[]) => setBrands(data))
      .catch(() => setBrands([]))
  }, [])

  if (!brands) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Mes Marques</h1>
          <p className="text-muted-foreground">Chargement…</p>
        </div>
      </div>
    )
  }

  const plan = (session?.user as { plan?: string })?.plan ?? 'FREE'
  const limits = getPlanLimits(plan)
  const brandsJson = brands.map((b) => ({
    ...b,
    keywords: (() => { try { return JSON.parse(b.keywords) } catch { return [] } })() as string[],
  }))

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mes Marques</h1>
        <p className="text-muted-foreground">Gérez vos marques et lancez des scans</p>
      </div>

      <BrandManager
        brands={brandsJson}
        maxBrands={limits.brands}
        plan={plan}
      />
    </div>
  )
}
