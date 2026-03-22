export const dynamic = 'force-dynamic'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, CheckCircle2, XCircle, Download } from 'lucide-react'
import { generateRecommendations } from '@/lib/recommendations'

// ─── Score helpers ────────────────────────────────────────────────────────────

function getLLMScore(r: { mentioned: boolean; position: number | null; sentiment: string | null }) {
  if (!r.mentioned) return 0
  const pos = r.position ? Math.max(20, 100 - (r.position - 1) * 8) : 50
  const mult = r.sentiment === 'POSITIVE' ? 1.0 : r.sentiment === 'NEGATIVE' ? 0.3 : 0.7
  return Math.round(pos * mult)
}

function getScoreLabel(score: number) {
  if (score >= 90) return { text: 'Leader IA', color: 'text-indigo-400' }
  if (score >= 70) return { text: 'Très visible', color: 'text-green-400' }
  if (score >= 50) return { text: 'Visible', color: 'text-amber-400' }
  if (score >= 30) return { text: 'Peu visible', color: 'text-orange-400' }
  return { text: 'Invisible', color: 'text-red-400' }
}

function getGaugeColor(score: number) {
  if (score >= 90) return '#6366F1'
  if (score >= 70) return '#22C55E'
  if (score >= 50) return '#F59E0B'
  if (score >= 30) return '#F97316'
  return '#EF4444'
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
  CHATGPT:   { name: 'ChatGPT',   icon: '🤖' },
  CLAUDE:    { name: 'Claude',    icon: '🟠' },
  PERPLEXITY:{ name: 'Perplexity',icon: '🔵' },
  GEMINI:    { name: 'Gemini',    icon: '💎' },
}

const SENTIMENT_LABELS: Record<string, { label: string; color: string }> = {
  POSITIVE: { label: 'Positif',  color: 'text-green-400 bg-green-500/10' },
  NEUTRAL:  { label: 'Neutre',   color: 'text-amber-400 bg-amber-500/10' },
  NEGATIVE: { label: 'Négatif',  color: 'text-red-400   bg-red-500/10'   },
}

const PRIORITY_COLORS = {
  critical:     'border-red-500/30    bg-red-500/5    text-red-400',
  important:    'border-amber-500/30  bg-amber-500/5  text-amber-400',
  optimization: 'border-green-500/30  bg-green-500/5  text-green-400',
}

const PRIORITY_BADGE = {
  critical:     'bg-red-500/20    text-red-400',
  important:    'bg-amber-500/20  text-amber-400',
  optimization: 'bg-green-500/20  text-green-400',
}

// ─── Gauge SVG (server-safe) ──────────────────────────────────────────────────

