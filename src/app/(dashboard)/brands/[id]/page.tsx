export const dynamic = "force-dynamic"
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, ArrowRight, TrendingUp, TrendingDown, Minus, Lock, Sparkles } from 'lucide-react'
import { DashboardScanButton } from '@/components/dashboard/DashboardScanButton'
import { CompetitorRow } from '@/components/dashboard/CompetitorRow'
import { generateRecommendations } from '@/lib/recommendations'
import { getPlanLimits } from '@/lib/plan-limits'
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

function ScoreGauge({ score }: { score: number }) {
  const r = 64
  const circumference = 2 * Math.PI * r
  const dashOffset = circumference * (1 - score / 100)
  const color = getGaugeColor(score)

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-36 h-36">
        <svg className="w-36 h-36" viewBox="0 0 160 160" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="80" cy="80" r={r} fill="none" stroke="#27272A" strokeWidth="10" />
          <circle
            cx="80"
            cy="80"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-4xl font-bold font-mono ${getScoreColor(score)}`}>{score}</span>
          <span className="text-xs text-muted-foreground">/ 100</span>
        </div>
      </div>
      <span className={`text-sm font-semibold ${getScoreColor(score)}`}>{getScoreLabel(score)}</span>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function BrandDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  const userId = session!.user.id
  const plan = (session!.user as { plan?: string }).plan ?? 'FREE'

  const brand = await prisma.brand.findFirst({ where: { id, userId } })
  if (!brand) notFound()

  const limits = getPlanLimits(plan)
  const canAnalyzeCompetitors = limits.competitors > 0

  const keywords: string[] = (() => {
    try { return JSON.parse(brand.keywords) as string[] } catch { return [] }
  })()

  const [allScans, allScanResults, scheduledScan] = await Promise.all([
    prisma.scan.findMany({
      where: { brandId: brand.id },
      orderBy: { createdAt: 'desc' },
      include: { results: true },
    }),
    prisma.scanResult.findMany({
      where: { scan: { brandId: brand.id } },
      select: { competitors: true, llm: true, scanId: true },
    }),
    prisma.scheduledScan.findFirst({
      where: { brandId: brand.id, userId },
    }),
  ])

  const latestScan = allScans[0] ?? null
  const prevScan = allScans[1] ?? null
  const globalScore = latestScan?.globalScore ?? 0
  const trend = latestScan && prevScan ? latestScan.globalScore - prevScan.globalScore : 0

  const llmScores = ['CHATGPT', 'CLAUDE', 'PERPLEXITY', 'GEMINI'].map((llm) => {
    const r = latestScan?.results.find((r) => r.llm === llm)
    return { llm, score: r ? getLLMScore(r) : null, mentioned: r?.mentioned ?? false }
  })

  // Aggregate competitor stats across all scans
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

  const sortedCompetitors = Array.from(competitorStats.entries())
    .sort((a, b) => b[1].llms.size - a[1].llms.size || b[1].totalMentions - a[1].totalMentions)
    .map(([name, stats]) => ({
      name,
      llmCount: stats.llms.size,
      llms: Array.from(stats.llms),
      scanCount: stats.scanIds.size,
      totalMentions: stats.totalMentions,
    }))

  // Recommendations from latest scan
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

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-5xl mx-auto">
      {/* Back */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Dashboard
      </Link>

      {/* ── Section A: Brand Overview ───────────────────────────────────────── */}
      <div className="card-glow rounded-2xl border border-border bg-card p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <ScoreGauge score={globalScore} />
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-2xl font-bold mb-1">{brand.name}</h1>
            {brand.domain && (
              <p className="text-sm text-muted-foreground mb-3">{brand.domain}</p>
            )}
            {trend !== 0 ? (
              <div className={`inline-flex items-center gap-1.5 text-sm font-medium ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {trend > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {trend > 0 ? '+' : ''}{trend} pts depuis le scan précédent
              </div>
            ) : latestScan ? (
              <div className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                <Minus className="h-3 w-3" /> Score stable
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Aucun scan pour l&apos;instant</p>
            )}
          </div>
          <DashboardScanButton
            brand={{ id: brand.id, name: brand.name, keywords, domain: brand.domain ?? null }}
          />
        </div>

        {/* LLM cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-border">
          {llmScores.map(({ llm, score, mentioned }) => (
            <div key={llm} className="rounded-xl bg-secondary/50 border border-border p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">{LLM_LABELS[llm]}</p>
              <p className={`text-2xl font-bold font-mono ${score !== null ? getScoreColor(score) : 'text-muted-foreground'}`}>
                {score !== null ? score : '—'}
              </p>
              {score !== null && (
                <Badge className={`text-[10px] mt-1.5 ${mentioned ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  {mentioned ? '✓ Cité' : '✗ Absent'}
                </Badge>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Section B+C: Competitor Intelligence ──────────────────────────── */}
      {sortedCompetitors.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold">Analyse concurrentielle</h2>
              <p className="text-sm text-muted-foreground">
                {sortedCompetitors.length} concurrent{sortedCompetitors.length > 1 ? 's' : ''} détecté{sortedCompetitors.length > 1 ? 's' : ''} par les IA
              </p>
            </div>
            {canAnalyzeCompetitors ? (
              <Badge className="shrink-0 bg-primary/20 text-primary border-primary/30 gap-1.5">
                <Sparkles className="h-3 w-3" />
                Analyse IA activée
              </Badge>
            ) : (
              <Link href="/billing">
                <Badge className="shrink-0 bg-amber-500/10 text-amber-400 border-amber-500/30 gap-1.5 cursor-pointer hover:bg-amber-500/20 transition-colors">
                  <Lock className="h-3 w-3" />
                  Disponible avec le plan Pro
                </Badge>
              </Link>
            )}
          </div>

          <div className="card-glow rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
            {sortedCompetitors.map((competitor, idx) => (
              <CompetitorRow
                key={competitor.name}
                competitor={competitor}
                brandName={brand.name}
                canAnalyze={canAnalyzeCompetitors}
                rank={idx + 1}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Section D: Scan History ────────────────────────────────────────── */}
      {allScans.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Historique des scans</h2>
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
                    <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Requête</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">LLMs</th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Score</th>
                    <th className="px-4 py-3 w-8" />
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
                            {scan.createdAt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                          </p>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <p className="text-sm text-muted-foreground whitespace-nowrap">
                            {scan.createdAt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
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

      {/* ── Section E: Scheduled Scans ────────────────────────────────────── */}
      <ScheduledScanSection
        brandId={brand.id}
        initial={scheduledScan ? {
          id: scheduledScan.id,
          frequency: scheduledScan.frequency,
          nextRunAt: scheduledScan.nextRunAt.toISOString(),
          lastRunAt: scheduledScan.lastRunAt?.toISOString() ?? null,
          enabled: scheduledScan.enabled,
        } : null}
      />

      {/* ── Section F: Action Plan ─────────────────────────────────────────── */}
      {recommendations.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-lg font-bold">Plan d&apos;action recommandé</h2>

          {[
            { group: quickWins, emoji: '⚡', title: 'Quick Wins — 30 minutes', sub: '(impact rapide, effort minimal)' },
            { group: cetteSmaine, emoji: '📅', title: 'Cette semaine', sub: '(actions à fort impact)' },
            { group: ceMois, emoji: '🗓️', title: 'Ce mois', sub: '(stratégie long terme)' },
          ].map(({ group, emoji, title, sub }) =>
            group.length > 0 ? (
              <div key={title}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base">{emoji}</span>
                  <h3 className="text-sm font-semibold">{title}</h3>
                  <span className="text-xs text-muted-foreground">{sub}</span>
                </div>
                <div className="space-y-3">
                  {group.map((rec, i) => (
                    <div key={i} className={`rounded-xl border p-5 ${PRIORITY_COLORS[rec.priority]}`}>
                      <div className="flex items-start gap-3">
                        <span className="text-xl shrink-0 mt-0.5">{rec.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <Badge className={`text-xs ${PRIORITY_BADGE[rec.priority]}`}>{rec.priorityLabel}</Badge>
                            <Badge className={`text-xs ${DIFFICULTY_BADGE[rec.difficulty] ?? ''}`}>{rec.difficulty}</Badge>
                            <h4 className="font-semibold text-sm">{rec.title}</h4>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{rec.description}</p>
                          <ul className="space-y-1 mb-3">
                            {rec.actions.map((action, j) => (
                              <li key={j} className="text-xs text-muted-foreground flex items-start gap-2">
                                <span className="shrink-0 mt-0.5 text-primary">→</span>
                                {action}
                              </li>
                            ))}
                          </ul>
                          <div className="flex flex-wrap gap-3 pt-2 border-t border-white/5">
                            <span className="text-xs text-muted-foreground">
                              <span className="text-foreground font-medium">Impact :</span> {rec.estimatedImpact}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              <span className="text-foreground font-medium">Résultats en :</span> {rec.timeToResult}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null
          )}
        </div>
      )}
    </div>
  )
}
