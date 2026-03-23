import { prisma } from './db'

export const CREDIT_COSTS = {
  scan: 10,
  competitor_analysis: 20,
  content_article: 30,
  content_faq: 20,
  content_press: 20,
  auto_scan: 10,
} as const

export const PLAN_CREDITS = {
  FREE: 20,
  STARTER: 500,
  PRO: 2000,
  AGENCY: 10000,
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
