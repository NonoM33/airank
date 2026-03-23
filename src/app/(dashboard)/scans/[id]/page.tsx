export const dynamic = 'force-dynamic'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, CheckCircle2, XCircle, Download } from 'lucide-react'
import { generateRecommendations } from '@/lib/recommendations'
import { ContentGenerateButton } from '@/components/dashboard/ContentGenerateButton'
import { ScoreGauge } from '@/components/dashboard/ScoreGauge'
import { ConfidenceBadge } from '@/components/dashboard/ConfidenceBadge'
import { MentionHighlight } from '@/components/dashboard/MentionHighlight'

// ─── Score helpers ────────────────────────────────────────────────────────────

function getLLMScore(r: { mentioned: boolean; position: number | null; sentiment: string | null }) {
  if (!r.mentioned) return 0
  const pos = r.position ? Math.max(20, 100 - (r.position - 1) * 8) : 50
  const mult = r.sentiment === 'POSITIVE' ? 1.0 : r.sentiment === 'NEGATIVE' ? 0.3 : 0.7
  return Math.round(pos * mult)
}

function getScoreTextColor(score: number) {
  if (score >= 90) return 'text-indigo-400'
  if (score >= 70) return 'text-green-400'
  if (score >= 50) return 'text-amber-400'
  if (score >= 30) return 'text-orange-400'
  return 'text-red-400'
}

