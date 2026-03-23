'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { CreditCTA } from '@/components/ui/credit-cta'
import { ArrowLeft, ArrowRight, TrendingUp, TrendingDown, Minus, Lock, Sparkles, Gauge, Loader2, AlertCircle } from 'lucide-react'
import { DashboardScanButton } from '@/components/dashboard/DashboardScanButton'
import { CompetitorRow } from '@/components/dashboard/CompetitorRow'
import { generateRecommendations } from '@/lib/recommendations'
import { getPlanLimits } from '@/lib/plan-data'
import { ScheduledScanSection } from '@/components/dashboard/ScheduledScanSection'

// ─── Score helpers ─────────────────────────────────────────────────────────────

function getLLMScore(r: { mentioned: boolean; position: number | null; sentiment: string | null }) {
  if (!r.mentioned) return 0
  const pos = r.position ? Math.max(20, 100 - (r.position - 1) * 8) : 50
  const mult = r.sentiment === 'POSITIVE' ? 1.0 : r.sentiment === 'NEGATIVE' ? 0.3 : 0.7
  return Math.round(pos * mult)
}

function getScoreColor(score: number) {
  if (score >= 90) return 'text-indigo-400'
  if (score >= 70) return 'text-green-400'
  if (score >= 50) return 'text-amber-400'
  if (score >= 30) return 'text-orange-400'
  return 'text-red-400'
}

function getGaugeColor(score: number) {
  if (score >= 90) return '#6366F1'
  if (score >= 70) return '#22C55E'
  if (score >= 50) return '#F59E0B'
  if (score >= 30) return '#F97316'
  return '#EF4444'
}

function getScoreLabel(score: number) {
  if (score >= 90) return 'Leader IA'
  if (score >= 70) return 'Très visible'
  if (score >= 50) return 'Visible'
  if (score >= 30) return 'Peu visible'
  return 'Invisible'
}

const LLM_LABELS: Record<string, string> = {
  CHATGPT: 'ChatGPT',
  CLAUDE: 'Claude',
  PERPLEXITY: 'Perplexity',
  GEMINI: 'Gemini',
}

const LLM_SHORT: Record<string, string> = {
  CHATGPT: 'GPT',
  CLAUDE: 'CLD',
  PERPLEXITY: 'PPX',
  GEMINI: 'GEM',
}

const PRIORITY_COLORS = {
  critical: 'border-red-500/30 bg-red-500/5 text-red-400',
  important: 'border-amber-500/30 bg-amber-500/5 text-amber-400',
  optimization: 'border-green-500/30 bg-green-500/5 text-green-400',
}

const PRIORITY_BADGE = {
  critical: 'bg-red-500/20 text-red-400',
  important: 'bg-amber-500/20 text-amber-400',
  optimization: 'bg-green-500/20 text-green-400',
}

const DIFFICULTY_BADGE: Record<string, string> = {
  facile: 'bg-green-500/20 text-green-400',
  moyen: 'bg-amber-500/20 text-amber-400',
  avancé: 'bg-red-500/20 text-red-400',
}

// ─── Score Gauge ───────────────────────────────────────────────────────────────

function ScoreGauge({ score, size = 'md' }: { score: number; size?: 'md' | 'lg' }) {
  const r = size === 'lg' ? 72 : 56
  const dim = size === 'lg' ? 180 : 140
  const circumference = 2 * Math.PI * r
  const dashOffset = circumference * (1 - score / 100)
  const color = getGaugeColor(score)

  return (
    <div className="relative shrink-0" style={{ width: dim, height: dim }}>
      <svg width={dim} height={dim} viewBox={`0 0 ${dim} ${dim}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={dim / 2} cy={dim / 2} r={r} fill="none" stroke="#27272A" strokeWidth="10" />
        <circle
          cx={dim / 2} cy={dim / 2} r={r}
          fill="none" stroke={color} strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-bold font-mono ${getScoreColor(score)} ${size === 'lg' ? 'text-4xl' : 'text-3xl'}`}>{score}</span>
        <span className="text-xs text-muted-foreground">/ 100</span>
      </div>
    </div>
  )
}

interface ScanResult {
  id: string
  llm: string
  mentioned: boolean
  position: number | null
  sentiment: string | null
  score: number | null
  competitors: string
}

interface Scan {
  id: string
  query: string
  globalScore: number
  createdAt: string
  results: ScanResult[]
}

interface Brand {
  id: string
  name: string
  domain: string | null
  keywords: string
  sector: string | null
}

