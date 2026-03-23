export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db'
import { sendHealthCheck, sendChurnAlert } from '@/lib/email'
import { NextResponse } from 'next/server'

const CRON_SECRET = process.env.CRON_SECRET

export async function GET(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const fourteenDaysBack = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

  let processed = 0

  try {
    // Fetch PRO/AGENCY users who logged in within the last 30 days
    const activeUsers = await prisma.user.findMany({
      where: {
        plan: { in: ['PRO', 'AGENCY'] },
        sessions: {
          some: {
            expires: { gte: thirtyDaysAgo },
          },
        },
      },
      include: {
        brands: {
          include: {
            scans: {
              orderBy: { createdAt: 'desc' },
              take: 2,
            },
          },
        },
      },
    })

    for (const user of activeUsers) {
      const lastSession = await prisma.session.findFirst({
        where: { userId: user.id },
        orderBy: { expires: 'desc' },
      })

      const lastActiveDate = lastSession?.expires ?? user.createdAt
      const daysSinceActive = Math.floor(
        (now.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24),
      )

      // Churn alert: inactive for 14+ days
      if (daysSinceActive >= 14) {
        for (const brand of user.brands) {
          const lastScan = brand.scans[0]
          if (!lastScan) continue

          // Find top competitor from last scan
          const lastScanFull = await prisma.scan.findFirst({
            where: { brandId: brand.id },
            orderBy: { createdAt: 'desc' },
            include: { results: { select: { competitors: true } } },
          })

          let topCompetitor: string | undefined
          if (lastScanFull) {
            const allCompetitors: string[] = []
            for (const r of lastScanFull.results) {
              try {
                allCompetitors.push(...JSON.parse(r.competitors))
              } catch {
                // skip
              }
            }
            topCompetitor = allCompetitors[0]
          }

          await sendChurnAlert(user.email, {
            brandName: brand.name,
            lastScanDate: lastScan.createdAt,
            topCompetitor,
          })
          processed++
        }
        continue
      }

      // Health check: user has scans in last 7 days
      for (const brand of user.brands) {
        const recentScans = brand.scans.filter(
          (s) => s.createdAt >= sevenDaysAgo,
        )
        if (recentScans.length === 0) continue

        const currentScan = recentScans[0]

        // Previous week scan (7-14 days ago)
        const previousScan = await prisma.scan.findFirst({
          where: {
            brandId: brand.id,
            createdAt: {
              gte: fourteenDaysBack,
              lt: sevenDaysAgo,
            },
          },
          orderBy: { createdAt: 'desc' },
        })

        const currentScore = currentScan.globalScore
        const previousScore = previousScan?.globalScore ?? currentScore
        const variation = currentScore - previousScore

        // Compute top issue (lowest-scoring LLM result)
        const fullScan = await prisma.scan.findFirst({
          where: { id: currentScan.id },
          include: { results: { select: { llm: true, score: true, mentioned: true } } },
        })

        const notMentioned = fullScan?.results.filter((r) => !r.mentioned) ?? []
        const topIssue =
          notMentioned.length > 0
            ? `Votre marque n'est pas mentionnée dans ${notMentioned.map((r) => r.llm).join(', ')}`
            : variation < -10
            ? `Baisse de score détectée (${variation} points)`
            : 'Continuez à générer du contenu pour maintenir votre visibilité'

        const action =
          notMentioned.length > 0
            ? 'Créez du contenu ciblé pour améliorer votre présence dans ces IA'
            : variation < -10
            ? 'Analysez vos concurrents et relancez un scan approfondi'
            : 'Lancez un nouveau scan pour confirmer vos positions'

        await sendHealthCheck(user.email, {
          brandName: brand.name,
          score: currentScore,
          variation,
          topIssue,
          action,
        })
        processed++
      }
    }

    return NextResponse.json({ processed })
  } catch (err) {
    console.error('[cron/health-check] error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
