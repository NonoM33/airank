export const dynamic = 'force-dynamic'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getPlanLimits } from '@/lib/plan-limits'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const limits = getPlanLimits(session.user.plan ?? 'FREE')
  if (!limits.csvExport) {
    return NextResponse.json(
      { error: 'Export CSV disponible à partir du plan Pro' },
      { status: 403 }
    )
  }

  const { searchParams } = new URL(req.url)
  const brandId = searchParams.get('brandId')
  const days = parseInt(searchParams.get('days') ?? '90', 10)

  const since = new Date()
  since.setDate(since.getDate() - days)

  // Verify brand belongs to user
  if (brandId) {
    const brand = await prisma.brand.findFirst({
      where: { id: brandId, userId: session.user.id },
    })
    if (!brand) {
      return NextResponse.json({ error: 'Marque introuvable' }, { status: 404 })
    }
  }

  const scans = await prisma.scan.findMany({
    where: {
      brand: { userId: session.user.id },
      ...(brandId ? { brandId } : {}),
      createdAt: { gte: since },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      results: true,
      brand: { select: { name: true } },
    },
  })

  // Build CSV manually
  const headers = [
    'date',
    'query',
    'globalScore',
    'chatgpt_mentioned',
    'chatgpt_score',
    'claude_mentioned',
    'claude_score',
    'perplexity_mentioned',
    'perplexity_score',
    'gemini_mentioned',
    'gemini_score',
    'competitors',
  ]

  const rows = scans.map((scan) => {
    const resultMap: Record<string, { mentioned: boolean; score: number }> = {}
    for (const r of scan.results) {
      resultMap[r.llm.toLowerCase()] = { mentioned: r.mentioned, score: r.score }
    }

    // Collect all competitors across all LLM results
    const allCompetitors = new Set<string>()
    for (const r of scan.results) {
      try {
        const comps = JSON.parse(r.competitors) as string[]
        comps.forEach((c) => allCompetitors.add(c))
      } catch {
        // ignore malformed JSON
      }
    }

    const escapeCell = (value: string | number | boolean) => {
      const str = String(value)
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    return [
      escapeCell(scan.createdAt.toISOString()),
      escapeCell(scan.query),
      escapeCell(scan.globalScore),
      escapeCell(resultMap['chatgpt']?.mentioned ?? false),
      escapeCell(resultMap['chatgpt']?.score ?? 0),
      escapeCell(resultMap['claude']?.mentioned ?? false),
      escapeCell(resultMap['claude']?.score ?? 0),
      escapeCell(resultMap['perplexity']?.mentioned ?? false),
      escapeCell(resultMap['perplexity']?.score ?? 0),
      escapeCell(resultMap['gemini']?.mentioned ?? false),
      escapeCell(resultMap['gemini']?.score ?? 0),
      escapeCell([...allCompetitors].join('; ')),
    ].join(',')
  })

  const brandName = brandId
    ? (scans[0]?.brand?.name ?? 'export')
    : 'all-brands'
  const dateStr = new Date().toISOString().slice(0, 10)
  const filename = `airank-export-${brandName}-${dateStr}.csv`

  // UTF-8 BOM + headers + rows
  const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n')

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
