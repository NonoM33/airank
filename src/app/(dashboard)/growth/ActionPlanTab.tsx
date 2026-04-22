'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle2, Circle, Sparkles, Loader2, ChevronDown, ChevronRight,
  Copy, Check, ShieldCheck, AlertCircle, XCircle,
} from 'lucide-react'
import { CreditCTA } from '@/components/ui/credit-cta'
import { useBrandOptional } from '@/lib/brand-context'

type Brand = { id: string; name: string; domain?: string | null }
type ActionItem = {
  id: string
  title: string
  description: string
  impact: string
  difficulty: string
  done: boolean
  dueDate: string | null
  steps?: string[] | string
  codeSnippet?: string | null
  estimatedTime?: string | null
  actionType?: string | null
  verificationStatus?: string | null
}
type ActionPlan = { id: string; items: ActionItem[] }

const IMPACT_COLOR: Record<string, string> = {
  high: 'bg-green-500/20 text-green-400 border-green-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
}
const DIFF_COLOR: Record<string, string> = {
  easy: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  medium: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  hard: 'bg-red-500/20 text-red-400 border-red-500/30',
}

const VERIFY_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  implemented: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    label: 'Implémenté',
    color: 'text-green-400',
  },
  partial: {
    icon: <AlertCircle className="h-4 w-4" />,
    label: 'Partiel',
    color: 'text-yellow-400',
  },
  not_implemented: {
    icon: <XCircle className="h-4 w-4" />,
    label: 'Non implémenté',
    color: 'text-red-400',
  },
}

const IMPACT_POINTS: Record<string, number> = { high: 15, medium: 8, low: 3 }

function parseSteps(steps: string[] | string | undefined): string[] {
  if (!steps) return []
  if (Array.isArray(steps)) return steps
  try { return JSON.parse(steps) } catch { return [] }
}