function getLLMCardBorder(score: number) {
  if (score >= 70) return 'border-green-500/30 bg-green-500/5'
  if (score >= 40) return 'border-amber-500/30 bg-amber-500/5'
  return 'border-red-500/30 bg-red-500/5'
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LLM_LABELS: Record<string, { name: string; icon: string }> = {
  CHATGPT:    { name: 'ChatGPT',    icon: '🤖' },
  CLAUDE:     { name: 'Claude',     icon: '🟠' },
  PERPLEXITY: { name: 'Perplexity', icon: '🔵' },
  GEMINI:     { name: 'Gemini',     icon: '💎' },
}

const SENTIMENT_LABELS: Record<string, { label: string; color: string }> = {
  POSITIVE: { label: 'Positif', color: 'text-green-400 bg-green-500/10' },
  NEUTRAL:  { label: 'Neutre',  color: 'text-amber-400 bg-amber-500/10' },
  NEGATIVE: { label: 'Négatif', color: 'text-red-400 bg-red-500/10' },
}

const PRIORITY_COLORS = {
  critical:     'border-red-500/30 bg-red-500/5 text-red-400',
  important:    'border-amber-500/30 bg-amber-500/5 text-amber-400',
  optimization: 'border-green-500/30 bg-green-500/5 text-green-400',
}

const PRIORITY_BADGE = {
  critical:     'bg-red-500/20 text-red-400',
  important:    'bg-amber-500/20 text-amber-400',
  optimization: 'bg-green-500/20 text-green-400',
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ScanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  const userId = session!.user.id

  const scan = await prisma.scan.findFirst({
    where: { id, brand: { userId } },
    include: { brand: true, results: { orderBy: { llm: 'asc' } } },
  })
  if (!scan) notFound()

  const date = scan.createdAt.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const competitorMap = new Map<string, string[]>()
  for (const result of scan.results) {
    const comps: string[] = (() => {
      try { return JSON.parse(result.competitors) as string[] }
      catch { return [] }
    })()
    for (const c of comps) {
      if (!competitorMap.has(c)) competitorMap.set(c, [])
      competitorMap.get(c)!.push(result.llm)
    }
  }
  const competitors = Array.from(competitorMap.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 10)

  const competitorNames = competitors.map(([name]) => name)

  const mentionedCount = scan.results.filter((r) => r.mentioned).length

  const recommendations = generateRecommendations(
    scan.results.map((r) => ({
      llm: r.llm,
      mentioned: r.mentioned,
      position: r.position,
      sentiment: r.sentiment,
      competitors: r.competitors,
    })),
    scan.brand.name,
    scan.brand.domain
  )

  const brandId = scan.brand.id
  const brandName = scan.brand.name
  const brandDomain = scan.brand.domain

  const quickWins = recommendations.filter(r => r.category === 'quick-win')
  const cetteSmaine = recommendations.filter(r => r.category === 'cette-semaine')
  const ceMois = recommendations.filter(r => r.category === 'ce-mois')

  const DIFFICULTY_BADGE: Record<string, string> = {
    facile: 'bg-green-500/20 text-green-400',
    moyen: 'bg-amber-500/20 text-amber-400',
    avancé: 'bg-red-500/20 text-red-400',
  }

  return (
    <div className="p-4 lg:p-6 space-y-5">

      {/* ── Top bar: back + download ─────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/scans"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux scans
        </Link>
        <a
          href={`/api/reports/${scan.brand.id}`}
          className="inline-flex items-center gap-2 text-sm border border-border rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
        >
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Télécharger </span>PDF
        </a>
      </div>

      {/* ── Row 1: Score (left 1/3) + LLM 2×2 (right 2/3) ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Left: gauge + meta */}
        <div className="card-glow rounded-2xl border border-border bg-card p-6 flex flex-col items-center justify-center gap-4">
          <ScoreGauge score={scan.globalScore} />
          <div className="text-center w-full">
            <h1 className="text-base font-bold leading-snug mb-2">
              &ldquo;{scan.query}&rdquo;
            </h1>
            <p className="text-xs text-muted-foreground mb-3">
              {scan.brand.name} · {date}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <ConfidenceBadge llmCount={mentionedCount} totalLlms={scan.results.length} />
              {scan.brand.domain && (
                <span className="text-xs bg-secondary border border-border rounded-full px-3 py-1 text-muted-foreground">
                  {scan.brand.domain}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: 2×2 LLM score cards */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-3">
          {scan.results.map((result) => {
            const llm = LLM_LABELS[result.llm] ?? { name: result.llm, icon: '🔷' }
            const score = getLLMScore(result)
            const sentiment = result.sentiment ? SENTIMENT_LABELS[result.sentiment] : null
            const border = getLLMCardBorder(score)

            return (
              <div key={result.id} className={`rounded-xl border p-4 space-y-3 ${border}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-base">{llm.icon}</span>
                    <span className="font-semibold text-sm">{llm.name}</span>
                    {result.mentioned ? (
                      <Badge className="bg-green-500/20 text-green-400 text-xs gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        #{result.position ?? '?'}
                      </Badge>
                    ) : (
                      <Badge className="bg-red-500/20 text-red-400 text-xs gap-1">
                        <XCircle className="h-3 w-3" />
                        Non cité
                      </Badge>
                    )}
                    {sentiment && (
                      <Badge className={`text-xs ${sentiment.color}`}>{sentiment.label}</Badge>
                    )}
                  </div>
                  <span className={`font-mono font-bold text-base shrink-0 ${getScoreTextColor(score)}`}>
                    {score}/100
                  </span>
                </div>

                {result.mentioned && result.context ? (
                  <div className="bg-background/50 rounded-lg p-3 border border-white/5">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1.5">
                      Extrait mentionné
                    </p>
                    <p className="text-sm leading-relaxed line-clamp-3">
                      {result.context.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
                        part.startsWith('**') && part.endsWith('**') ? (
                          <mark key={i} className="bg-primary/20 text-primary rounded px-0.5 not-italic">
                            {part.slice(2, -2)}
                          </mark>
                        ) : part
                      )}
                    </p>
                  </div>
                ) : !result.mentioned ? (
                  <div className="bg-background/50 rounded-lg p-3 border border-white/5">
                    <p className="text-sm text-muted-foreground">
                      {scan.brand.name} n&apos;a pas été mentionné dans cette réponse.
                    </p>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Row 2: Competitors (left) + Recommendations (right) ─────────────── */}
      {(competitors.length > 0 || recommendations.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Competitors */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Marques recommandées à votre place
            </h2>
            {competitors.length > 0 ? (
              <div className="card-glow rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap gap-2">
                  {competitors.map(([name, llms]) => (
                    <div
                      key={name}
                      className="flex items-center gap-2 bg-secondary border border-border rounded-lg px-3 py-2"
                    >
                      <span className="font-medium text-sm">{name}</span>
                      <div className="flex gap-0.5">
                        {llms.map((llm) => (
                          <span
                            key={llm}
                            className="text-xs bg-background/50 border border-border rounded px-1.5 py-0.5 text-muted-foreground"
                            title={LLM_LABELS[llm]?.name ?? llm}
                          >
                            {LLM_LABELS[llm]?.icon ?? llm}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="card-glow rounded-xl border border-border bg-card p-6 text-center">
                <p className="text-sm text-muted-foreground">Aucun concurrent détecté dans ce scan</p>
              </div>
            )}
          </div>

          {/* All recommendations grouped by category */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Plan d&apos;action
            </h2>
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
                <p className="text-sm text-muted-foreground">Aucune recommandation disponible</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Row 3: Raw LLM responses (full width, collapsible) ──────────────── */}
      {scan.results.some(r => r.rawResponse) && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Réponses brutes des IA
          </h2>
          <div className="space-y-2">
            {scan.results.map((result) => {
              if (!result.rawResponse) return null
              const llm = LLM_LABELS[result.llm] ?? { name: result.llm, icon: '🔷' }
              return (
                <details key={result.id} className="group card-glow rounded-xl border border-border bg-card overflow-hidden">
                  <summary className="cursor-pointer px-5 py-3.5 flex items-center justify-between gap-2 hover:bg-secondary/30 transition-colors select-none list-none">
                    <div className="flex items-center gap-2">
                      <span>{llm.icon}</span>
                      <span className="text-sm font-medium">{llm.name}</span>
                      {result.mentioned ? (
                        <Badge className="bg-green-500/20 text-green-400 text-xs">✓ Mentionné</Badge>
                      ) : (
                        <Badge className="bg-red-500/20 text-red-400 text-xs">✗ Non cité</Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground group-open:hidden">▶ Voir la réponse</span>
                    <span className="text-xs text-muted-foreground hidden group-open:inline">▼ Masquer</span>
                  </summary>
                  <div className="px-5 pb-5 pt-3 border-t border-border">
                    <div className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed overflow-auto max-h-64">
                      <MentionHighlight
                        text={result.rawResponse ?? ''}
                        brandName={brandName}
                        competitors={competitorNames}
                      />
                    </div>
                    {result.rawResponse.length > 300 && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <ContentGenerateButton
                          brandId={brandId}
                          brandName={brandName}
                          type={result.rawResponse.toLowerCase().includes('faq') ? 'faq' : 'article'}
                          context={{ industry: brandDomain ?? undefined }}
                          label="✨ Générer du contenu basé sur cette réponse"
                          cost={2}
                        />
                      </div>
                    )}
                  </div>
                </details>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