interface TrackedCompetitor {
  id: string
  name: string
  domain: string | null
  scans: { globalScore: number; createdAt: string; results: { llm: string; mentioned: boolean; score: number | null }[] }[]
}

interface BrandDetailData {
  brand: Brand
  allScans: Scan[]
  allScanResults: { competitors: string; llm: string; scanId: string }[]
  scheduledScan: { id: string; frequency: string; nextRunAt: string; lastRunAt: string | null; enabled: boolean } | null
  trackedCompetitors: TrackedCompetitor[]
  userBrandNames?: string[]
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BrandDetailPage() {
  const params = useParams()
  const id = params.id as string
  const { data: session } = useSession()
  const [data, setData] = useState<BrandDetailData | null | undefined>(undefined)
  const [perf, setPerf] = useState<any>(null)
  const [perfLoading, setPerfLoading] = useState(false)
  const [perfError, setPerfError] = useState('')

  useEffect(() => {
    if (!id) return
    fetch(`/api/brands/${id}`)
      .then((r) => {
        if (r.status === 404) { setData(null); return null }
        return r.json()
      })
      .then((d) => { if (d) setData(d) })
      .catch(() => setData(null))
  }, [id])

  const plan = (session?.user as { plan?: string })?.plan ?? 'FREE'

  if (data === undefined) {
    return (
      <div className="p-4 lg:p-6">
        <p className="text-muted-foreground">Chargement…</p>
      </div>
    )
  }

  if (data === null) {
    return (
      <div className="p-4 lg:p-6">
        <p className="text-muted-foreground">Marque introuvable.</p>
        <Link href="/dashboard" className="text-primary hover:underline text-sm mt-2 inline-block">← Dashboard</Link>
      </div>
    )
  }

  const { brand, allScans, allScanResults, scheduledScan, trackedCompetitors, userBrandNames = [] } = data

  const limits = getPlanLimits(plan)
  const canAnalyzeCompetitors = limits.competitors > 0

  const keywords: string[] = (() => {
    try { return JSON.parse(brand.keywords) as string[] } catch { return [] }
  })()

  const latestScan = allScans[0] ?? null
  const prevScan = allScans[1] ?? null
  const globalScore = latestScan?.globalScore ?? 0
  const trend = latestScan && prevScan ? latestScan.globalScore - prevScan.globalScore : 0

  const llmScores = ['CHATGPT', 'CLAUDE', 'PERPLEXITY', 'GEMINI'].map((llm) => {
    const r = latestScan?.results.find((r) => r.llm === llm)
    return { llm, score: r ? getLLMScore(r) : null, mentioned: r?.mentioned ?? false }
  })

  const competitorStats = new Map<string, { totalMentions: number; llms: Set<string>; scanIds: Set<string> }>()
  for (const result of allScanResults) {
    const comps: string[] = (() => {
      try { return JSON.parse(result.competitors) as string[] } catch { return [] }
    })()
    for (const comp of comps) {
      if (!comp.trim()) continue
      const s = competitorStats.get(comp) ?? { totalMentions: 0, llms: new Set<string>(), scanIds: new Set<string>() }
      s.totalMentions++
      s.llms.add(result.llm)
      s.scanIds.add(result.scanId)
      competitorStats.set(comp, s)
    }
  }

  const trackedNames = new Set([
    ...trackedCompetitors.map((c) => c.name.toLowerCase()),
    ...userBrandNames.map((n: string) => n.toLowerCase()),
  ])

  const sortedCompetitors = Array.from(competitorStats.entries())
    .sort((a, b) => b[1].llms.size - a[1].llms.size || b[1].totalMentions - a[1].totalMentions)
    .map(([name, stats]) => ({
      name,
      llmCount: stats.llms.size,
      llms: Array.from(stats.llms),
      scanCount: stats.scanIds.size,
      totalMentions: stats.totalMentions,
      isTracked: trackedNames.has(name.toLowerCase()),
    }))

  const recommendations = latestScan
    ? generateRecommendations(
        latestScan.results.map((r) => ({
          llm: r.llm,
          mentioned: r.mentioned,
          position: r.position,
          sentiment: r.sentiment,
          competitors: r.competitors,
        })),
        brand.name,
        brand.domain
      )
    : []

  const quickWins = recommendations.filter((r) => r.category === 'quick-win')
  const cetteSmaine = recommendations.filter((r) => r.category === 'cette-semaine')
  const ceMois = recommendations.filter((r) => r.category === 'ce-mois')
  const mentionedCount = llmScores.filter((s) => s.mentioned).length

  async function analyzePerformance() {
    if (!brand.domain) return
    setPerfLoading(true); setPerfError(''); setPerf(null)
    try {
      const res = await fetch('/api/site-performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: brand.domain }),
      })
      const d = await res.json()
      if (!res.ok) { setPerfError(res.status === 402 ? '__CREDIT__' : d.error || 'Erreur'); return }
      setPerf(d)
    } catch {
      setPerfError('Erreur réseau')
    } finally {
      setPerfLoading(false)
    }
  }

