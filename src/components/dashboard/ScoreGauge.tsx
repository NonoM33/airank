'use client'

import { motion } from 'framer-motion'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScoreGaugeProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

// ─── Score label helpers ───────────────────────────────────────────────────────

export function getScoreCategory(score: number): {
  label: string
  color: string
  textColor: string
  strokeColor: string
} {
  if (score >= 75)
    return {
      label: 'Référent',
      color: 'text-emerald-400',
      textColor: 'text-emerald-400',
      strokeColor: '#10B981',
    }
  if (score >= 50)
    return {
      label: 'Visible',
      color: 'text-amber-400',
      textColor: 'text-amber-400',
      strokeColor: '#F59E0B',
    }
  if (score >= 25)
    return {
      label: 'Émergent',
      color: 'text-orange-400',
      textColor: 'text-orange-400',
      strokeColor: '#F97316',
    }
  return {
    label: 'Fantôme',
    color: 'text-zinc-400',
    textColor: 'text-red-400',
    strokeColor: '#EF4444',
  }
}

// ─── Size config ───────────────────────────────────────────────────────────────

const SIZE_CONFIG = {
  sm: { wrapperSize: 'w-24 h-24', svgSize: 96, r: 38, strokeWidth: 7, scoreText: 'text-2xl', labelText: 'text-xs' },
  md: { wrapperSize: 'w-32 h-32', svgSize: 128, r: 52, strokeWidth: 8, scoreText: 'text-3xl', labelText: 'text-xs' },
  lg: { wrapperSize: 'w-40 h-40', svgSize: 160, r: 64, strokeWidth: 10, scoreText: 'text-4xl', labelText: 'text-sm' },
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ScoreGauge({ score, size = 'lg', showLabel = true }: ScoreGaugeProps) {
  const cfg = SIZE_CONFIG[size]
  const center = cfg.svgSize / 2
  const circumference = 2 * Math.PI * cfg.r
  const clampedScore = Math.max(0, Math.min(100, score))
  const dashOffset = circumference * (1 - clampedScore / 100)
  const category = getScoreCategory(clampedScore)

  return (
    <div className="flex flex-col items-center gap-2 shrink-0">
      <div className={`relative ${cfg.wrapperSize}`}>
        <svg
          className={cfg.wrapperSize}
          viewBox={`0 0 ${cfg.svgSize} ${cfg.svgSize}`}
          style={{ transform: 'rotate(-90deg)' }}
          aria-label={`Score: ${clampedScore} sur 100`}
        >
          {/* Track */}
          <circle
            cx={center}
            cy={center}
            r={cfg.r}
            fill="none"
            stroke="#27272A"
            strokeWidth={cfg.strokeWidth}
          />
          {/* Animated fill arc */}
          <motion.circle
            data-testid="gauge-arc"
            cx={center}
            cy={center}
            r={cfg.r}
            fill="none"
            stroke={category.strokeColor}
            strokeWidth={cfg.strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-bold font-mono ${cfg.scoreText} ${category.textColor}`}>
            {clampedScore}
          </span>
          <span className="text-xs text-muted-foreground">/ 100</span>
        </div>
      </div>

      {showLabel && (
        <span className={`font-semibold ${cfg.labelText} ${category.color}`} data-testid="score-label">
          {category.label}
        </span>
      )}
    </div>
  )
}
