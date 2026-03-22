export const dynamic = "force-dynamic"
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { EvolutionChart } from '@/components/dashboard/EvolutionChart'
import { DashboardOnboarding } from '@/components/dashboard/DashboardOnboarding'
import { NewScanForm } from '@/components/dashboard/NewScanForm'
import { DashboardScanButton } from '@/components/dashboard/DashboardScanButton'
import { TrendingUp, TrendingDown, Minus, ArrowRight, Zap, Settings } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Suspense } from 'react'

function getLLMScore(result: {
  mentioned: boolean
  position: number | null
  sentiment: string | null
}): number {
  if (!result.mentioned) return 0
  const positionScore = result.position ? Math.max(20, 100 - (result.position - 1) * 8) : 50
  const sentimentMultiplier =
    result.sentiment === 'POSITIVE' ? 1.0 : result.sentiment === 'NEGATIVE' ? 0.3 : 0.7
  return Math.round(positionScore * sentimentMultiplier)
}

function getScoreColor(score: number) {
  if (score >= 70) return 'text-green-400'
  if (score >= 40) return 'text-amber-400'
  return 'text-red-400'
}

function getScoreLabel(score: number) {
  if (score >= 70) return { label: 'Visible', color: 'bg-green-500/20 text-green-400' }
  if (score >= 40) return { label: 'Partiel', color: 'bg-amber-500/20 text-amber-400' }
  return { label: 'Invisible', color: 'bg-red-500/20 text-red-400' }
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

function computeChartData(
  scans: { createdAt: Date; globalScore: number }[]
): { date: string; score: number }[] {
  const byDate = new Map<string, number[]>()
  for (const scan of scans) {
    const key = scan.createdAt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
    const arr = byDate.get(key) ?? []
    arr.push(scan.globalScore)
    byDate.set(key, arr)
  }
  return Array.from(byDate.entries()).map(([date, scores]) => ({
    date,
    score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
  }))
}

export default async function DashboardPage() {
  const session = await auth()
  const userId = session!.user.id

  const allBrands = await prisma.brand.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  })

  // ── 0 brands: onboarding ───────────────────────────────────────────────────

  if (allBrands.length === 0) {
    return (
      <div className="p-4 lg:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Bienvenue sur AIRank</p>
        </div>

        {/* Ghost score cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="col-span-2 lg:col-span-1 card-glow rounded-xl bg-card border border-border p-6 flex flex-col items-center justify-center text-center opacity-25">
            <p className="text-5xl font-bold font-mono text-muted-foreground">—</p>
            <p className="text-muted-foreground text-xs mt-1">Score global</p>
          </div>
          {['ChatGPT', 'Claude', 'Perplexity', 'Gemini'].map((llm) => (
            <div key={llm} className="card-glow rounded-xl bg-card border border-border p-4 flex flex-col items-center justify-center text-center opacity-25">
              <p className="text-xs text-muted-foreground font-medium mb-2">{llm}</p>
              <p className="text-2xl font-bold font-mono text-muted-foreground">—</p>
            </div>
          ))}
        </div>

        <div className="card-glow rounded-xl bg-card border border-primary/20 p-8">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Scannez votre première marque</h2>
                <p className="text-sm text-muted-foreground">
                  Découvrez en 20 secondes si l&apos;IA recommande votre marque
                </p>
              </div>
            </div>
            <DashboardOnboarding />
          </div>
        </div>
      </div>
    )
  }

  // ── 2+ brands: multi-brand grid ────────────────────────────────────────────

  if (allBrands.length > 1) {
    const brandsWithData = await Promise.all(
      allBrands.map(async (brand) => {
        const keywords: string[] = (() => {
          try { return JSON.parse(brand.keywords) as string[] } catch { return [] }
        })()
        const [latestScan, competitorRows] = await Promise.all([
          prisma.scan.findFirst({
            where: { brandId: brand.id },
            orderBy: { createdAt: 'desc' },
            include: { results: { select: { llm: true, mentioned: true } } },
          }),
          prisma.scanResult.findMany({
            where: { scan: { brandId: brand.id } },
            select: { competitors: true },
            orderBy: { id: 'desc' },
            take: 30,
          }),
        ])
        const competitorMap = new Map<string, number>()
        for (const row of competitorRows) {
          try {
            for (const c of JSON.parse(row.competitors) as string[]) {
              if (c.trim()) competitorMap.set(c, (competitorMap.get(c) ?? 0) + 1)
            }
          } catch { /* skip */ }
        }
        const topCompetitors = Array.from(competitorMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([name]) => name)
        return { brand, latestScan, topCompetitors, keywords }
      })
    )

    return (
      <div className="p-4 lg:p-6 space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              <span className="text-foreground font-medium">{allBrands.length} marques</span>{' '}
              surveillées
            </p>
          </div>
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 text-sm border border-border rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
          >
            <Settings className="h-4 w-4" />
            Gérer
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {brandsWithData.map(({ brand, latestScan, topCompetitors, keywords }) => {
            const score = latestScan?.globalScore ?? null
            const scoreInfo = score !== null ? getScoreLabel(score) : null
            const llmStatuses = ['CHATGPT', 'CLAUDE', 'PERPLEXITY', 'GEMINI'].map((llm) => {
              if (!latestScan) return { llm, status: 'no-scan' as const }
              const r = latestScan.results.find((r) => r.llm === llm)
              if (!r) return { llm, status: 'no-scan' as const }
              return { llm, status: r.mentioned ? ('mentioned' as const) : ('not-mentioned' as const) }
            })
            const mentionedCount = llmStatuses.filter((s) => s.status === 'mentioned').length

            return (
              <div key={brand.id} className="card-glow rounded-xl bg-card border border-border p-5 flex flex-col gap-4 hover:border-primary/30 transition-colors">
                {/* Brand header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{brand.name}</p>
                    {brand.domain && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{brand.domain}</p>
                    )}
                  </div>
                  {scoreInfo && score !== null && (
                    <Badge className={`shrink-0 text-xs ${scoreInfo.color}`}>{scoreInfo.label}</Badge>
                  )}
                </div>

                {/* Score + LLM dots */}
                <div className="flex items-center gap-4">
                  <div className="shrink-0 text-center">
                    <p className={`text-5xl font-bold font-mono leading-none ${score !== null ? getScoreColor(score) : 'text-muted-foreground'}`}>
                      {score !== null ? score : '—'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">/ 100</p>
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      {llmStatuses.map(({ llm, status }) => (
                        <div key={llm} className="flex flex-col items-center gap-1">
                          <div className={`h-2.5 w-2.5 rounded-full ${
                            status === 'mentioned' ? 'bg-green-400' :
                            status === 'not-mentioned' ? 'bg-red-400' :
                            'bg-zinc-700'
                          }`} />
                          <span className="text-[9px] text-muted-foreground font-mono">{LLM_SHORT[llm]}</span>
                        </div>
                      ))}
                    </div>
                    {latestScan ? (
                      <p className="text-xs text-muted-foreground">
                        {mentionedCount}/4 LLMs · {latestScan.createdAt.toLocaleDateString('fr-FR', {
                          day: '2-digit', month: '2-digit', year: '2-digit',
                        })}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Aucun scan</p>
                    )}
                  </div>
                </div>

                {topCompetitors.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Concurrents IA :</p>
                    <div className="flex flex-wrap gap-1.5">
                      {topCompetitors.map((name) => (
                        <span
                          key={name}
                          className="text-xs bg-secondary border border-border rounded px-2 py-0.5 text-muted-foreground"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2 border-t border-border mt-auto">
                  <DashboardScanButton
                    brand={{ id: brand.id, name: brand.name, keywords, domain: brand.domain ?? null }}
                  />
                  <Link
                    href={`/brands/${brand.id}`}
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-2 hover:border-primary/50 transition-colors whitespace-nowrap"
                  >
                    Détails <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── 1 brand: single detailed view ─────────────────────────────────────────

  const brand = allBrands[0]
  const brandsForForm = allBrands.map((b) => ({
    id: b.id,
    name: b.name,
    domain: b.domain ?? null,
    keywords: (() => { try { return JSON.parse(b.keywords) as string[] } catch { return [] } })(),
  }))

  const [latestScan, prevScan, chartScans, recentScans, allResults] = await Promise.all([
    prisma.scan.findFirst({
      where: { brandId: brand.id },
      orderBy: { createdAt: 'desc' },
      include: { results: true },
    }),
    prisma.scan.findFirst({
      where: { brandId: brand.id },
      orderBy: { createdAt: 'desc' },
      skip: 1,
      select: { globalScore: true },
    }),
    prisma.scan.findMany({
      where: {
        brandId: brand.id,
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true, globalScore: true },
    }),
    prisma.scan.findMany({
      where: { brandId: brand.id },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { results: { select: { llm: true, mentioned: true } } },
    }),
    prisma.scanResult.findMany({
      where: { scan: { brandId: brand.id } },
      select: { competitors: true },
    }),
  ])

  const globalScore = latestScan?.globalScore ?? 0
  const trend = latestScan && prevScan ? latestScan.globalScore - prevScan.globalScore : 0
  const chartData = computeChartData(chartScans)
  const scoreInfo = getScoreLabel(globalScore)

  const llmScores = ['CHATGPT', 'CLAUDE', 'PERPLEXITY', 'GEMINI'].map((llm) => {
    const result = latestScan?.results.find((r) => r.llm === llm)
    return { llm, score: result ? getLLMScore(result) : null, mentioned: result?.mentioned ?? false }
  })

  const competitorMap = new Map<string, number>()
  for (const row of allResults) {
    try {
      const comps = JSON.parse(row.competitors) as string[]
      for (const c of comps) {
        if (c.trim()) competitorMap.set(c, (competitorMap.get(c) ?? 0) + 1)
      }
    } catch { /* skip */ }
  }
  const topCompetitors = Array.from(competitorMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
  const maxCount = topCompetitors[0]?.[1] ?? 1

  return (
    <div className="p-4 lg:p-6 space-y-5">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Visibilité IA de{' '}
            <span className="text-foreground font-medium">{brand.name}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/brands/${brand.id}`}
            className="hidden sm:inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-2 hover:border-primary/50 transition-colors"
          >
            Analyse complète <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <DashboardScanButton brand={brandsForForm[0]} />
        </div>
      </div>

      {/* ── Row 1: 5 score cards in one row ────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">

        {/* Global score */}
        <div className="col-span-2 lg:col-span-1 card-glow rounded-xl bg-card border border-border p-5 flex flex-col">
          <div className="flex items-start justify-between gap-2 mb-3">
            <Badge className={`text-xs ${scoreInfo.color}`}>{scoreInfo.label}</Badge>
            {trend !== 0 ? (
              <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg shrink-0 ${
                trend > 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
              }`}>
                {trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {trend > 0 ? '+' : ''}{trend}
              </div>
            ) : latestScan ? (
              <div className="flex items-center gap-1 text-xs text-muted-foreground px-2 py-1 rounded-lg bg-secondary shrink-0">
                <Minus className="h-3 w-3" /> Stable
              </div>
            ) : null}
          </div>
          <p className={`text-5xl font-bold font-mono leading-none mt-auto ${getScoreColor(globalScore)}`}>
            {globalScore}
          </p>
          <p className="text-xs text-muted-foreground mt-1">/ 100 · Score global</p>
          {latestScan && (
            <p className="text-[10px] text-muted-foreground mt-3 pt-3 border-t border-border">
              {latestScan.createdAt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
            </p>
          )}
        </div>

        {/* 4 LLM cards */}
        {llmScores.map(({ llm, score, mentioned }) => (
          <div
            key={llm}
            className="card-glow rounded-xl bg-card border border-border p-4 flex flex-col"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground font-medium">{LLM_LABELS[llm]}</p>
              {score !== null && (
                <Badge className={`text-[10px] ${mentioned ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  {mentioned ? '✓' : '✗'}
                </Badge>
              )}
            </div>
            {score === null ? (
              <p className="text-2xl font-bold font-mono text-muted-foreground mt-auto">—</p>
            ) : (
              <p className={`text-2xl font-bold font-mono mt-auto ${getScoreColor(score)}`}>{score}</p>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">/ 100</p>
          </div>
        ))}
      </div>

      {/* ── Empty state ─────────────────────────────────────────────────────── */}
      {recentScans.length === 0 && (
        <div className="card-glow rounded-xl bg-card border border-primary/20 p-8 text-center">
          <p className="text-muted-foreground mb-1">Aucune analyse pour le moment.</p>
          <p className="text-sm text-muted-foreground mb-6">
            Lancez votre premier scan pour voir vos scores LLM.
          </p>
          <NewScanForm brands={brandsForForm} defaultBrandId={brand.id} startOpen />
        </div>
      )}

      {/* ── Row 2: Chart (2/3) + sidebar (1/3) ─────────────────────────────── */}
      {chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 card-glow rounded-xl bg-card border border-border p-5">
            <h2 className="text-sm font-semibold mb-4">Évolution sur 30 jours</h2>
            <Suspense fallback={<Skeleton className="h-[200px] w-full" />}>
              <EvolutionChart data={chartData} />
            </Suspense>
          </div>
          <div className="flex flex-col gap-4">
            <div className="card-glow rounded-xl bg-card border border-border p-5">
              <h3 className="text-sm font-semibold mb-3">Nouveau scan</h3>
              <NewScanForm brands={brandsForForm} defaultBrandId={brand.id} />
            </div>
            <Link
              href={`/brands/${brand.id}`}
              className="card-glow rounded-xl bg-card border border-border p-4 flex items-center justify-between gap-2 hover:border-primary/50 transition-colors group"
            >
              <div>
                <p className="text-sm font-semibold">Analyse complète</p>
                <p className="text-xs text-muted-foreground">{brand.name} · détails &amp; recommandations</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground shrink-0" />
            </Link>
          </div>
        </div>
      )}

      {/* ── Recent scans + Competitors ──────────────────────────────────────── */}
      {recentScans.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Recent scans */}
          <div className="card-glow rounded-xl bg-card border border-border overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
              <h2 className="text-sm font-semibold">Dernières analyses</h2>
              <Link href="/scans" className="text-xs text-primary hover:underline flex items-center gap-1">
                Tout voir <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="divide-y divide-border">
              {recentScans.map((scan) => {
                const mentionCount = scan.results.filter((r) => r.mentioned).length
                return (
                  <Link
                    key={scan.id}
                    href={`/scans/${scan.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{scan.query}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {scan.createdAt.toLocaleDateString('fr-FR', {
                          day: '2-digit', month: '2-digit', year: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 ml-3 shrink-0">
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        {mentionCount}/{scan.results.length} LLMs
                      </span>
                      <span className={`font-mono font-bold text-sm ${getScoreColor(scan.globalScore)}`}>
                        {scan.globalScore}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Competitors */}
          <div className="card-glow rounded-xl bg-card border border-border overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border">
              <h2 className="text-sm font-semibold">Concurrents détectés par l&apos;IA</h2>
            </div>
            <div className="p-5 space-y-3.5">
              {topCompetitors.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Les concurrents apparaîtront après vos premiers scans
                </p>
              ) : (
                topCompetitors.map(([name, count], idx) => (
                  <div key={name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="text-muted-foreground font-mono text-xs w-4">#{idx + 1}</span>
                        <span className="font-medium">{name}</span>
                      </span>
                      <span className="text-muted-foreground text-xs">{count} mention{count > 1 ? 's' : ''}</span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary/60 rounded-full transition-all"
                        style={{ width: `${(count / maxCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
