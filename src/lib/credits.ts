import { prisma } from './db'
import { PLAN_CREDITS as PLAN_CREDITS_CLIENT } from './plan-data'

export const CREDIT_COSTS = {
  scan: 10,
  competitor_analysis: 20,
  content_article: 30,
  content_faq: 20,
  content_press: 20,
  auto_scan: 10,
  sector_watch: 2,
} as const

// Single source of truth for per-plan credit allotments (re-exported from plan-data.ts)
export const PLAN_CREDITS = PLAN_CREDITS_CLIENT

export async function useCredits(
  userId: string,
  amount: number,
  action: string,
  details?: string
): Promise<boolean> {
  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { credits: true },
      })
      if (!user || user.credits < amount) {
        throw new Error('INSUFFICIENT_CREDITS')
      }
      await tx.user.update({
        where: { id: userId },
        data: { credits: { decrement: amount } },
      })
      await tx.creditUsage.create({
        data: { userId, amount: -amount, action, details },
      })
    })
    return true
  } catch {
    return false
  }
}

export async function getCredits(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  })
  return user?.credits ?? 0
}
