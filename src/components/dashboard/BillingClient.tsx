'use client'

import { useState } from 'react'
import { Loader2, CheckCircle2, ExternalLink, Zap, Crown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface PlanInfo {
  name: string
  price: number
  priceId: string
}

interface Limits {
  brands: number
  scansPerDay: number
  llms: number
  historyDays: number
  pdfExport: boolean
  whiteLabel: boolean
  apiAccess: boolean
}

interface Props {
  currentPlan: string
  stripeId: string | null
  limits: Limits
  usage: { todayScans: number; brandCount: number }
  plans: Record<string, PlanInfo>
}

const PLAN_DETAILS: Record<string, { icon: string; color: string; desc: string }> = {
  FREE: { icon: '🆓', color: 'text-zinc-400', desc: 'Accès limité' },
  STARTER: { icon: '🚀', color: 'text-blue-400', desc: 'Pour les indépendants' },
  PRO: { icon: '⭐', color: 'text-indigo-400', desc: 'Pour les équipes marketing' },
  AGENCY: { icon: '🏢', color: 'text-purple-400', desc: 'Pour les agences SEO' },
}

export function BillingClient({ currentPlan, stripeId, limits, usage, plans }: Props) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)

  const planInfo = PLAN_DETAILS[currentPlan] ?? PLAN_DETAILS.FREE

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
                <p className="text-xl font-bold">{currentPlan}</p>
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
                /{limits.brands === 0 ? '∞' : limits.brands}
              </span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">Marques</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold font-mono">
              {usage.todayScans}
              <span className="text-muted-foreground text-base font-normal">
                /{limits.scansPerDay === 0 ? '∞' : limits.scansPerDay}
              </span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">Scans aujourd&apos;hui</p>
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

      {/* Plan options */}
      {currentPlan === 'FREE' && (
        <div>
          <h3 className="font-semibold mb-4">Choisir un plan</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Object.entries(plans).map(([key, plan]) => {
              const detail = PLAN_DETAILS[key] ?? PLAN_DETAILS.FREE
              const isCurrent = key === currentPlan
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
    </div>
  )
}
