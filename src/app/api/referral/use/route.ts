export const dynamic = 'force-dynamic'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const useReferralSchema = z.object({
  code: z.string().min(1),
})

const REFERRAL_CREDITS = 500 // 1 month free (equivalent to STARTER plan)

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const userId = session.user.id
  const body = await req.json()
  const parsed = useReferralSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { code } = parsed.data

  // Prevent using own referral code
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralCode: true },
  })
  if (currentUser?.referralCode === code) {
    return NextResponse.json(
      { error: 'Vous ne pouvez pas utiliser votre propre code de parrainage' },
      { status: 400 }
    )
  }

  // Check if this user already used a referral code
  const existingReceived = await prisma.referral.findFirst({
    where: { referredUserId: userId },
  })
  if (existingReceived) {
    return NextResponse.json(
      { error: 'Vous avez déjà utilisé un code de parrainage' },
      { status: 400 }
    )
  }

  // Find the referral by code
  const referral = await prisma.referral.findUnique({
    where: { code },
    include: { referrer: { select: { id: true } } },
  })
  if (!referral) {
    return NextResponse.json({ error: 'Code de parrainage invalide' }, { status: 400 })
  }
  if (referral.referredUserId) {
    return NextResponse.json(
      { error: 'Ce code de parrainage a déjà été utilisé' },
      { status: 400 }
    )
  }

  // Link the current user as referredUser and grant credits to both parties
  await prisma.$transaction([
    prisma.referral.update({
      where: { id: referral.id },
      data: {
        referredUserId: userId,
        usedAt: new Date(),
        rewardGranted: true,
      },
    }),
    // Grant credits to referred user (new user)
    prisma.user.update({
      where: { id: userId },
      data: { credits: { increment: REFERRAL_CREDITS } },
    }),
    // Grant credits to referrer
    prisma.user.update({
      where: { id: referral.referrerId },
      data: { credits: { increment: REFERRAL_CREDITS } },
    }),
    // Log credit usages
    prisma.creditUsage.create({
      data: {
        userId,
        amount: REFERRAL_CREDITS,
        action: 'referral_bonus',
        details: `Parrainage accepté - code ${code}`,
      },
    }),
    prisma.creditUsage.create({
      data: {
        userId: referral.referrerId,
        amount: REFERRAL_CREDITS,
        action: 'referral_bonus',
        details: `Parrainage accepté par nouvel utilisateur`,
      },
    }),
  ])

  return NextResponse.json({
    success: true,
    creditsGranted: REFERRAL_CREDITS,
    message: `${REFERRAL_CREDITS} crédits ajoutés à votre compte !`,
  })
}
