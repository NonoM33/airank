'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'

export type HeatmapScan = {
  id: string
  query: string
  results: { llm: string; mentioned: boolean; score: number }[]
}

interface ScansHeatmapProps {
  brandId: string
  scans: HeatmapScan[]
  plan: string
}

const LLMS = ['CHATGPT', 'CLAUDE', 'PERPLEXITY', 'GEMINI'] as const

const LLM_LABELS: Record<string, string> = {
  CHATGPT: 'ChatGPT',
  CLAUDE: 'Claude',
  PERPLEXITY: 'Perplexity',
  GEMINI: 'Gemini',
}

function getCellColor(mentioned: boolean, score: number): string {
  if (!mentioned || score === 0) return '#27272a' // zinc-800
  if (score <= 33) return `rgba(239, 68, 68, ${0.4 + (score / 33) * 0.6})` // red
  if (score <= 66) return `rgba(245, 158, 11, ${0.4 + ((score - 34) / 32) * 0.6})` // amber
  return `rgba(16, 185, 129, ${0.4 + ((score - 67) / 33) * 0.6})` // emerald
}

function getCellTextColor(mentioned: boolean, score: number): string {
  if (!mentioned || score === 0) return '#71717a' // zinc-500
  return '#ffffff'
}

interface TooltipState {
  query: string
  llm: string
  score: number
  mentioned: boolean
  x: number
  y: number
}

const PRO_PLANS = ['PRO', 'AGENCY']

export function ScansHeatmap({ brandId: _brandId, scans, plan }: ScansHeatmapProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  const isPro = PRO_PLANS.includes(plan)

  return (
    <div className="relative">
      {/* Pro gating overlay */}
      {!isPro && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-xl bg-background/80 backdrop-blur-sm border border-border">
          <Lock className="h-8 w-8 text-primary mb-3" />
          <p className="text-base font-semibold mb-1">Fonctionnalité Pro</p>
          <p className="text-sm text-muted-foreground mb-4 text-center max-w-xs">
            La heatmap requêtes×LLMs est disponible dès le plan PRO.
          </p>
          <Link href="/billing">
            <Button size="sm">Passer au plan PRO</Button>
          </Link>
        </div>
      )}

      <div className={!isPro ? 'pointer-events-none select-none blur-sm' : ''}>
        {scans.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
            Aucun scan disponible pour la heatmap.
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Tooltip */}
            {tooltip && (
              <div
                className="fixed z-50 px-3 py-2 rounded-lg bg-card border border-border shadow-xl text-xs pointer-events-none"
                style={{ left: tooltip.x + 12, top: tooltip.y - 40 }}
              >
                <p className="font-medium text-foreground truncate max-w-[200px]">{tooltip.query}</p>
                <p className="text-muted-foreground">
                  {LLM_LABELS[tooltip.llm]} — Score&nbsp;:&nbsp;
                  <span className="font-bold text-foreground">{tooltip.mentioned ? tooltip.score : 'Non mentionné'}</span>
                </p>
              </div>
            )}

            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="text-left px-3 py-2 text-muted-foreground font-medium text-xs min-w-[200px]">
                    Requête
                  </th>
                  {LLMS.map((llm) => (
                    <th
                      key={llm}
                      className="px-3 py-2 text-center text-muted-foreground font-medium text-xs w-24"
                    >
                      {LLM_LABELS[llm]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scans.map((scan) => (
                  <tr key={scan.id} className="border-t border-border/40">
                    <td className="px-3 py-2 text-xs text-foreground/80 max-w-[220px]">
                      <span className="truncate block" title={scan.query}>
                        {scan.query}
                      </span>
                    </td>
                    {LLMS.map((llm) => {
                      const result = scan.results.find((r) => r.llm === llm)
                      const mentioned = result?.mentioned ?? false
                      const score = result?.score ?? 0
                      const bg = getCellColor(mentioned, score)
                      const textColor = getCellTextColor(mentioned, score)

                      return (
                        <td key={llm} className="px-2 py-1.5 text-center">
                          <div className="flex items-center justify-center">
                            <div
                              className="w-14 h-10 rounded-md flex items-center justify-center text-xs font-mono font-bold cursor-default transition-transform hover:scale-110"
                              style={{ backgroundColor: bg, color: textColor }}
                              onMouseMove={(e) =>
                                setTooltip({
                                  query: scan.query,
                                  llm,
                                  score,
                                  mentioned,
                                  x: e.clientX,
                                  y: e.clientY,
                                })
                              }
                              onMouseLeave={() => setTooltip(null)}
                            >
                              {result ? (mentioned ? score : '—') : '?'}
                            </div>
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 px-3 pt-3 border-t border-border/40">
              <span className="text-xs text-muted-foreground">Légende :</span>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#27272a' }} />
                <span className="text-xs text-muted-foreground">Non mentionné</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(239,68,68,0.8)' }} />
                <span className="text-xs text-muted-foreground">Faible (1–33)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(245,158,11,0.8)' }} />
                <span className="text-xs text-muted-foreground">Moyen (34–66)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(16,185,129,0.8)' }} />
                <span className="text-xs text-muted-foreground">Élevé (67–100)</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
