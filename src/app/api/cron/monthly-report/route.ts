export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db'
import { sendMonthlyReport } from '@/lib/email'
import { NextResponse } from 'next/server'

const CRON_SECRET = process.env.CRON_SECRET

export async function GET(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  let processed = 0

  try {
    // Fetch all users who have scans this month
    const users = await prisma.user.findMany({
      include: {
        brands: {
          include: {
            scans: {
              where: { createdAt: { gte: lastMonthStart } },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    })

    for (const user of users) {
      for (const brand of user.brands) {
        const thisMonthScans = brand.scans.filter(
          (s) => s.createdAt >= thisMonthStart,
        )
        if (thisMonthScans.length === 0) continue

        const lastMonthScans = brand.scans.filter(
          (s) => s.createdAt >= lastMonthStart && s.createdAt < thisMonthStart,
        )

        // Average scores
        const avgScore =
          thisMonthScans.length > 0
            ? Math.round(
                thisMonthScans.reduce((sum, s) => sum + s.globalScore, 0) /
                  thisMonthScans.length,
              )
            : 0

        const prevAvg =
          lastMonthScans.length > 0
            ? Math.round(
                lastMonthScans.reduce((sum, s) => sum + s.globalScore, 0) /
                  lastMonthScans.length,
              )
            : avgScore

        const variation = avgScore - prevAvg

        // Best and worst queries
        const sortedByScore = [...thisMonthScans].sort(
          (a, b) => b.globalScore - a.globalScore,
        )
        const topQuery = sortedByScore[0]?.query ?? 'N/A'
        const worstQuery =
          sortedByScore[sortedByScore.length - 1]?.query ?? 'N/A'

        await sendMonthlyReport(user.email, {
          brandName: brand.name,
          avgScore,
          variation,
          topQuery,
          worstQuery,
        })
        processed++
      }
    }

    return NextResponse.json({ processed })
  } catch (err) {
    console.error('[cron/monthly-report] error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
