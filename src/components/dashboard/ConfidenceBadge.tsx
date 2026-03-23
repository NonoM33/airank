'use client'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConfidenceBadgeProps {
  llmCount: number
  totalLlms?: number
}

// ─── Config ───────────────────────────────────────────────────────────────────

function getConfig(llmCount: number, total: number) {
  if (llmCount >= total) {
    return {
      label: 'Confiance élevée',
      classes: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
      dot: 'bg-emerald-400',
    }
  }
  if (llmCount >= 2) {
    return {
      label: 'Confiance moyenne',
      classes: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
      dot: 'bg-orange-400',
    }
  }
  return {
    label: 'Faible confiance',
    classes: 'bg-red-500/20 text-red-400 border border-red-500/30',
    dot: 'bg-red-400',
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ConfidenceBadge({ llmCount, totalLlms = 4 }: ConfidenceBadgeProps) {
  const { label, classes, dot } = getConfig(llmCount, totalLlms)

  return (
    <span
      data-testid="confidence-badge"
      className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1 ${classes}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} aria-hidden="true" />
      {llmCount}/{totalLlms} LLMs · {label}
    </span>
  )
}
