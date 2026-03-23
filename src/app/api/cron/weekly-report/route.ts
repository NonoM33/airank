export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db'
import { sendHealthCheck } from '@/lib/email'
import { NextResponse } from 'next/server'

const CRON_SECRET = process.env.CRON_SECRET

// GET /api/cron/weekly-report — called by cron scheduler weekly
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const now = new Date()
  const weekAgo = new Date(now)
  weekAgo.setDate(weekAgo.getDate() - 7)
  const twoWeeksAgo = new Date(now)
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)

  let processed = 0
  let errors = 0

  try {
    const users = await prisma.user.findMany({
      include: {
        brands: {
          where: { isCompetitor: false },
          include: {
            scans: {
              where: { createdAt: { gte: twoWeeksAgo } },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    })

    for (const user of users) {
      for (const brand of user.brands) {
        const thisWeekScans = brand.scans.filter((s) => s.createdAt >= weekAgo)
        if (thisWeekScans.length === 0) continue

        const lastWeekScans = brand.scans.filter(
          (s) => s.createdAt >= twoWeeksAgo && s.createdAt < weekAgo
        )

        const avgScore =
          thisWeekScans.length > 0
            ? Math.round(
                thisWeekScans.reduce((sum, s) => sum + s.globalScore, 0) /
                  thisWeekScans.length
              )
            : 0

        const prevAvg =
          lastWeekScans.length > 0
            ? Math.round(
                lastWeekScans.reduce((sum, s) => sum + s.globalScore, 0) /
                  lastWeekScans.length
              )
            : avgScore

        const variation = avgScore - prevAvg

        // Find best and worst performing scan
        const sortedScans = [...thisWeekScans].sort(
          (a, b) => b.globalScore - a.globalScore
        )
        const bestScan = sortedScans[0]
        const worstScan = sortedScans[sortedScans.length - 1]

        const topIssue =
          variation < -10
            ? `Score en baisse de ${Math.abs(variation)} points cette semaine`
            : worstScan
            ? `Requête faible : "${worstScan.query}" (${worstScan.globalScore}/100)`
            : 'Aucune alerte critique cette semaine'

        const action =
          variation < 0
            ? `Optimisez votre contenu pour la requête "${worstScan?.query ?? 'principale'}"`
            : bestScan
            ? `Reproduisez la stratégie de "${bestScan.query}" sur vos autres requêtes`
            : 'Lancez de nouveaux scans pour affiner votre visibilité'

        // Create an Alert record for the weekly summary
        await prisma.alert.create({
          data: {
            userId: user.id,
            type: variation < -10 ? 'score_below' : 'score_above',
            brandId: brand.id,
            threshold: avgScore,
            message: `Rapport hebdo ${brand.name} : score ${avgScore}/100 (${variation >= 0 ? '+' : ''}${variation} vs semaine précédente)`,
            read: false,
          },
        })

        // Send email (uses Resend if configured, otherwise logs)
        const result = await sendHealthCheck(user.email, {
          brandName: brand.name,
          score: avgScore,
          variation,
          topIssue,
          action,
        })

        if (result.success) {
          processed++
        } else {
          // Log if email not sent (e.g., Resend not configured)
          console.log(
            `[cron/weekly-report] Email not sent for ${user.email} / ${brand.name} — score: ${avgScore}, variation: ${variation}`
          )
          processed++
        }
      }
    }

    return NextResponse.json({ processed, errors, timestamp: now.toISOString() })
  } catch (err) {
    console.error('[cron/weekly-report] error:', err)
    errors++
    return NextResponse.json({ error: 'Erreur serveur', processed, errors }, { status: 500 })
  }
}
