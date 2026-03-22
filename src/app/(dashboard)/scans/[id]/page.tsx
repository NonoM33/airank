export const dynamic = "force-dynamic"
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'

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

const LLM_LABELS: Record<string, { name: string; color: string }> = {
  CHATGPT: { name: 'ChatGPT', color: 'bg-emerald-500/10 border-emerald-500/30' },
  CLAUDE: { name: 'Claude', color: 'bg-orange-500/10 border-orange-500/30' },
  PERPLEXITY: { name: 'Perplexity', color: 'bg-blue-500/10 border-blue-500/30' },
  GEMINI: { name: 'Gemini', color: 'bg-purple-500/10 border-purple-500/30' },
}

const SENTIMENT_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  POSITIVE: { label: 'Positif', color: 'text-green-400 bg-green-500/10', icon: '😊' },
  NEUTRAL: { label: 'Neutre', color: 'text-amber-400 bg-amber-500/10', icon: '😐' },
  NEGATIVE: { label: 'Négatif', color: 'text-red-400 bg-red-500/10', icon: '😟' },
}

export default async function ScanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  const userId = session!.user.id

  const scan = await prisma.scan.findFirst({
    where: { id, brand: { userId } },
    include: {
      brand: true,
      results: { orderBy: { llm: 'asc' } },
    },
  })

  if (!scan) notFound()

  const globalScoreColor = getScoreColor(scan.globalScore)

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/scans"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux scans
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold leading-tight">&quot;{scan.query}&quot;</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {scan.brand.name} •{' '}
              {scan.createdAt.toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className={`text-4xl font-bold font-mono ${globalScoreColor}`}>
              {scan.globalScore}
            </p>
            <p className="text-xs text-muted-foreground">Score global / 100</p>
          </div>
        </div>
      </div>

      {/* LLM result cards */}
      <div className="space-y-4">
        {scan.results.map((result) => {
          const llmInfo = LLM_LABELS[result.llm] ?? { name: result.llm, color: 'bg-card border-border' }
          const score = getLLMScore(result)
          const competitors = (() => {
            try { return JSON.parse(result.competitors) as string[] }
            catch { return [] }
          })()
          const sentiment = result.sentiment ? SENTIMENT_LABELS[result.sentiment] : null

          return (
            <div key={result.id} className={`rounded-xl border p-6 space-y-4 ${llmInfo.color}`}>
              {/* LLM header */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold text-base">{llmInfo.name}</h2>
                  {result.mentioned ? (
                    <Badge className="bg-green-500/20 text-green-400 text-xs gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Mentionné{result.position ? ` — Position #${result.position}` : ''}
                    </Badge>
                  ) : (
                    <Badge className="bg-red-500/20 text-red-400 text-xs gap-1">
                      <XCircle className="h-3 w-3" />
                      Non mentionné
                    </Badge>
                  )}
                  {sentiment && (
                    <Badge className={`text-xs ${sentiment.color}`}>
                      {sentiment.icon} {sentiment.label}
                    </Badge>
                  )}
                </div>
                <span className={`font-mono font-bold text-xl shrink-0 ${getScoreColor(score)}`}>
                  {score}/100
                </span>
              </div>

              {/* Context */}
              {result.mentioned && result.context ? (
                <div className="bg-background/50 rounded-lg p-4 border border-white/5">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">
                    Extrait de la réponse
                  </p>
                  <p className="text-sm leading-relaxed">
                    {result.context.split(/(\*\*[^*]+\*\*)/).map((part, i) => {
                      if (part.startsWith('**') && part.endsWith('**')) {
                        return (
                          <mark key={i} className="bg-primary/20 text-primary rounded px-0.5 not-italic">
                            {part.slice(2, -2)}
                          </mark>
                        )
                      }
                      return part
                    })}
                  </p>
                </div>
              ) : !result.mentioned ? (
                <div className="bg-background/50 rounded-lg p-4 border border-white/5">
                  <p className="text-sm text-muted-foreground">
                    {scan.brand.name} n&apos;a pas été mentionné dans cette réponse.
                  </p>
                </div>
              ) : null}

              {/* Competitors */}
              {competitors.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">
                    {result.mentioned ? 'Autres marques citées' : 'Marques citées à la place'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {competitors.map((comp, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 text-xs bg-secondary border border-border rounded-full px-2.5 py-0.5"
                      >
                        <span className="text-muted-foreground font-mono">#{i + 1}</span>
                        {comp}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendation when not mentioned */}
              {!result.mentioned && (
                <div className="flex gap-3 bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
                  <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-amber-400 mb-1">Recommandation</p>
                    <p className="text-xs text-muted-foreground">
                      Pour améliorer votre visibilité sur {llmInfo.name}, enrichissez votre
                      présence web avec des mentions dans des articles de blog, des forums et des
                      sites d&apos;avis. Les LLMs s&apos;appuient sur ces sources pour leurs
                      recommandations.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Raw responses */}
      {scan.results.some((r) => r.rawResponse) && (
        <details>
          <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors select-none list-none flex items-center gap-1.5">
            <span>▶</span> Afficher les réponses brutes des LLMs
          </summary>
          <div className="mt-4 space-y-4">
            {scan.results.map((result) => (
              <div key={result.id} className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  {LLM_LABELS[result.llm]?.name ?? result.llm}
                </p>
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed overflow-auto max-h-64">
                  {result.rawResponse}
                </pre>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
