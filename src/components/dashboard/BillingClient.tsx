'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2, ExternalLink, Zap, Crown, Coins, Check, X, TrendingUp, TrendingDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface PlanInfo {
  name: string
  price: number
  priceId: string
}

interface Limits {
  brands: number
  credits: number
  llms: number
  historyDays: number
  pdfExport: boolean
  whiteLabel: boolean
  apiAccess: boolean
}

interface CreditUsageEntry {
  id: string
  action: string
  amount: number
  details: string | null
  createdAt: string
}

interface Props {
  currentPlan: string
  stripeId: string | null
  limits: Limits
  usage: { brandCount: number; credits: number }
  plans: Record<string, PlanInfo>
  creditUsage: CreditUsageEntry[]
}

const PLAN_ORDER: Record<string, number> = { FREE: 0, STARTER: 1, PRO: 2, AGENCY: 3 }

const PLAN_META: Record<string, {
  icon: string
  color: string
  desc: string
  displayPrice: string
  brands: string
  credits: string
  llms: string
  history: string
  pdf: boolean
  competitors: string
  whiteLabel: boolean
  api: boolean
}> = {
  FREE: {
    icon: '🆓', color: 'text-zinc-400', desc: 'Découverte',
    displayPrice: '0€', brands: '1', credits: '2', llms: '2', history: '1j',
    pdf: false, competitors: '—', whiteLabel: false, api: false,
  },
  STARTER: {
    icon: '🚀', color: 'text-blue-400', desc: 'Indépendants',
    displayPrice: '19€', brands: '3', credits: '50', llms: '3', history: '30j',
    pdf: false, competitors: '—', whiteLabel: false, api: false,
  },
  PRO: {
    icon: '⭐', color: 'text-indigo-400', desc: 'Équipes marketing',
    displayPrice: '49€', brands: '10', credits: '200', llms: '4', history: '90j',
    pdf: true, competitors: '5', whiteLabel: false, api: false,
  },
  AGENCY: {
    icon: '🏢', color: 'text-purple-400', desc: 'Agences SEO',
    displayPrice: '99€', brands: '50', credits: '1000', llms: '4', history: '∞',
    pdf: true, competitors: '20', whiteLabel: true, api: true,
  },
}

const ALL_PLANS = ['FREE', 'STARTER', 'PRO', 'AGENCY']

const CREDIT_PACKS = [
  { label: '50 crédits', credits: 50, price: 9 },
  { label: '200 crédits', credits: 200, price: 29 },
  { label: '500 crédits', credits: 500, price: 59 },
]

const ACTION_LABELS: Record<string, string> = {
  scan: 'Scan',
  competitor_analysis: 'Analyse concurrentielle',
  content_generation: 'Génération de contenu',
  auto_scan: 'Scan automatique',
}

