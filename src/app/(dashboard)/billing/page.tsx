'use client'

import { useEffect, useState } from 'react'
import { BillingClient } from '@/components/dashboard/BillingClient'
import { getPlanLimits } from '@/lib/plan-data'

interface BillingData {
  user: { stripeId: string | null; plan: string; credits: number } | null
  creditUsage: { id: string; action: string; amount: number; details: string | null; createdAt: string }[]
  brandCount: number
  plans: Record<string, { name: string; price: number; priceId: string }>
}

export default function BillingPage() {
  const [data, setData] = useState<BillingData | null>(null)

  useEffect(() => {
    fetch('/api/billing')
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
  }, [])

  if (!data) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Abonnement</h1>
          <p className="text-muted-foreground">Chargement…</p>
        </div>
      </div>
    )
  }

  const plan = data.user?.plan ?? 'FREE'
  const limits = getPlanLimits(plan)

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Abonnement</h1>
        <p className="text-muted-foreground">Gérez votre abonnement AIRank</p>
      </div>

      <BillingClient
        currentPlan={plan}
        stripeId={data.user?.stripeId ?? null}
        limits={limits}
        usage={{ brandCount: data.brandCount, credits: data.user?.credits ?? 0 }}
        plans={data.plans}
        creditUsage={data.creditUsage}
      />
    </div>
  )
}
