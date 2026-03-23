'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight, Lock, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export type ScanSummary = {
  id: string
  query: string
  globalScore: number
  createdAt: string
}

type ScanResult = {
  llm: string
  mentioned: boolean
  score: number
  sentiment?: string | null
}

type ScanDetail = {
  id: string
  query: string
  globalScore: number
  createdAt: string
  results: ScanResult[]
}

type LLMDiff = {
  llm: string
  scoreA: number | null
  scoreB: number | null
  delta: number | null
  mentionedA: boolean
  mentionedB: boolean
}

interface ScanComparisonProps {
  brandId: string
  scans: ScanSummary[]
  plan: string
}

const LLMS = ['CHATGPT', 'CLAUDE', 'PERPLEXITY', 'GEMINI'] as const

const LLM_LABELS: Record<string, string> = {
  CHATGPT: 'ChatGPT',
  CLAUDE: 'Claude',
  PERPLEXITY: 'Perplexity',
  GEMINI: 'Gemini',
}

const PRO_PLANS = ['PRO', 'AGENCY']

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) return <span className="text-xs text-muted-foreground">—</span>
  if (delta > 0)
    return (
      <span className="flex items-center gap-0.5 text-emerald-400 text-xs font-bold">
        <TrendingUp className="h-3 w-3" />+{delta}
      </span>
    )
  if (delta < 0)
    return (
      <span className="flex items-center gap-0.5 text-red-400 text-xs font-bold">
        <TrendingDown className="h-3 w-3" />{delta}
      </span>
    )
  return (
    <span className="flex items-center gap-0.5 text-muted-foreground text-xs">
      <Minus className="h-3 w-3" />0
    </span>
  )
}

