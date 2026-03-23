import { prisma } from '@/lib/db'
import { sendCompetitorAlert, sendHealthCheck } from '@/lib/email'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScanWithResults {
  id: string
  globalScore: number
  createdAt: Date
  results: Array<{
    llm: string
    score: number
    competitors: string // JSON array
  }>
}

// ---------------------------------------------------------------------------
// detectDrift
// ---------------------------------------------------------------------------

/**
 * Compare the last two scans for a brand.
 * If a per-LLM score variation > 15 points is detected, create a drift alert.
 */
export async function detectDrift(
  brandId: string,
  userId: string,
): Promise<string[]> {
  const scans = (await prisma.scan.findMany({
    where: { brandId },
    orderBy: { createdAt: 'desc' },
    take: 2,
    include: { results: { select: { llm: true, score: true, competitors: true } } },
  })) as unknown as ScanWithResults[]

  if (scans.length < 2) return []

  const [recent, older] = scans
  const alertIds: string[] = []

  for (const recentResult of recent.results) {
    const olderResult = older.results.find((r) => r.llm === recentResult.llm)
    if (!olderResult) continue

    const delta = recentResult.score - olderResult.score
    if (Math.abs(delta) <= 15) continue

    // Dedup: skip if an identical alert was created in the last 24h
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const existing = await prisma.scoreAlert.findFirst({
      where: {
        brandId,
        userId,
        type: 'drift',
        llm: recentResult.llm,
        createdAt: { gte: since },
      },
    })
    if (existing) continue

    const direction = delta < 0 ? 'baisse' : 'hausse'
    const alert = await prisma.scoreAlert.create({
      data: {
        userId,
        brandId,
        type: 'drift',
        llm: recentResult.llm,
        message: `Score ${recentResult.llm} en ${direction} de ${Math.abs(delta)} points (${olderResult.score} → ${recentResult.score})`,
        data: JSON.stringify({ delta, previousScore: olderResult.score, currentScore: recentResult.score }),
      },
    })
    alertIds.push(alert.id)
  }

  return alertIds
}

// ---------------------------------------------------------------------------
// detectCompetitorAppeared
// ---------------------------------------------------------------------------

/**
 * Compare competitors mentioned across the last two scans.
 * If a new competitor appears in the recent scan, create an alert.
 */
export async function detectCompetitorAppeared(
  brandId: string,
  userId: string,
): Promise<string[]> {
  const scans = (await prisma.scan.findMany({
    where: { brandId },
    orderBy: { createdAt: 'desc' },
    take: 2,
    include: { results: { select: { llm: true, competitors: true } } },
  })) as unknown as ScanWithResults[]

  if (scans.length < 2) return []

  const [recent, older] = scans
  const alertIds: string[] = []

  for (const recentResult of recent.results) {
    const olderResult = older.results.find((r) => r.llm === recentResult.llm)
    const recentCompetitors: string[] = JSON.parse(recentResult.competitors || '[]')
    const olderCompetitors: string[] = olderResult
      ? JSON.parse(olderResult.competitors || '[]')
      : []

    const newCompetitors = recentCompetitors.filter(
      (c) => !olderCompetitors.some((o) => o.toLowerCase() === c.toLowerCase()),
    )

    for (const competitor of newCompetitors) {
      // Dedup: skip if identical alert in the last 24h
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const existing = await prisma.scoreAlert.findFirst({
        where: {
          brandId,
          userId,
          type: 'competitor_appeared',
          llm: recentResult.llm,
          message: { contains: competitor },
          createdAt: { gte: since },
        },
      })
      if (existing) continue

      const alert = await prisma.scoreAlert.create({
        data: {
          userId,
          brandId,
          type: 'competitor_appeared',
          llm: recentResult.llm,
          message: `${competitor} est apparu dans ${recentResult.llm}`,
          data: JSON.stringify({ competitor, llm: recentResult.llm }),
        },
      })
      alertIds.push(alert.id)
    }
  }

  return alertIds
}

// ---------------------------------------------------------------------------
// processAlertsForBrand
// ---------------------------------------------------------------------------

/**
 * Run drift + competitor detection for a brand and send emails for new alerts.
 */
export async function processAlertsForBrand(
  brandId: string,
  userId: string,
): Promise<void> {
  try {
    const [driftIds, competitorIds] = await Promise.all([
      detectDrift(brandId, userId),
      detectCompetitorAppeared(brandId, userId),
    ])

    const allNewIds = [...driftIds, ...competitorIds]
    if (allNewIds.length === 0) return

    // Fetch user email and brand name for notifications
    const [user, brand] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { email: true } }),
      prisma.brand.findUnique({ where: { id: brandId }, select: { name: true } }),
    ])

    if (!user || !brand) return

    // Fetch newly created alerts to send appropriate emails
    const newAlerts = await prisma.scoreAlert.findMany({
      where: { id: { in: allNewIds } },
    })

    for (const alert of newAlerts) {
      if (alert.type === 'competitor_appeared') {
        let competitor = alert.llm ?? 'Inconnu'
        try {
          const parsed = JSON.parse(alert.data)
          if (parsed.competitor) competitor = parsed.competitor
        } catch {
          // ignore
        }

        await sendCompetitorAlert(user.email, {
          brandName: brand.name,
          competitor,
          llm: alert.llm ?? 'IA',
          query: alert.message,
        })
      } else if (alert.type === 'drift') {
        let delta = 0
        let currentScore = 0
        try {
          const parsed = JSON.parse(alert.data)
          delta = parsed.delta ?? 0
          currentScore = parsed.currentScore ?? 0
        } catch {
          // ignore
        }

        await sendHealthCheck(user.email, {
          brandName: brand.name,
          score: currentScore,
          variation: delta,
          topIssue: alert.message,
          action: delta < 0
            ? 'Relancez un scan et vérifiez votre contenu pour cette requête'
            : 'Continuez sur cette lancée — votre stratégie fonctionne',
        })
      }
    }
  } catch (err) {
    console.error('[alerts] processAlertsForBrand error:', err)
  }
}
