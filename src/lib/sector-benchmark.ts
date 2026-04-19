import { prisma } from './db'

export interface BenchmarkRow {
  brandName: string
  score: number
  mentions: number
  rank: number
  isYou: boolean
  delta?: number // vs previous snapshot
}

/**
 * Build a real sector benchmark from aggregated Scan data across all users in the sector.
 * For a given sector and user's brand, compute the ranking.
 */
export async function buildSectorBenchmark(
  sector: string,
  userBrandName: string,
  sinceDays: number = 30
): Promise<BenchmarkRow[]> {
  const since = new Date(Date.now() - sinceDays * 86400_000)

  // Pull all brands in the sector (across all users) and their average global scores
  const brands = await prisma.brand.findMany({
    where: {
      sector,
      scans: { some: { createdAt: { gte: since } } },
    },
    include: {
      scans: {
        where: { createdAt: { gte: since } },
        select: { globalScore: true, results: { select: { mentioned: true } } },
      },
    },
  })

  const agg = new Map<string, { totalScore: number; scansCount: number; mentions: number }>()
  for (const b of brands) {
    const key = b.name.trim().toLowerCase()
    const prev = agg.get(key) ?? { totalScore: 0, scansCount: 0, mentions: 0 }
    for (const s of b.scans) {
      prev.totalScore += s.globalScore
      prev.scansCount += 1
      prev.mentions += s.results.filter((r) => r.mentioned).length
    }
    agg.set(key, prev)
  }

  const rows = Array.from(agg.entries())
    .map(([name, v]) => ({
      brandName: name,
      score: v.scansCount > 0 ? Math.round(v.totalScore / v.scansCount) : 0,
      mentions: v.mentions,
      rank: 0,
      isYou: name === userBrandName.toLowerCase(),
    }))
    .sort((a, b) => b.score - a.score)

  rows.forEach((r, i) => {
    r.rank = i + 1
  })

  // Take a snapshot for trend tracking
  await Promise.all(
    rows.map((r) =>
      prisma.sectorBenchmark.create({
        data: {
          sector,
          brandName: r.brandName,
          llm: 'global',
          score: r.score,
          mentions: r.mentions,
        },
      }).catch(() => {})
    )
  )

  return rows.slice(0, 20)
}