export function ActionPlanTab({ brands }: { brands: Brand[] }) {
  const ctx = useBrandOptional()
  const selectedBrand = ctx?.currentBrandId ?? brands[0]?.id ?? ''
  const [plan, setPlan] = useState<ActionPlan | null>(null)
  const [loading, setLoading] = useState(false)
  const [creditError, setCreditError] = useState(false)
  const [error, setError] = useState('')
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const [verifying, setVerifying] = useState<Record<string, boolean>>({})
  const [verifyResults, setVerifyResults] = useState<Record<string, { status: string; details: string }>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const brand = brands.find((b) => b.id === selectedBrand)

  // Reset state when brand changes via global switcher
  useEffect(() => {
    setPlan(null)
    setError('')
    setCreditError(false)
    setExpandedItem(null)
    setVerifyResults({})
  }, [selectedBrand])

  async function generate() {
    if (!selectedBrand) return
    setLoading(true)
    setError('')
    setCreditError(false)
    const res = await fetch('/api/action-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandId: selectedBrand }),
    })
    const data = await res.json()
    if (!res.ok) {
      if (res.status === 402) setCreditError(true)
      else setError(data.error ?? 'Erreur lors de la génération')
    } else {
      const items = data.items?.map((item: ActionItem) => ({
        ...item,
        steps: parseSteps(item.steps),
      }))
      setPlan({ ...data, items })
    }
    setLoading(false)
  }

  async function toggleItem(itemId: string, done: boolean) {
    await fetch('/api/action-plan', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, done }),
    })
    setPlan((p) =>
      p ? { ...p, items: p.items.map((i) => (i.id === itemId ? { ...i, done } : i)) } : p
    )
  }

  async function verifyAction(item: ActionItem) {
    if (!brand?.domain) return
    setVerifying((prev) => ({ ...prev, [item.id]: true }))
    const url = brand.domain.startsWith('http') ? brand.domain : `https://${brand.domain}`
    const res = await fetch('/api/action-plan/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actionId: item.id, url, actionType: item.actionType }),
    })
    const data = await res.json()
    setVerifying((prev) => ({ ...prev, [item.id]: false }))
    if (res.ok) {
      setVerifyResults((prev) => ({ ...prev, [item.id]: { status: data.status, details: data.details } }))
      setPlan((p) =>
        p
          ? { ...p, items: p.items.map((i) => (i.id === item.id ? { ...i, verificationStatus: data.status } : i)) }
          : p
      )
    }
  }

  function copySnippet(itemId: string, code: string) {
    navigator.clipboard.writeText(code)
    setCopiedId(itemId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const doneCount = plan?.items.filter((i) => i.done).length ?? 0
  const total = plan?.items.length ?? 0
  const progress = total ? Math.round((doneCount / total) * 100) : 0
  const remainingPotential = plan?.items
    .filter((i) => !i.done)
    .reduce((acc, i) => acc + (IMPACT_POINTS[i.impact] ?? 5), 0) ?? 0

  return (
    <div className="space-y-4">
      {/* Config card */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Plan d&apos;action 30 jours
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Plan pour <span className="text-foreground font-medium">{brand?.name ?? '—'}</span>
          </p>

          <div className="flex items-center gap-3 flex-wrap">
            <Button onClick={generate} disabled={loading || !selectedBrand}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Génération...
                </>
              ) : (
                'Générer (3 crédits)'
              )}
            </Button>
            {plan && !brand?.domain && (
              <p className="text-xs text-yellow-400">
                Ajoutez un domaine à la marque pour activer la vérification automatique.
              </p>
            )}
          </div>

          {creditError && <CreditCTA variant="banner" cost={3} message="Crédits insuffisants pour générer le plan" />}
          {error && <p className="text-sm text-red-400">{error}</p>}
        </CardContent>
      </Card>

      {/* Plan card */}
      {plan && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  {doneCount}/{total} actions complétées
                </span>
                <span className="text-muted-foreground">{progress}%</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              {remainingPotential > 0 && (
                <p className="text-xs text-muted-foreground">
                  +{remainingPotential} pts de visibilité potentiels si toutes les actions sont réalisées
                </p>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-2 pt-0">
            {plan.items.map((item) => {
              const isExpanded = expandedItem === item.id
              const steps = parseSteps(item.steps)
              const verifyResult =
                verifyResults[item.id] ??
                (item.verificationStatus ? { status: item.verificationStatus, details: '' } : null)
              const isVerifying = verifying[item.id]
              const verifyCfg = verifyResult ? VERIFY_CONFIG[verifyResult.status] : null

              return (
                <div
                  key={item.id}
                  className={`rounded-lg border transition-all ${
                    isExpanded
                      ? 'border-primary/40 bg-primary/[0.03]'
                      : item.done
                        ? 'border-border opacity-60'
                        : 'border-border hover:border-primary/30'
                  }`}
                >
                  {/* Row header */}
                  <div
                    className="flex gap-3 p-3 cursor-pointer select-none"
                    onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                  >
                    <button
                      className="mt-0.5 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleItem(item.id, !item.done)
                      }}
                    >
                      {item.done ? (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`text-sm font-medium leading-snug ${
                            item.done ? 'line-through text-muted-foreground' : ''
                          }`}
                        >
                          {item.title}
                        </p>
                        <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                          {verifyCfg && (
                            <span className={verifyCfg.color}>{verifyCfg.icon}</span>
                          )}
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {item.description}
                      </p>
                      <div className="flex gap-2 mt-2 flex-wrap items-center">
                        <Badge
                          className={`text-[10px] border ${IMPACT_COLOR[item.impact] ?? IMPACT_COLOR.medium}`}
                        >
                          {item.impact}
                        </Badge>
                        <Badge
                          className={`text-[10px] border ${DIFF_COLOR[item.difficulty] ?? DIFF_COLOR.medium}`}
                        >
                          {item.difficulty}
                        </Badge>
                        {item.estimatedTime && (
                          <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                            {item.estimatedTime}
                          </span>
                        )}
                        {item.dueDate && (
                          <span className="text-[10px] text-muted-foreground">
                            J+{Math.max(0, Math.ceil((new Date(item.dueDate).getTime() - Date.now()) / 86400000))}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-border px-4 pb-4 pt-3 space-y-5">
                      {/* Full description */}
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>

                      {/* Steps */}
                      {steps.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
                            Étapes
                          </h4>
                          <ol className="space-y-2">
                            {steps.map((step, i) => (
                              <li key={i} className="flex gap-3 text-sm">
                                <span className="shrink-0 h-5 w-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center mt-0.5">
                                  {i + 1}
                                </span>
                                <span className="text-muted-foreground leading-relaxed">{step}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}

                      {/* Code snippet */}
                      {item.codeSnippet && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Code à copier
                            </h4>
                            <button
                              onClick={() => copySnippet(item.id, item.codeSnippet!)}
                              className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-primary transition-colors"
                            >
                              {copiedId === item.id ? (
                                <Check className="h-3 w-3 text-green-400" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                              {copiedId === item.id ? 'Copié !' : 'Copier'}
                            </button>
                          </div>
                          <pre className="bg-[#141416] border border-border rounded-lg p-3 text-[11px] text-green-300 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
                            {item.codeSnippet}
                          </pre>
                        </div>
                      )}

                      {/* Verify section */}
                      <div className="flex items-start justify-between gap-3 pt-1">
                        <div>
                          {verifyResult && verifyCfg ? (
                            <div className={`flex items-center gap-2 text-sm ${verifyCfg.color}`}>
                              {verifyCfg.icon}
                              <span className="font-medium">{verifyCfg.label}</span>
                              {verifyResult.details && (
                                <span className="text-xs text-muted-foreground">— {verifyResult.details}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Pas encore vérifié</span>
                          )}
                        </div>
                        {brand?.domain && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => verifyAction(item)}
                            disabled={isVerifying}
                            className="shrink-0 text-xs"
                          >
                            {isVerifying ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                                Vérification…
                              </>
                            ) : (
                              <>
                                <ShieldCheck className="h-3 w-3 mr-1.5" />
                                Vérifier
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
