import { describe, it, expect } from 'vitest'
import * as planData from '@/lib/plan-data'
import * as planLimits from '@/lib/plan-limits'

const PLANS = ['FREE', 'STARTER', 'PRO', 'AGENCY'] as const
// Every feature gate consumed across the app. If a key is dropped from the
// shared table, gates silently fall through to `undefined` (falsy) and paid
// features either leak or vanish — so we assert the full shape stays intact.
const REQUIRED_KEYS = [
  'brands', 'credits', 'llms', 'historyDays', 'competitors',
  'pdfExport', 'whiteLabel', 'apiAccess', 'csvExport', 'webhooks',
  'benchmarkSector', 'comparison', 'heatmap', 'citations', 'teamSeats',
] as const

describe('plan limits — single source of truth (no drift)', () => {
  it('plan-limits re-exports the exact same PLAN_LIMITS object as plan-data', () => {
    expect(planLimits.PLAN_LIMITS).toBe(planData.PLAN_LIMITS)
  })

  it('getPlanLimits is the same function from both entry points', () => {
    expect(planLimits.getPlanLimits).toBe(planData.getPlanLimits)
  })

  it('REGRESSION: every plan exposes every gated key (citations/teamSeats included)', () => {
    for (const plan of PLANS) {
      const limits = planLimits.getPlanLimits(plan) as Record<string, unknown>
      for (const key of REQUIRED_KEYS) {
        expect(limits[key], `${plan}.${key} must be defined`).toBeDefined()
      }
    }
  })

  it('unknown plan falls back to FREE limits', () => {
    expect(planLimits.getPlanLimits('NONSENSE')).toBe(planData.PLAN_LIMITS.FREE)
  })
})