export function BillingClient({ currentPlan, stripeId, limits, usage, plans, creditUsage }: Props) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [activePlan, setActivePlan] = useState(currentPlan)
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get('success') === 'true' && activePlan === 'FREE') {
      setSyncing(true)
      fetch('/api/stripe/sync', { method: 'POST' })
        .then(r => r.json())
        .then(data => {
          if (data.synced && data.plan !== 'FREE') setActivePlan(data.plan)
          setSyncing(false)
        })
        .catch(() => setSyncing(false))
    }
  }, [searchParams, activePlan])

  const planInfo = PLAN_META[activePlan] ?? PLAN_META.FREE
  const activePlanRank = PLAN_ORDER[activePlan] ?? 0

  async function handleCheckout(planKey: string) {
    setLoadingPlan(planKey)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planKey }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch {
      alert('Une erreur est survenue. Réessayez.')
    }
    setLoadingPlan(null)
  }

  async function handlePortal() {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch {
      alert('Une erreur est survenue. Réessayez.')
    }
    setPortalLoading(false)
  }

  return (
    <div className="space-y-6">

      {/* ── Row 1: Current plan (left) | Usage (right) ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Current plan */}
        <div className="card-glow rounded-xl border border-border bg-card p-6 flex flex-col justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Plan actuel</p>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{planInfo.icon}</span>
              <div>
                <p className="text-2xl font-bold">{syncing ? 'Synchronisation…' : activePlan}</p>
                <p className="text-sm text-muted-foreground">{planInfo.desc}</p>
              </div>
            </div>
          </div>
          {stripeId && activePlan !== 'FREE' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handlePortal}
              disabled={portalLoading}
              className="gap-1.5 self-start"
            >
              {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
              Gérer l&apos;abonnement
            </Button>
          )}
        </div>

        {/* Usage */}
        <div className="card-glow rounded-xl border border-border bg-card p-6">
          <h3 className="font-semibold mb-4">Utilisation</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold font-mono">
                {usage.brandCount}
                <span className="text-muted-foreground text-base font-normal">/{limits.brands}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">Marques</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold font-mono text-primary">{usage.credits}</p>
              <p className="text-xs text-muted-foreground mt-1">Crédits restants</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold font-mono">{limits.llms}</p>
              <p className="text-xs text-muted-foreground mt-1">LLMs</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold font-mono">
                {limits.historyDays >= 3000 ? '∞' : limits.historyDays}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Jours historique</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 2: All plan cards ───────────────────────────────────────────── */}
      <div>
        <h3 className="font-semibold mb-4">Choisir un plan</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ALL_PLANS.map((key) => {
            const meta = PLAN_META[key]
            const planData = plans[key]
            const rank = PLAN_ORDER[key] ?? 0
            const isCurrent = key === activePlan
            const isUpgrade = rank > activePlanRank
            const isDowngrade = rank < activePlanRank
            const isPro = key === 'PRO'

            return (
              <div
                key={key}
                className={`rounded-xl border p-5 flex flex-col gap-4 ${
                  isCurrent
                    ? 'border-primary/50 bg-primary/5'
                    : isPro && isUpgrade
                    ? 'border-primary/30 bg-card'
                    : 'border-border bg-card'
                }`}
              >
                {isCurrent && (
                  <Badge className="bg-primary/20 text-primary text-xs self-start">Plan actuel</Badge>
                )}
                {isPro && isUpgrade && !isCurrent && (
                  <Badge className="bg-primary/20 text-primary text-xs self-start gap-1">
                    <Crown className="h-3 w-3" />
                    Recommandé
                  </Badge>
                )}
                {!isCurrent && !(isPro && isUpgrade) && <div className="h-5" />}

                <div>
                  <p className={`font-semibold flex items-center gap-1.5 ${meta.color}`}>
                    {meta.icon} {planData?.name ?? 'Free'}
                  </p>
                  <p className="text-2xl font-bold mt-1">
                    {meta.displayPrice}
                    {key !== 'FREE' && (
                      <span className="text-sm text-muted-foreground font-normal">/mois</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{meta.desc}</p>
                </div>

                {/* Feature comparison */}
                <div className="space-y-1.5 text-xs flex-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Marques</span>
                    <span className="font-medium">{meta.brands}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Crédits/mois</span>
                    <span className="font-medium">{meta.credits}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">LLMs</span>
                    <span className="font-medium">{meta.llms}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Historique</span>
                    <span className="font-medium">{meta.history}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Concurrents</span>
                    <span className="font-medium">{meta.competitors}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Export PDF</span>
                    {meta.pdf
                      ? <Check className="h-3.5 w-3.5 text-green-400" />
                      : <X className="h-3.5 w-3.5 text-muted-foreground/40" />}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">White-label</span>
                    {meta.whiteLabel
                      ? <Check className="h-3.5 w-3.5 text-green-400" />
                      : <X className="h-3.5 w-3.5 text-muted-foreground/40" />}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Accès API</span>
                    {meta.api
                      ? <Check className="h-3.5 w-3.5 text-green-400" />
                      : <X className="h-3.5 w-3.5 text-muted-foreground/40" />}
                  </div>
                </div>

                {/* CTA */}
                {isCurrent ? (
                  <Button disabled variant="outline" className="w-full text-xs">
                    Plan actuel
                  </Button>
                ) : isUpgrade && planData ? (
                  <Button
                    onClick={() => handleCheckout(key)}
                    disabled={loadingPlan === key}
                    variant={isPro ? 'default' : 'outline'}
                    className="w-full gap-1.5"
                  >
                    {loadingPlan === key
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <TrendingUp className="h-4 w-4" />}
                    Upgrader
                  </Button>
                ) : isDowngrade ? (
                  <Button
                    onClick={handlePortal}
                    disabled={portalLoading}
                    variant="outline"
                    className="w-full gap-1.5 text-muted-foreground"
                  >
                    {portalLoading
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <TrendingDown className="h-4 w-4" />}
                    Réduire
                  </Button>
                ) : (
                  <div />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Row 3: Credit packs (left) | Credit history (right) ────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Credit packs */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Coins className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Recharges de crédits</h3>
          </div>
          <div className="space-y-3">
            {CREDIT_PACKS.map((pack) => (
              <div
                key={pack.credits}
                className="card-glow rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-4"
              >
                <div>
                  <p className="font-semibold text-primary">{pack.label}</p>
                  <p className="text-sm text-muted-foreground">
                    {pack.price}€ HT · {(pack.price / pack.credits * 100).toFixed(1)} cts/crédit
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 shrink-0"
                  onClick={() => alert('Recharges Stripe à intégrer')}
                >
                  <Zap className="h-4 w-4" />
                  Acheter
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Credit usage history */}
        <div>
          <h3 className="font-semibold mb-4">Historique des crédits</h3>
          {creditUsage.length > 0 ? (
            <div className="card-glow rounded-xl border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Action</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Date</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Crédits</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {creditUsage.map((entry) => (
                      <tr key={entry.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium">{ACTION_LABELS[entry.action] ?? entry.action}</span>
                          {entry.details && (
                            <p className="text-xs text-muted-foreground truncate max-w-[180px]">{entry.details}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className="text-sm text-muted-foreground">
                            {new Date(entry.createdAt).toLocaleDateString('fr-FR', {
                              day: '2-digit', month: '2-digit', year: '2-digit',
                            })}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-mono font-bold text-sm ${entry.amount < 0 ? 'text-red-400' : 'text-green-400'}`}>
                            {entry.amount > 0 ? '+' : ''}{entry.amount}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="card-glow rounded-xl border border-border bg-card p-8 text-center">
              <p className="text-sm text-muted-foreground">Aucun mouvement de crédits</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
