'use client'

import { motion } from 'framer-motion'
import { CheckCircle, XCircle, AlertCircle, Lock } from 'lucide-react'
import { useEffect, useState } from 'react'

type LLMResult = {
  llm: string
  mentioned: boolean
  position: number | null
  context: string | null
  sentiment: string | null
  score: number
}

type Props = {
  brand: string
  globalScore: number
  results: LLMResult[]
  lockedLlms?: string[]
  isDemo?: boolean
}

const LLM_META: Record<string, { label: string; color: string; bg: string }> = {
  CHATGPT: { label: 'ChatGPT', color: 'text-[#10A37F]', bg: 'bg-[#10A37F]/10' },
  CLAUDE:  { label: 'Claude',  color: 'text-[#D97706]', bg: 'bg-[#D97706]/10' },
  PERPLEXITY: { label: 'Perplexity', color: 'text-[#6366F1]', bg: 'bg-[#6366F1]/10' },
  GEMINI:  { label: 'Gemini',  color: 'text-[#4285F4]', bg: 'bg-[#4285F4]/10' },
}

function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const [displayed, setDisplayed] = useState(0)
  const radius = size / 2 - 8
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (displayed / 100) * circumference

  useEffect(() => {
    const timer = setTimeout(() => {
      let current = 0
      const interval = setInterval(() => {
        current += 2
        if (current >= score) {
          setDisplayed(score)
          clearInterval(interval)
        } else {
          setDisplayed(current)
        }
      }, 20)
      return () => clearInterval(interval)
    }, 300)
    return () => clearTimeout(timer)
  }, [score])

  const color = score >= 70 ? '#22C55E' : score >= 40 ? '#F59E0B' : '#EF4444'

  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#27272A" strokeWidth="6" />
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none"
        stroke={color} strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        style={{ transition: 'stroke-dashoffset 0.05s linear' }}
      />
      <text
        x={size / 2} y={size / 2 + 1}
        textAnchor="middle" dominantBaseline="middle"
        fill={color} fontSize={size < 80 ? 14 : 18} fontWeight="bold"
        className="rotate-90 font-mono"
        style={{ transform: `rotate(90deg) translate(0, -${size}px)`, transformOrigin: `${size / 2}px ${size / 2}px` }}
      >
        {displayed}
      </text>
    </svg>
  )
}

function LLMCard({ result, locked, delay }: { result: LLMResult; locked: boolean; delay: number }) {
  const meta = LLM_META[result.llm] ?? { label: result.llm, color: 'text-muted-foreground', bg: 'bg-muted' }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="relative rounded-xl border border-border bg-card p-4 flex flex-col gap-3"
    >
      {locked && (
        <div className="absolute inset-0 rounded-xl bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-2 text-center">
            <Lock className="h-5 w-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">Plan payant</span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className={`text-sm font-semibold ${meta.color}`}>{meta.label}</span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${meta.bg} ${meta.color}`}>
          {result.score}/100
        </span>
      </div>

      <div className="flex items-center gap-2">
        {result.mentioned ? (
          <CheckCircle className="h-4 w-4 flex-shrink-0 text-success" />
        ) : (
          <XCircle className="h-4 w-4 flex-shrink-0 text-destructive" />
        )}
        <span className="text-sm font-medium">
          {result.mentioned
            ? result.position
              ? `Mentionné — position #${result.position}`
              : 'Mentionné'
            : 'Non mentionné'}
        </span>
      </div>

      {result.mentioned && result.context && (
        <p className="text-xs text-muted-foreground line-clamp-2 italic">
          &ldquo;{result.context}&rdquo;
        </p>
      )}

      {result.mentioned && result.sentiment && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Sentiment :</span>
          <span className={`text-xs font-medium ${
            result.sentiment === 'POSITIVE' ? 'text-success' :
            result.sentiment === 'NEGATIVE' ? 'text-destructive' : 'text-warning'
          }`}>
            {result.sentiment === 'POSITIVE' ? '😊 Positif' :
             result.sentiment === 'NEGATIVE' ? '😟 Négatif' : '😐 Neutre'}
          </span>
        </div>
      )}
    </motion.div>
  )
}

export function ScanResultCards({ brand, globalScore, results, lockedLlms = [], isDemo = false }: Props) {
  const allLlms = ['CHATGPT', 'CLAUDE', 'PERPLEXITY', 'GEMINI']
  const scoreLabel =
    globalScore >= 70 ? 'Très visible' :
    globalScore >= 40 ? 'Partiellement visible' : 'Peu visible'
  const scoreColor =
    globalScore >= 70 ? 'text-success' :
    globalScore >= 40 ? 'text-warning' : 'text-destructive'
  const ScoreIcon = globalScore >= 70 ? CheckCircle : globalScore >= 40 ? AlertCircle : XCircle

  return (
    <div className="w-full">
      {/* Global score */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="mb-6 rounded-2xl border border-border bg-card p-6 flex flex-col sm:flex-row items-center gap-6"
      >
        <ScoreRing score={globalScore} size={96} />
        <div className="text-center sm:text-left">
          <div className="text-sm text-muted-foreground mb-1">Score de visibilité IA pour</div>
          <div className="text-2xl font-bold mb-1">{brand}</div>
          <div className={`flex items-center gap-2 justify-center sm:justify-start ${scoreColor}`}>
            <ScoreIcon className="h-5 w-5" />
            <span className="font-semibold">{scoreLabel}</span>
          </div>
          {isDemo && (
            <p className="mt-2 text-xs text-muted-foreground">
              Résultats partiels — 2 LLMs analysés. Créez un compte pour voir les 4 LLMs.
            </p>
          )}
        </div>
      </motion.div>

      {/* LLM cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {allLlms.map((llm, i) => {
          const result = results.find((r) => r.llm === llm)
          const locked = lockedLlms.includes(llm)

          if (!result && !locked) return null

          const displayResult: LLMResult = result ?? {
            llm,
            mentioned: false,
            position: null,
            context: null,
            sentiment: null,
            score: 0,
          }

          return (
            <LLMCard
              key={llm}
              result={displayResult}
              locked={locked}
              delay={0.1 + i * 0.1}
            />
          )
        })}
      </div>
    </div>
  )
}

// Static demo cards shown before user scans
export function DemoResultCards() {
  const demoData: Props = {
    brand: 'Votre Marque',
    globalScore: 42,
    results: [
      { llm: 'CHATGPT', mentioned: true, position: 2, context: 'Votre marque est une excellente option pour les entreprises cherchant...', sentiment: 'POSITIVE', score: 76 },
      { llm: 'GEMINI', mentioned: true, position: 4, context: 'Parmi les solutions disponibles, on trouve également Votre Marque...', sentiment: 'NEUTRAL', score: 52 },
    ],
    lockedLlms: ['CLAUDE', 'PERPLEXITY'],
    isDemo: true,
  }
  return <ScanResultCards {...demoData} />
}