function ScoreBlock({ scan }: { scan: ScanDetail | null }) {
  if (!scan) return <div className="flex-1 text-center text-muted-foreground text-sm py-8">Sélectionnez un scan</div>

  return (
    <div className="flex-1 space-y-3">
      <div className="text-center">
        <div className="text-4xl font-bold text-foreground font-mono">{scan.globalScore}</div>
        <div className="text-xs text-muted-foreground mt-1">/100</div>
        <div className="text-xs text-muted-foreground mt-1">{formatDate(scan.createdAt)}</div>
        <p className="text-xs text-foreground/70 mt-2 truncate max-w-[200px] mx-auto" title={scan.query}>
          {scan.query}
        </p>
      </div>
      <div className="space-y-1.5 mt-4">
        {LLMS.map((llm) => {
          const result = scan.results.find((r) => r.llm === llm)
          return (
            <div key={llm} className="flex items-center justify-between px-2 py-1.5 rounded-md bg-secondary/50">
              <span className="text-xs text-muted-foreground">{LLM_LABELS[llm]}</span>
              <div className="flex items-center gap-2">
                {result ? (
                  <>
                    <span
                      className={`text-xs font-mono font-bold ${
                        result.mentioned ? 'text-emerald-400' : 'text-zinc-500'
                      }`}
                    >
                      {result.mentioned ? result.score : '—'}
                    </span>
                    {result.mentioned && (
                      <span className="text-[10px] text-muted-foreground">
                        {result.sentiment?.toLowerCase()}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-zinc-600">N/A</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function ScanComparison({ brandId: _brandId, scans, plan }: ScanComparisonProps) {
  const [scanAId, setScanAId] = useState<string>('')
  const [scanBId, setScanBId] = useState<string>('')
  const [scanA, setScanA] = useState<ScanDetail | null>(null)
  const [scanB, setScanB] = useState<ScanDetail | null>(null)
  const [loadingA, setLoadingA] = useState(false)
  const [loadingB, setLoadingB] = useState(false)
  const [diffs, setDiffs] = useState<LLMDiff[]>([])

  const isPro = PRO_PLANS.includes(plan)

  async function fetchScan(id: string): Promise<ScanDetail | null> {
    const res = await fetch(`/api/scan/${id}`)
    if (!res.ok) return null
    const data = await res.json()
    return data as ScanDetail
  }

  useEffect(() => {
    if (!scanAId) { setScanA(null); return }
    setLoadingA(true)
    fetchScan(scanAId).then((s) => { setScanA(s); setLoadingA(false) })
  }, [scanAId])

  useEffect(() => {
    if (!scanBId) { setScanB(null); return }
    setLoadingB(true)
    fetchScan(scanBId).then((s) => { setScanB(s); setLoadingB(false) })
  }, [scanBId])

  // Compute diffs when both scans are loaded
  useEffect(() => {
    if (!scanA && !scanB) { setDiffs([]); return }
    const computed: LLMDiff[] = LLMS.map((llm) => {
      const rA = scanA?.results.find((r) => r.llm === llm) ?? null
      const rB = scanB?.results.find((r) => r.llm === llm) ?? null
      const scoreA = rA?.mentioned ? rA.score : null
      const scoreB = rB?.mentioned ? rB.score : null
      const delta = scoreA !== null && scoreB !== null ? scoreB - scoreA : null
      return {
        llm,
        scoreA: rA?.score ?? null,
        scoreB: rB?.score ?? null,
        delta,
        mentionedA: rA?.mentioned ?? false,
        mentionedB: rB?.mentioned ?? false,
      }
    })
    setDiffs(computed)
  }, [scanA, scanB])

  const betterScan: 'A' | 'B' | null =
    scanA && scanB
      ? scanA.globalScore > scanB.globalScore
        ? 'A'
        : scanB.globalScore > scanA.globalScore
        ? 'B'
        : null
      : null

  return (
    <div className="relative">
      {/* Pro gating overlay */}
      {!isPro && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-xl bg-background/80 backdrop-blur-sm border border-border">
          <Lock className="h-8 w-8 text-primary mb-3" />
          <p className="text-base font-semibold mb-1">Fonctionnalité Pro</p>
          <p className="text-sm text-muted-foreground mb-4 text-center max-w-xs">
            La comparaison de scans est disponible dès le plan PRO.
          </p>
          <Link href="/billing">
            <Button size="sm">Passer au plan PRO</Button>
          </Link>
        </div>
      )}

      <div className={!isPro ? 'pointer-events-none select-none blur-sm' : ''}>
        {/* Selectors */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Scan A</label>
            <div className="flex items-center gap-2">
              <select
                className="flex-1 bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={scanAId}
                onChange={(e) => setScanAId(e.target.value)}
              >
                <option value="">— Choisir un scan —</option>
                {scans.map((s) => (
                  <option key={s.id} value={s.id} disabled={s.id === scanBId}>
                    {formatDate(s.createdAt)} — Score {s.globalScore} — {s.query.slice(0, 40)}
                    {s.query.length > 40 ? '…' : ''}
                  </option>
                ))}
              </select>
              {betterScan === 'A' && (
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs shrink-0">
                  Meilleur
                </Badge>
              )}
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Scan B</label>
            <div className="flex items-center gap-2">
              <select
                className="flex-1 bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={scanBId}
                onChange={(e) => setScanBId(e.target.value)}
              >
                <option value="">— Choisir un scan —</option>
                {scans.map((s) => (
                  <option key={s.id} value={s.id} disabled={s.id === scanAId}>
                    {formatDate(s.createdAt)} — Score {s.globalScore} — {s.query.slice(0, 40)}
                    {s.query.length > 40 ? '…' : ''}
                  </option>
                ))}
              </select>
              {betterScan === 'B' && (
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs shrink-0">
                  Meilleur
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Comparison layout */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-4">
          {/* Scan A */}
          <div className="bg-card border border-border rounded-xl p-4">
            {loadingA ? (
              <div className="text-center text-muted-foreground text-sm py-8">Chargement…</div>
            ) : (
              <ScoreBlock scan={scanA} />
            )}
          </div>

          {/* Center diffs */}
          <div className="flex flex-col items-center justify-center gap-2 min-w-[80px]">
            <ArrowRight className="h-4 w-4 text-muted-foreground rotate-0" />
            {diffs.length > 0 && (
              <div className="space-y-1.5 mt-1">
                {diffs.map((d) => (
                  <div key={d.llm} className="flex flex-col items-center">
                    <span className="text-[10px] text-muted-foreground">{LLM_LABELS[d.llm]}</span>
                    <DeltaBadge delta={d.delta} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Scan B */}
          <div className="bg-card border border-border rounded-xl p-4">
            {loadingB ? (
              <div className="text-center text-muted-foreground text-sm py-8">Chargement…</div>
            ) : (
              <ScoreBlock scan={scanB} />
            )}
          </div>
        </div>

        {/* Global score diff */}
        {scanA && scanB && (
          <div className="mt-4 p-4 bg-secondary/30 rounded-xl border border-border text-center">
            <p className="text-xs text-muted-foreground">
              Différence de score global :&nbsp;
              <span
                className={`font-bold ${
                  scanB.globalScore - scanA.globalScore > 0
                    ? 'text-emerald-400'
                    : scanB.globalScore - scanA.globalScore < 0
                    ? 'text-red-400'
                    : 'text-muted-foreground'
                }`}
              >
                {scanB.globalScore - scanA.globalScore > 0 ? '+' : ''}
                {scanB.globalScore - scanA.globalScore}
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
