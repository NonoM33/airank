'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2, CheckCircle2, ExternalLink, Zap, Crown, Coins } from 'lucide-react'
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

const PLAN_DETAILS: Record<string, { icon: string; color: string; desc: string }> = {
  FREE: { icon: '🆓', color: 'text-zinc-400', desc: 'Accès limité' },
  STARTER: { icon: '🚀', color: 'text-blue-400', desc: 'Pour les indépendants' },
  PRO: { icon: '⭐', color: 'text-indigo-400', desc: 'Pour les équipes marketing' },
  AGENCY: { icon: '🏢', color: 'text-purple-400', desc: 'Pour les agences SEO' },
}

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
          if (data.synced && data.plan !== 'FREE') {
            setActivePlan(data.plan)
          }
          setSyncing(false)
        })
        .catch(() => setSyncing(false))
    }
  }, [searchParams, activePlan])

  const planInfo = PLAN_DETAILS[activePlan] ?? PLAN_DETAILS.FREE

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
      {/* Current plan */}
      <div className="card-glow rounded-xl border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Plan actuel</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{planInfo.icon}</span>
              <div>
                <p className="text-xl font-bold">{syncing ? "Synchronisation..." : activePlan}</p>
                <p className="text-sm text-muted-foreground">{planInfo.desc}</p>
              </div>
            </div>
          </div>
          {stripeId && currentPlan !== 'FREE' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handlePortal}
              disabled={portalLoading}
              className="gap-1.5 shrink-0"
            >
              {portalLoading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <ExternalLink className="h-4 w-4" />
              }
              Gérer l&apos;abonnement
            </Button>
          )}
        </div>
      </div>

      {/* Usage */}
      <div className="card-glow rounded-xl border border-border bg-card p-6">
        <h3 className="font-semibold mb-4">Utilisation</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold font-mono">
              {usage.brandCount}
              <span className="text-muted-foreground text-base font-normal">
                /{limits.brands}
              </span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">Marques</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold font-mono text-primary">
              {usage.credits}
            </p>
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
            <p className="text-xs text-muted-foreground mt-1">Jours d&apos;historique</p>
          </div>
        </div>
      </div>

      {/* Credit packs */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Coins className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Recharges de crédits</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {CREDIT_PACKS.map((pack) => (
            <div
              key={pack.credits}
              className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3"
            >
              <div>
                <p className="font-semibold text-primary">{pack.label}</p>
                <p className="text-2xl font-bold mt-1">
                  {pack.price}€
                  <span className="text-sm text-muted-foreground font-normal"> HT</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {(pack.price / pack.credits * 100).toFixed(1)} cts / crédit
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1.5"
                onClick={() => alert('Recharges Stripe à intégrer')}
              >
                <Zap className="h-4 w-4" />
                Acheter
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Plan options */}
      {activePlan === 'FREE' && (
        <div>
          <h3 className="font-semibold mb-4">Choisir un plan</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Object.entries(plans).map(([key, plan]) => {
              const detail = PLAN_DETAILS[key] ?? PLAN_DETAILS.FREE
              const isCurrent = key === activePlan
              const isPro = key === 'PRO'
              return (
                <div
                  key={key}
                  className={`rounded-xl border p-5 flex flex-col gap-4 ${
                    isPro
                      ? 'border-primary/40 bg-primary/5'
                      : 'border-border bg-card'
                  }`}
                >
                  {isPro && (
                    <Badge className="bg-primary/20 text-primary text-xs self-start gap-1">
                      <Crown className="h-3 w-3" />
                      Recommandé
                    </Badge>
                  )}
                  <div>
                    <p className="font-semibold flex items-center gap-1.5">
                      {detail.icon} {plan.name}
                    </p>
                    <p className="text-2xl font-bold mt-1">
                      {plan.price}€
                      <span className="text-sm text-muted-foreground font-normal">/mois</span>
                    </p>
                  </div>
                  <Button
                    onClick={() => handleCheckout(key)}
                    disabled={isCurrent || loadingPlan === key}
                    variant={isPro ? 'default' : 'outline'}
                    className="w-full gap-1.5"
                  >
                    {loadingPlan === key
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Zap className="h-4 w-4" />
                    }
                    {isCurrent ? 'Plan actuel' : `Choisir ${plan.name}`}
                  </Button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Features list */}
      <div className="card-glow rounded-xl border border-border bg-card p-6">
        <h3 className="font-semibold mb-4">Fonctionnalités incluses</h3>
        <div className="space-y-2">
          {[
            { label: 'Export PDF', active: limits.pdfExport },
            { label: 'Rapports white-label', active: limits.whiteLabel },
            { label: 'Accès API', active: limits.apiAccess },
          ].map(({ label, active }) => (
            <div key={label} className="flex items-center gap-2 text-sm">
              <CheckCircle2
                className={`h-4 w-4 ${active ? 'text-green-400' : 'text-muted-foreground/30'}`}
              />
              <span className={active ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
              {!active && <Badge className="bg-secondary text-muted-foreground text-[10px]">Pro+</Badge>}
            </div>
          ))}
        </div>
      </div>

      {/* Credit usage history */}
      {creditUsage.length > 0 && (
        <div className="card-glow rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="font-semibold">Historique des crédits</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Action</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Détails</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Date</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Crédits</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {creditUsage.map((entry) => (
                  <tr key={entry.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-6 py-3">
                      <span className="text-sm font-medium">{ACTION_LABELS[entry.action] ?? entry.action}</span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-sm text-muted-foreground truncate max-w-xs block">{entry.details ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-muted-foreground">
                        {new Date(entry.createdAt).toLocaleDateString('fr-FR', {
                          day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
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
      )}
    </div>
  )
}
