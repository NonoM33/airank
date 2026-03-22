export const PLAN_LIMITS = {
  FREE: {
    brands: 0,
    scansPerDay: 0,
    llms: 2,
    historyDays: 1,
    competitors: 0,
    pdfExport: false,
    whiteLabel: false,
    apiAccess: false,
  },
  STARTER: {
    brands: 1,
    scansPerDay: 10,
    llms: 3,
    historyDays: 30,
    competitors: 0,
    pdfExport: false,
    whiteLabel: false,
    apiAccess: false,
  },
  PRO: {
    brands: 3,
    scansPerDay: 50,
    llms: 4,
    historyDays: 90,
    competitors: 5,
    pdfExport: true,
    whiteLabel: false,
    apiAccess: false,
  },
  AGENCY: {
    brands: 10,
    scansPerDay: 200,
    llms: 4,
    historyDays: 3650,
    competitors: 20,
    pdfExport: true,
    whiteLabel: true,
    apiAccess: true,
  },
} as const

export type PlanKey = keyof typeof PLAN_LIMITS

export function getPlanLimits(plan: string) {
  return PLAN_LIMITS[(plan as PlanKey) in PLAN_LIMITS ? (plan as PlanKey) : 'FREE']
}

export async function checkBrandLimit(userId: string, plan: string): Promise<boolean> {
  const limits = getPlanLimits(plan)
  if (limits.brands === 0) return false
  const { prisma } = await import('./db')
  const count = await prisma.brand.count({ where: { userId } })
  return count < limits.brands
}

export async function checkScanLimit(userId: string, plan: string): Promise<boolean> {
  const limits = getPlanLimits(plan)
  if (limits.scansPerDay === 0) return false
  const { prisma } = await import('./db')
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const count = await prisma.scan.count({
    where: { brand: { userId }, createdAt: { gte: startOfDay } },
  })
  return count < limits.scansPerDay
}
