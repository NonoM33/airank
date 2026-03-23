export const dynamic = 'force-dynamic'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'

function generateReferralCode(): string {
  // 8 chars uppercase alphanumeric
  return randomBytes(6).toString('base64url').toUpperCase().slice(0, 8)
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const userId = session.user.id

  // Ensure the user has a referral code
  let user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, referralCode: true },
  })
  if (!user) {
    return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
  }

  if (!user.referralCode) {
    // Create a unique code (retry on collision)
    let code: string | null = null
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateReferralCode()
      const existing = await prisma.user.findUnique({ where: { referralCode: candidate } })
      if (!existing) {
        code = candidate
        break
      }
    }
    if (!code) {
      return NextResponse.json({ error: 'Impossible de générer un code' }, { status: 500 })
    }
    user = await prisma.user.update({
      where: { id: userId },
      data: { referralCode: code },
      select: { id: true, referralCode: true },
    })
  }

  // Get referrals sent by this user
  const referrals = await prisma.referral.findMany({
    where: { referrerId: userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      code: true,
      usedAt: true,
      rewardGranted: true,
      referredUser: { select: { email: true } },
    },
  })

  return NextResponse.json({
    referralCode: user.referralCode,
    referrals,
  })
}