  return (
    <div className="p-4 lg:p-6 space-y-5">

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>
        <DashboardScanButton
          brand={{ id: brand.id, name: brand.name, keywords, domain: brand.domain ?? null }}
        />
      </div>

      {/* ── Hero: Score (left 1/3) + LLM 2×2 (right 2/3) ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Left: gauge + brand info + mini stats */}
        <div className="card-glow rounded-2xl border border-border bg-card p-6 flex flex-col gap-5">
          <div className="flex items-center gap-6">
            <ScoreGauge score={globalScore} size="lg" />
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold truncate">{brand.name}</h1>
              {brand.domain && (
                <p className="text-sm text-muted-foreground mt-0.5">{brand.domain}</p>
              )}
              <div className="mt-3">
                {trend !== 0 ? (
                  <div className={`inline-flex items-center gap-1.5 text-sm font-medium ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {trend > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    {trend > 0 ? '+' : ''}{trend} pts vs scan précédent
                  </div>
                ) : latestScan ? (
                  <div className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                    <Minus className="h-3 w-3" /> Score stable
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Aucun scan pour l&apos;instant</p>
                )}
              </div>
              <div className="mt-2">
                <span className={`text-sm font-semibold ${getScoreColor(globalScore)}`}>
                  {getScoreLabel(globalScore)}
                </span>
              </div>
            </div>
          </div>

          {/* Mini stats row */}
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border">
            <div className="text-center">
              <p className="text-2xl font-bold font-mono">{allScans.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Scans</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold font-mono">{sortedCompetitors.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Concurrents</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold font-mono">
                {mentionedCount}
                <span className="text-sm font-normal text-muted-foreground">/4</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">LLMs actifs</p>
            </div>
          </div>
        </div>

        {/* Right: 2×2 LLM score cards */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-3">
          {llmScores.map(({ llm, score, mentioned }) => (
            <div key={llm} className="card-glow rounded-xl bg-card border border-border p-4 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">{LLM_LABELS[llm]}</p>
                <Badge className={`text-[10px] ${mentioned ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  {mentioned ? '✓ Cité' : '✗ Absent'}
                </Badge>
              </div>
              <p className={`text-4xl font-bold font-mono mt-auto ${score !== null ? getScoreColor(score) : 'text-muted-foreground'}`}>
                {score !== null ? score : '—'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">/ 100</p>
              {score !== null && (
                <p className={`text-xs font-medium mt-1.5 ${getScoreColor(score)}`}>
                  {getScoreLabel(score)}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Analysis: Competitors (left) + Action Plan (right) ──────────────── */}
      {(sortedCompetitors.length > 0 || recommendations.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Competitors */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold">Analyse concurrentielle</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {sortedCompetitors.length > 0
                    ? `${sortedCompetitors.length} concurrent${sortedCompetitors.length > 1 ? 's' : ''} détecté${sortedCompetitors.length > 1 ? 's' : ''}`
                    : 'Aucun concurrent détecté'}
                </p>
              </div>
              {canAnalyzeCompetitors ? (
                <Badge className="shrink-0 bg-primary/20 text-primary border-primary/30 gap-1.5">
                  <Sparkles className="h-3 w-3" />
                  Analyse IA
                </Badge>
              ) : (
                <Link href="/billing">
                  <Badge className="shrink-0 bg-amber-500/10 text-amber-400 border-amber-500/30 gap-1.5 cursor-pointer hover:bg-amber-500/20 transition-colors">
                    <Lock className="h-3 w-3" />
                    Pro
                  </Badge>
                </Link>
              )}
            </div>
            {sortedCompetitors.length > 0 ? (
              <div className="card-glow rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
                {sortedCompetitors.map((competitor, idx) => (
                  <CompetitorRow
                    key={competitor.name}
                    competitor={competitor}
                    brandName={brand.name}
                    brandId={brand.id}
                    canAnalyze={canAnalyzeCompetitors}
                    rank={idx + 1}
                    isTracked={competitor.isTracked}
                  />
                ))}
              </div>
            ) : (
              <div className="card-glow rounded-xl border border-border bg-card p-6 text-center">
                <p className="text-sm text-muted-foreground">Les concurrents apparaîtront après vos premiers scans</p>
              </div>
            )}
          </div>

          {/* Action Plan */}
          <div className="space-y-3">
            <h2 className="text-base font-bold">Plan d&apos;action recommandé</h2>
            {recommendations.length > 0 ? (
              <div className="space-y-2">
                {[
                  { group: quickWins, emoji: '⚡', label: 'Quick Win' },
                  { group: cetteSmaine, emoji: '📅', label: 'Cette semaine' },
                  { group: ceMois, emoji: '🗓️', label: 'Ce mois' },
                ].flatMap(({ group, emoji, label }) =>
                  group.map((rec, i) => (
                    <div key={`${label}-${i}`} className={`rounded-xl border p-3.5 ${PRIORITY_COLORS[rec.priority]}`}>
                      <div className="flex items-start gap-2.5">
                        <span className="text-base shrink-0 mt-0.5">{rec.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            <span className="text-[10px] text-muted-foreground">{emoji} {label}</span>
                            <Badge className={`text-[10px] px-1.5 py-0 ${PRIORITY_BADGE[rec.priority]}`}>
                              {rec.priorityLabel}
                            </Badge>
                            <Badge className={`text-[10px] px-1.5 py-0 ${DIFFICULTY_BADGE[rec.difficulty] ?? ''}`}>
                              {rec.difficulty}
                            </Badge>
                          </div>
                          <p className="text-sm font-semibold">{rec.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{rec.description}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="card-glow rounded-xl border border-border bg-card p-6 text-center">
                <p className="text-sm text-muted-foreground">Lancez un scan pour obtenir des recommandations</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tracked Competitors ─────────────────────────────────────────────── */}
      {trackedCompetitors.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold">Concurrents suivis</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{trackedCompetitors.length} concurrent{trackedCompetitors.length > 1 ? 's' : ''} en suivi actif</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {trackedCompetitors.map((comp) => {
              const latestCompScan = comp.scans[0]
              const score = latestCompScan?.globalScore ?? null
              const compMentionedCount = latestCompScan?.results.filter((r) => r.mentioned).length ?? 0
              return (
                <Link key={comp.id} href={`/brands/${comp.id}`} className="group">
                  <div className="card-glow rounded-xl border border-border bg-card p-4 hover:border-primary/40 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{comp.name}</p>
                        {comp.domain && <p className="text-xs text-muted-foreground truncate mt-0.5">{comp.domain}</p>}
                      </div>
                      {score !== null ? (
                        <span className={`text-2xl font-bold font-mono ml-3 shrink-0 ${getScoreColor(score)}`}>{score}</span>
                      ) : (
                        <span className="text-muted-foreground text-sm ml-3">—</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{compMentionedCount}/4 LLMs</span>
                      {score !== null && (
                        <>
                          <span>·</span>
                          <span className={getScoreColor(score)}>{getScoreLabel(score)}</span>
                        </>
                      )}
                      {!latestCompScan && <span className="text-amber-400">Aucun scan</span>}
                    </div>
                    {score !== null && (
                      <div className="mt-3 h-1 rounded-full bg-border overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${score}%`, backgroundColor: getGaugeColor(score) }}
                        />
                      </div>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Scan History ────────────────────────────────────────────────────── */}
      {allScans.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold">Historique des scans</h2>
            <Link
              href={`/scans?brand=${brand.id}`}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              Voir tout <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="card-glow rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Requête</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Date</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">LLMs</th>
                    <th className="text-right px-5 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Score</th>
                    <th className="px-4 py-2.5 w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {allScans.slice(0, 8).map((scan) => {
                    const mentionCount = scan.results.filter((r) => r.mentioned).length
                    return (
                      <tr key={scan.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="px-5 py-3">
                          <p className="text-sm font-medium max-w-xs truncate">{scan.query}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 sm:hidden">
                            {new Date(scan.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                          </p>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <p className="text-sm text-muted-foreground whitespace-nowrap">
                            {new Date(scan.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                          </p>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <div className="flex items-center gap-1">
                            {scan.results.map((r) => (
                              <Badge
                                key={r.llm}
                                className={`text-[10px] px-1.5 py-0 ${r.mentioned ? 'bg-green-500/20 text-green-400' : 'bg-zinc-800 text-zinc-500'}`}
                              >
                                {LLM_SHORT[r.llm] ?? r.llm}
                              </Badge>
                            ))}
                            <span className="text-xs text-muted-foreground ml-1">{mentionCount}/{scan.results.length}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span className={`font-mono font-bold text-sm ${getScoreColor(scan.globalScore)}`}>
                            {scan.globalScore}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/scans/${scan.id}`} className="text-muted-foreground hover:text-foreground transition-colors">
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Performance Web ─────────────────────────────────────────────────── */}
      {brand.domain && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <Gauge className="h-4 w-4 text-primary" />
                Performance Web
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">{brand.domain}</p>
            </div>
            {!perf && (
              <button
                onClick={analyzePerformance}
                disabled={perfLoading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/60 px-3 py-1.5 text-xs font-medium hover:bg-secondary transition-colors disabled:opacity-50"
              >
                {perfLoading
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Gauge className="h-3.5 w-3.5" />}
                {perfLoading ? 'Analyse…' : 'Analyser (1 crédit)'}
              </button>
            )}
          </div>

          {perfError && (
            perfError === '__CREDIT__' ? <CreditCTA variant="banner" cost={1} /> : (
              <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">
                <AlertCircle className="h-4 w-4 shrink-0" /> {perfError}
              </div>
            )
          )}

          {perfLoading && (
            <div className="card-glow rounded-xl border border-border bg-card p-6 flex items-center justify-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyse en cours (20–30 secondes)…
            </div>
          )}

          {perf && !perfLoading && (
            <div className="card-glow rounded-xl border border-border bg-card p-5 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                {(['mobile', 'desktop'] as const).map(s => {
                  const sc = perf[s].score as number
                  const color = sc >= 90 ? '#22C55E' : sc >= 50 ? '#F97316' : '#EF4444'
                  const textColor = sc >= 90 ? 'text-green-400' : sc >= 50 ? 'text-amber-400' : 'text-red-400'
                  const lbl = sc >= 90 ? 'Excellent' : sc >= 70 ? 'Bon' : sc >= 50 ? 'Moyen' : 'Lent'
                  const r = 30, dim = 76, circ = 2 * Math.PI * r
                  const offset = circ * (1 - sc / 100)
                  return (
                    <div key={s} className="flex items-center gap-4">
                      <div className="relative shrink-0" style={{ width: dim, height: dim }}>
                        <svg width={dim} height={dim} viewBox={`0 0 ${dim} ${dim}`} style={{ transform: 'rotate(-90deg)' }}>
                          <circle cx={dim / 2} cy={dim / 2} r={r} fill="none" stroke="#27272A" strokeWidth="8" />
                          <circle cx={dim / 2} cy={dim / 2} r={r} fill="none" stroke={color} strokeWidth="8"
                            strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-lg font-bold font-mono" style={{ color }}>{sc}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{s === 'mobile' ? '📱 Mobile' : '🖥️ Desktop'}</p>
                        <p className={`text-xs font-semibold mt-0.5 ${textColor}`}>{lbl}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2">Core Web Vitals (Mobile)</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'FCP', v: perf.mobile.fcp, n: perf.mobile.fcpMs, g: 1800, w: 3000 },
                    { label: 'LCP', v: perf.mobile.lcp, n: perf.mobile.lcpMs, g: 2500, w: 4000 },
                    { label: 'CLS', v: perf.mobile.cls, n: perf.mobile.clsValue, g: 0.1, w: 0.25 },
                    { label: 'TBT', v: perf.mobile.tbt, n: perf.mobile.tbtMs, g: 200, w: 600 },
                  ].filter(x => x.v).map(({ label, v, n, g, w }) => {
                    const st = n === null ? 'n' : n <= g ? 'g' : n <= w ? 'w' : 'b'
                    const cls = st === 'g' ? 'bg-green-500/10 text-green-400 border-green-500/20'
                      : st === 'w' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      : st === 'b' ? 'bg-red-500/10 text-red-400 border-red-500/20'
                      : 'bg-secondary text-muted-foreground border-border'
                    return (
                      <div key={label} className={`rounded-lg border px-2.5 py-1.5 ${cls}`}>
                        <p className="text-[10px] font-semibold">{label}</p>
                        <p className="text-sm font-bold font-mono">{v}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="flex justify-end border-t border-border pt-3">
                <Link href="/seo-tools" className="text-xs text-primary hover:underline flex items-center gap-1">
                  Analyse complète dans les outils SEO
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Scheduled Scans ─────────────────────────────────────────────────── */}
      <ScheduledScanSection
        brandId={brand.id}
        initial={scheduledScan ? {
          id: scheduledScan.id,
          frequency: scheduledScan.frequency,
          nextRunAt: scheduledScan.nextRunAt,
          lastRunAt: scheduledScan.lastRunAt,
          enabled: scheduledScan.enabled,
        } : null}
      />
    </div>
  )
}
