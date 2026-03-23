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
  },
} as const

export type PlanKey = keyof typeof PLAN_LIMITS

export function getPlanLimits(plan: string) {
  return PLAN_LIMITS[(plan as PlanKey) in PLAN_LIMITS ? (plan as PlanKey) : 'FREE']
}

export async function checkBrandLimit(userId: string, plan: string): Promise<boolean> {
  const limits = getPlanLimits(plan)
  const { prisma } = await import('./db')
  const count = await prisma.brand.count({ where: { userId } })
  return count < limits.brands
}