function ScoreGauge({ score }: { score: number }) {
  const r = 64
  const cx = 80
  const cy = 80
  const circumference = 2 * Math.PI * r
  const dashOffset = circumference * (1 - score / 100)
  const color = getGaugeColor(score)
  const textColor = getScoreTextColor(score)
  const label = getScoreLabel(score)

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-40 h-40">
        <svg
          className="w-40 h-40"
          viewBox="0 0 160 160"
          style={{ transform: 'rotate(-90deg)' }}
        >
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#27272A" strokeWidth="10" />
          <circle
            cx={cx}
            cy={cy}
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
          <span className={`text-4xl font-bold font-mono ${textColor}`}>{score}</span>
          <span className="text-xs text-muted-foreground">/ 100</span>
        </div>
      </div>
      <span className={`text-sm font-semibold ${label.color}`}>{label.text}</span>
    </div>
  )
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

  // Aggregate competitor data
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

  const mentionedCount = scan.results.filter((r) => r.mentioned).length

  const recommendations = generateRecommendations(
    scan.results.map((r) => ({
      llm: r.llm,
      mentioned: r.mentioned,
      position: r.position,
      sentiment: r.sentiment,
    })),
    scan.brand.name
  )

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Back link */}
      <Link
        href="/scans"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux scans
      </Link>

      {/* ── Section 1: Header ──────────────────────────────────────────────── */}
      <div className="card-glow rounded-2xl border border-border bg-card p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <ScoreGauge score={scan.globalScore} />
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-xl font-bold leading-snug mb-2">
              &ldquo;{scan.query}&rdquo;
            </h1>
            <p className="text-sm text-muted-foreground mb-4">
              {scan.brand.name} · {date}
            </p>
            <div className="flex flex-wrap justify-center md:justify-start gap-2">
              <span className="text-xs bg-secondary border border-border rounded-full px-3 py-1">
                {mentionedCount}/{scan.results.length} LLMs mentionnent
              </span>
              {scan.brand.domain && (
                <span className="text-xs bg-secondary border border-border rounded-full px-3 py-1">
                  {scan.brand.domain}
                </span>
              )}
            </div>
          </div>
          <div className="shrink-0">
            <a
              href={`/api/reports/${scan.brand.id}`}
              className="inline-flex items-center gap-2 text-sm border border-border rounded-lg px-4 py-2 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
            >
              <Download className="h-4 w-4" />
              Télécharger PDF
            </a>
          </div>
        </div>
      </div>

      {/* ── Section 2: LLM Breakdown ──────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Résultats par IA
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {scan.results.map((result) => {
            const llm = LLM_LABELS[result.llm] ?? { name: result.llm, icon: '🔷' }
            const score = getLLMScore(result)
            const sentiment = result.sentiment ? SENTIMENT_LABELS[result.sentiment] : null
            const border = getLLMCardBorder(score)

            return (
              <div key={result.id} className={`rounded-xl border p-5 space-y-3 ${border}`}>
                {/* LLM header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-lg">{llm.icon}</span>
                    <span className="font-semibold">{llm.name}</span>
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
                      <Badge className={`text-xs ${sentiment.color}`}>
                        {sentiment.label}
                      </Badge>
                    )}
                  </div>
                  <span className={`font-mono font-bold text-lg shrink-0 ${getScoreTextColor(score)}`}>
                    {score}/100
                  </span>
                </div>

                {/* Context */}
                {result.mentioned && result.context ? (
                  <div className="bg-background/50 rounded-lg p-3 border border-white/5">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1.5">
                      Extrait mentionné
                    </p>
                    <p className="text-sm leading-relaxed">
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

                {/* Collapsible raw response */}
                {result.rawResponse && (
                  <details className="group">
                    <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors select-none list-none flex items-center gap-1.5">
                      <span className="group-open:hidden">▶</span>
                      <span className="hidden group-open:inline">▼</span>
                      Réponse brute
                    </summary>
                    <div className="mt-2 bg-background/50 rounded-lg p-3 border border-white/5">
                      <p className="text-xs font-mono text-muted-foreground leading-relaxed">
                        {result.rawResponse.slice(0, 300)}
                        {result.rawResponse.length > 300 && '…'}
                      </p>
                      {result.rawResponse.length > 300 && (
                        <details className="mt-1">
                          <summary className="cursor-pointer text-xs text-primary hover:underline select-none list-none">
                            Voir tout
                          </summary>
                          <pre className="mt-2 text-xs font-mono text-muted-foreground whitespace-pre-wrap leading-relaxed overflow-auto max-h-64">
                            {result.rawResponse}
                          </pre>
                        </details>
                      )}
                    </div>
                  </details>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Section 3: Competitors ────────────────────────────────────────── */}
      {competitors.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Marques recommandées à votre place
          </h2>
          <div className="card-glow rounded-xl border border-border bg-card p-5">
            <div className="flex flex-wrap gap-3">
              {competitors.map(([name, llms]) => (
                <div
                  key={name}
                  className="flex items-center gap-2 bg-secondary border border-border rounded-lg px-3 py-2"
                >
                  <span className="font-medium text-sm">{name}</span>
                  <div className="flex gap-1">
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
        </div>
      )}

      {/* ── Section 4: Recommendations ────────────────────────────────────── */}
      {recommendations.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Recommandations
          </h2>
          <div className="space-y-3">
            {recommendations.map((rec, i) => (
              <div
                key={i}
                className={`rounded-xl border p-5 ${PRIORITY_COLORS[rec.priority]}`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl shrink-0 mt-0.5">{rec.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Badge className={`text-xs ${PRIORITY_BADGE[rec.priority]}`}>
                        {rec.priorityLabel}
                      </Badge>
                      <h3 className="font-semibold text-sm">{rec.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{rec.description}</p>
                    <ul className="space-y-1">
                      {rec.actions.map((action, j) => (
                        <li key={j} className="text-xs text-muted-foreground flex items-start gap-2">
                          <span className="shrink-0 mt-0.5 text-primary">→</span>
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
