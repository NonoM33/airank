export const dynamic = 'force-dynamic'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET /api/position-tracking?brandId=xxx&days=30&llm=CHATGPT
// Returns position history for Recharts LineChart
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const brandId = searchParams.get('brandId')
  const days = Math.min(parseInt(searchParams.get('days') ?? '30', 10), 90)
  const llm = searchParams.get('llm') // optional filter

  const since = new Date()
  since.setDate(since.getDate() - days)

  try {
    // If brandId provided, verify ownership
    if (brandId) {
      const brand = await prisma.brand.findFirst({
        where: { id: brandId, userId: session.user.id },
      })
      if (!brand) {
        return NextResponse.json({ error: 'Marque introuvable' }, { status: 404 })
      }
    }

    // Get all user brand IDs if no specific brand
    let brandIds: string[]
    if (brandId) {
      brandIds = [brandId]
    } else {
      const brands = await prisma.brand.findMany({
        where: { userId: session.user.id, isCompetitor: false },
        select: { id: true },
      })
      brandIds = brands.map((b) => b.id)
    }

    const history = await prisma.positionHistory.findMany({
      where: {
        brandId: { in: brandIds },
        date: { gte: since },
        ...(llm ? { llm } : {}),
      },
      include: { brand: { select: { id: true, name: true } } },
      orderBy: { date: 'asc' },
    })

    // Group by date (day) and LLM for chart-friendly format
    // Format: [{ date: '2024-01-15', CHATGPT: 72, CLAUDE: 65, global: 68, brandName: '...' }]
    const grouped: Record<string, Record<string, number | string>> = {}

    for (const entry of history) {
      const day = entry.date.toISOString().split('T')[0]
      if (!grouped[day]) grouped[day] = { date: day }
      grouped[day][entry.llm] = entry.score
    }

    const chartData = Object.values(grouped).sort((a, b) =>
      String(a.date).localeCompare(String(b.date))
    )

    // Also return raw history for table display
    return NextResponse.json({ history, chartData })
  } catch (err) {
    console.error('[position-tracking] GET error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
