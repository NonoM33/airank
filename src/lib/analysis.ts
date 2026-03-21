// Score calculation — implemented in Phase 2
import type { ScanResultData } from './scanner/index'

/**
 * Calculate global visibility score (0-100) from scan results.
 * Formula: avg(mentionRate × positionScore × sentimentScore) across LLMs
 */
export function calculateGlobalScore(results: ScanResultData[]): number {
  if (results.length === 0) return 0

  const scores = results.map((r) => calculateLLMScore(r))
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
}

export function calculateLLMScore(result: ScanResultData): number {
  if (!result.mentioned) return 0

  // Position score: position 1 = 100, position 5 = 60, position 10+ = 20
  const positionScore = result.position
    ? Math.max(20, 100 - (result.position - 1) * 8)
    : 50

  // Sentiment multiplier
  const sentimentMultiplier =
    result.sentiment === 'POSITIVE' ? 1.0
    : result.sentiment === 'NEUTRAL' ? 0.7
    : result.sentiment === 'NEGATIVE' ? 0.3
    : 0.7

  return Math.round(positionScore * sentimentMultiplier)
}
