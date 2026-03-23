'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Copy, Check, Clock, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export interface RecommendationStep {
  text: string
  code?: string
  language?: string
}

export interface ActionableRecommendationData {
  title: string
  priority?: 'haute' | 'moyenne' | 'faible'
  difficulty?: 'facile' | 'moyen' | 'avancé'
  time?: string
  impact?: string
  steps: RecommendationStep[]
}

// Accept either old string format or new structured format
export type RecommendationInput = string | ActionableRecommendationData

interface Props {
  recommendation: RecommendationInput
  index: number
}

const PRIORITY_BADGE: Record<string, string> = {
  haute: 'bg-red-500/10 text-red-400 border-red-500/20',
  moyenne: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  faible: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
}

const DIFFICULTY_BADGE: Record<string, string> = {
  facile: 'bg-green-500/10 text-green-400 border-green-500/20',
  moyen: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  avancé: 'bg-red-500/10 text-red-400 border-red-500/20',
}

function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative mt-2 rounded-lg overflow-hidden border border-border">
      <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900/80 border-b border-border">
        <span className="text-xs text-muted-foreground font-mono">{language || 'code'}</span>
        <Button variant="ghost" size="sm" onClick={copy} className="h-6 gap-1 text-xs px-2">
          {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Copié !' : 'Copier'}
        </Button>
      </div>
      <pre className="p-3 text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap bg-zinc-950/60 font-mono leading-relaxed">{code}</pre>
    </div>
  )
}

export function ActionableRecommendation({ recommendation, index }: Props) {
  const [open, setOpen] = useState(false)

  // Backward compat: plain string → render legacy style
  if (typeof recommendation === 'string') {
    return (
      <li className="text-sm text-muted-foreground flex items-start gap-1.5">
        <span className="text-primary font-bold shrink-0">{index + 1}.</span> {recommendation}
      </li>
    )
  }

  const rec = recommendation

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-secondary/40 transition-colors"
      >
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
          {index + 1}
        </span>
        <span className="flex-1 text-sm font-medium">{rec.title}</span>
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
          {rec.priority && (
            <Badge className={`text-[10px] px-1.5 py-0 ${PRIORITY_BADGE[rec.priority] ?? PRIORITY_BADGE.moyenne}`}>
              {rec.priority}
            </Badge>
          )}
          {rec.difficulty && (
            <Badge className={`text-[10px] px-1.5 py-0 ${DIFFICULTY_BADGE[rec.difficulty] ?? DIFFICULTY_BADGE.moyen}`}>
              {rec.difficulty}
            </Badge>
          )}
          {rec.time && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" /> {rec.time}
            </span>
          )}
          {open ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
      </button>

      {open && (
        <div className="px-3 pb-3 border-t border-border bg-secondary/20">
          <div className="space-y-3 pt-3">
            {rec.steps.map((step, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground">{step.text}</p>
                  {step.code && <CodeBlock code={step.code} language={step.language} />}
                </div>
              </div>
            ))}
          </div>
          {rec.impact && (
            <div className="flex items-center gap-1.5 pt-2 mt-2 border-t border-border">
              <Zap className="h-3 w-3 text-primary shrink-0" />
              <span className="text-xs text-muted-foreground">
                Impact estimé : <strong className="text-primary">{rec.impact}</strong>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
