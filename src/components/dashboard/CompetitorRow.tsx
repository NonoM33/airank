'use client'

import { useState } from 'react'
import { Lock, Loader2, Sparkles, X, Plus, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface AnalysisResult {
  strengths: string[]
  weaknesses: string[]
  contentGaps: string[]
  actionPlan: string[]
  estimatedTimeToOutrank: string
}

interface Competitor {
  name: string
  llmCount: number
  llms: string[]
  scanCount: number
  totalMentions: number
}

interface Props {
  competitor: Competitor
  brandName: string
  brandId: string
  canAnalyze: boolean
  rank: number
  isTracked?: boolean
}

const LLM_SHORT: Record<string, string> = {
  CHATGPT: 'GPT',
  CLAUDE: 'CLD',
  PERPLEXITY: 'PPX',
  GEMINI: 'GEM',
}

export function CompetitorRow({ competitor, brandName, brandId, canAnalyze, rank, isTracked: initialTracked = false }: Props) {
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState('')
  const [tracked, setTracked] = useState(initialTracked)
  const [trackLoading, setTrackLoading] = useState(false)
  const router = useRouter()

  async function handleTrack() {
    setTrackLoading(true)
    try {
      const res = await fetch('/api/brands/track-competitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: competitor.name, parentBrandId: brandId, keywords: [] }),
      })
      const data = await res.json()
      if (res.ok || res.status === 200) {
        setTracked(true)
        router.refresh()
        if (data.brand?.id && !data.alreadyTracked) {
          router.push(`/brands/${data.brand.id}`)
        }
      }
    } catch { /* ignore */ }
    setTrackLoading(false)
  }

  async function handleAnalyze() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/competitor-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competitorName: competitor.name, brandName }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Erreur lors de l'analyse.")
      } else {
        setAnalysis(data)
      }
    } catch {
      setError('Une erreur est survenue.')
    }
    setLoading(false)
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-start gap-3">
        <span className="text-muted-foreground font-mono text-xs w-5 pt-0.5 shrink-0">#{rank}</span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-semibold">{competitor.name}</span>
            <div className="flex gap-1">
              {competitor.llms.map((llm) => (
                <span
                  key={llm}
                  className="text-[10px] bg-secondary border border-border rounded px-1.5 py-0.5 text-muted-foreground font-mono"
                >
                  {LLM_SHORT[llm] ?? llm}
                </span>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            <span className="text-foreground font-medium">{competitor.llmCount}</span> LLM{competitor.llmCount > 1 ? 's' : ''}
            {' · '}
            <span className="text-foreground font-medium">{competitor.totalMentions}</span> mention{competitor.totalMentions > 1 ? 's' : ''}
            {' · '}
            <span className="text-foreground font-medium">{competitor.scanCount}</span> scan{competitor.scanCount > 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Track button */}
          <Button
            size="sm"
            variant={tracked ? 'secondary' : 'outline'}
            onClick={handleTrack}
            disabled={trackLoading || tracked}
            className="h-8 gap-1.5 text-xs"
          >
            {trackLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : tracked ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
            {tracked ? 'Suivi' : 'Suivre'}
          </Button>

          {!canAnalyze ? (
          <Link href="/billing">
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" />
              Pro
            </Button>
          </Link>
        ) : analysis ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setAnalysis(null)}
            className="h-8 text-xs text-muted-foreground shrink-0"
          >
            <X className="h-3 w-3" />
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={handleAnalyze}
            disabled={loading}
            className="h-8 gap-1.5 text-xs shrink-0"
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            {loading ? 'Analyse...' : 'Analyser'}
          </Button>
        )}
        </div>
      </div>

      {error && <p className="text-xs text-destructive pl-8">{error}</p>}

      {analysis && (
        <div className="ml-8 rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-red-400 uppercase tracking-wide mb-2">
                Pourquoi {competitor.name} domine
              </p>
              <ul className="space-y-1.5">
                {analysis.strengths?.map((s, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <span className="text-red-400 shrink-0 mt-0.5">→</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide mb-2">
                Faiblesses exploitables
              </p>
              <ul className="space-y-1.5">
                {analysis.weaknesses?.map((w, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <span className="text-amber-400 shrink-0 mt-0.5">→</span>
                    {w}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-blue-400 uppercase tracking-wide mb-2">
                Contenus à créer
              </p>
              <ul className="space-y-1.5">
                {analysis.contentGaps?.map((c, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <span className="text-blue-400 shrink-0 mt-0.5">→</span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-green-400 uppercase tracking-wide mb-2">
                Plan d&apos;action prioritaire
              </p>
              <ol className="space-y-1.5">
                {analysis.actionPlan?.map((a, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <span className="text-green-400 shrink-0 font-mono mt-0.5">{i + 1}.</span>
                    {a}
                  </li>
                ))}
              </ol>
            </div>
          </div>
          <div className="pt-3 border-t border-border/50 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              <span className="text-foreground font-medium">Délai estimé :</span>{' '}
              {analysis.estimatedTimeToOutrank}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
