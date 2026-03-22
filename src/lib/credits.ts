import { prisma } from './db'

export const CREDIT_COSTS = {
  scan: 1,
  competitor_analysis: 2,
  content_article: 3,
  content_faq: 2,
  content_press: 2,
  auto_scan: 1,
} as const

export const PLAN_CREDITS = {
  FREE: 2,
  STARTER: 50,
  PRO: 200,
  AGENCY: 1000,
} as const

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
