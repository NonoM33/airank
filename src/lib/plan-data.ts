// Client-safe plan data — no DB imports
export const PLAN_LIMITS = {
  FREE: {
    brands: 1,
    credits: 20,
    llms: 2,
    historyDays: 1,
    competitors: 0,
    pdfExport: false,
    whiteLabel: false,
    apiAccess: false,
    csvExport: false,
    webhooks: false,
    benchmarkSector: false,
    comparison: false,
    heatmap: false,
    citations: false,
    teamSeats: 1,
  },
  STARTER: {
    brands: 3,
    credits: 500,
    llms: 3,
    historyDays: 30,
    competitors: 0,
    pdfExport: false,
    whiteLabel: false,
    apiAccess: false,
    csvExport: false,
    webhooks: false,
    benchmarkSector: true,
    comparison: false,
    heatmap: false,
    citations: true,
    teamSeats: 2,
  },
  PRO: {
    brands: 10,
    credits: 2000,
    llms: 4,
    historyDays: 90,
    competitors: 5,
    pdfExport: true,
    whiteLabel: false,
    apiAccess: false,
    csvExport: true,
    webhooks: false,
    benchmarkSector: true,
    comparison: true,
    heatmap: true,
    citations: true,
    teamSeats: 5,
  },
  AGENCY: {
    brands: 50,
    credits: 10000,
    llms: 4,
    historyDays: 3650,
    competitors: 20,
    pdfExport: true,
    whiteLabel: true,
    apiAccess: true,
    csvExport: true,
    webhooks: true,
    benchmarkSector: true,
    comparison: true,
    heatmap: true,
    citations: true,
    teamSeats: 20,
  },
} as const

export type PlanKey = keyof typeof PLAN_LIMITS

export function getPlanLimits(plan: string) {
  return PLAN_LIMITS[(plan as PlanKey) in PLAN_LIMITS ? (plan as PlanKey) : 'FREE']
}

export function isOnTrial(trialEndsAt: Date | string | null | undefined): boolean {
  if (!trialEndsAt) return false
  const end = typeof trialEndsAt === 'string' ? new Date(trialEndsAt) : trialEndsAt
  return end.getTime() > Date.now()
}

export function trialDaysLeft(trialEndsAt: Date | string | null | undefined): number {
  if (!trialEndsAt) return 0
  const end = typeof trialEndsAt === 'string' ? new Date(trialEndsAt) : trialEndsAt
  const ms = end.getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}
