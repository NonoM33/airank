export const dynamic = "force-dynamic"
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { EvolutionChart } from '@/components/dashboard/EvolutionChart'
import { DashboardOnboarding } from '@/components/dashboard/DashboardOnboarding'
import { NewScanForm } from '@/components/dashboard/NewScanForm'
import { DashboardScanButton } from '@/components/dashboard/DashboardScanButton'
import { TrendingUp, TrendingDown, Minus, ArrowRight, Zap } from 'lucide-react'
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

function computeChartData(
  scans: { createdAt: Date; globalScore: number }[]
): { date: string; score: number }[] {
  const byDate = new Map<string, number[]>()
  for (const scan of scans) {
    const key = scan.createdAt.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
    })
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

  if (allBrands.length === 0) {
    return (
      <div className="p-6 lg:p-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Bienvenue sur AIRank</p>
        </div>

        {/* Teaser score cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="col-span-2 sm:col-span-1 card-glow rounded-xl bg-card border border-border p-6 flex flex-col items-center justify-center text-center opacity-30">
            <p className="text-5xl font-bold font-mono text-muted-foreground">—</p>
            <p className="text-muted-foreground text-xs mt-1">Score global</p>
          </div>
          {['ChatGPT', 'Claude', 'Perplexity', 'Gemini'].map((llm) => (
            <div key={llm} className="card-glow rounded-xl bg-card border border-border p-4 flex flex-col items-center justify-center text-center opacity-30">
              <p className="text-xs text-muted-foreground font-medium mb-2">{llm}</p>
              <p className="text-2xl font-bold font-mono text-muted-foreground">—</p>
              <p className="text-xs text-muted-foreground mt-0.5">/ 100</p>
            </div>
          ))}
        </div>

        {/* Onboarding card */}
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
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Visibilité IA de{' '}
            <span className="text-foreground font-medium">{brand.name}</span>
          </p>
        </div>
        <DashboardScanButton brand={brandsForForm[0]} />
      </div>

      {/* Score + LLM cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
        <div className="col-span-2 lg:col-span-1 card-glow rounded-xl bg-card border border-border p-6 flex flex-col items-center justify-center text-center">
          <Badge className={`text-xs mb-3 ${scoreInfo.color}`}>{scoreInfo.label}</Badge>
          <p className={`text-6xl font-bold font-mono leading-none ${getScoreColor(globalScore)}`}>
            {globalScore}
          </p>
          <p className="text-muted-foreground text-sm mt-1">/ 100</p>
          {trend !== 0 ? (
            <div className={`flex items-center gap-1 mt-3 text-sm font-medium ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {trend > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {trend > 0 ? '+' : ''}{trend} pts
            </div>
          ) : latestScan ? (
            <div className="flex items-center gap-1 mt-3 text-sm text-muted-foreground">
              <Minus className="h-3 w-3" /> Stable
            </div>
          ) : null}
        </div>

        {llmScores.map(({ llm, score, mentioned }) => (
          <div
            key={llm}
            className="card-glow rounded-xl bg-card border border-border p-4 flex flex-col items-center justify-center text-center"
          >
            <p className="text-xs text-muted-foreground font-medium mb-2">{LLM_LABELS[llm]}</p>
            {score === null ? (
              <p className="text-2xl font-bold font-mono text-muted-foreground">—</p>
            ) : (
              <p className={`text-3xl font-bold font-mono ${getScoreColor(score)}`}>{score}</p>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">/ 100</p>
            {score !== null && (
              <Badge className={`text-[10px] mt-2 ${mentioned ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {mentioned ? '✓ Mentionné' : '✗ Absent'}
              </Badge>
            )}
          </div>
        ))}
      </div>

      {/* No scans yet — show big CTA */}
      {recentScans.length === 0 && (
        <div className="card-glow rounded-xl bg-card border border-primary/20 p-8 text-center">
          <p className="text-muted-foreground mb-1">Aucune analyse pour le moment.</p>
          <p className="text-sm text-muted-foreground mb-6">
            Lancez votre premier scan pour voir vos scores LLM.
          </p>
          <NewScanForm brands={brandsForForm} defaultBrandId={brand.id} startOpen />
        </div>
      )}

      {/* Evolution chart */}
      {chartData.length > 0 && (
        <div className="card-glow rounded-xl bg-card border border-border p-6">
          <h2 className="text-base font-semibold mb-4">Évolution sur 30 jours</h2>
          <Suspense fallback={<Skeleton className="h-[220px] w-full" />}>
            <EvolutionChart data={chartData} />
          </Suspense>
        </div>
      )}

      {/* Recent scans + Competitors */}
      {recentScans.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent scans */}
          <div className="card-glow rounded-xl bg-card border border-border">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-base font-semibold">Dernières analyses</h2>
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
                    className="flex items-center justify-between px-6 py-3 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{scan.query}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {scan.createdAt.toLocaleDateString('fr-FR', {
                          day: '2-digit', month: '2-digit', year: '2-digit',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 ml-4 shrink-0">
                      <span className="text-xs text-muted-foreground">
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

          {/* Competitor ranking */}
          <div className="card-glow rounded-xl bg-card border border-border">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-base font-semibold">Concurrents détectés par l&apos;IA</h2>
            </div>
            <div className="p-6 space-y-4">
              {topCompetitors.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Les concurrents apparaîtront ici après vos premiers scans
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
