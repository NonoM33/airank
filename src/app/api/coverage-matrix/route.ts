export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { useCredits, getCredits } from '@/lib/credits'
import { prisma } from '@/lib/db'

const schema = z.object({ brandId: z.string() })

const LLMS = [
  { key: 'CHATGPT', label: 'ChatGPT' },
  { key: 'CLAUDE', label: 'Claude' },
  { key: 'PERPLEXITY', label: 'Perplexity' },
  { key: 'GEMINI', label: 'Gemini' },
]

const COST = 2

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Données invalides' }, { status: 400 })

  const { brandId } = parsed.data
  const inputKey = { brandId }

  // Check cache first (< 24h)
  const cached = await prisma.analysisResult.findFirst({
    where: {
      userId: session.user.id,
      type: 'coverage_matrix',
      input: { equals: inputKey },
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    orderBy: { createdAt: 'desc' },
  })
  if (cached) {
    return NextResponse.json({ ...(cached.result as object), cached: true, cachedAt: cached.createdAt })
  }

  const currentCredits = await getCredits(session.user.id)
  if (currentCredits < COST) {
    return NextResponse.json({ error: 'Crédits insuffisants', credits: currentCredits }, { status: 402 })
  }

  const brand = await prisma.brand.findFirst({
    where: { id: brandId, userId: session.user.id },
    include: {
      scans: {
        take: 20,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          query: true,
          createdAt: true,
          results: {
            select: { llm: true, mentioned: true, position: true },
          },
        },
      },
    },
  })
  if (!brand) return NextResponse.json({ error: 'Marque introuvable' }, { status: 404 })

  // Deduplicate by query (keep most recent)
  const seenQueries = new Set<string>()
  const uniqueScans = brand.scans.filter(scan => {
    if (seenQueries.has(scan.query)) return false
    seenQueries.add(scan.query)
    return true
  })

  const matrix = uniqueScans.slice(0, 10).map(scan => {
    const row: Record<string, unknown> = {
      query: scan.query.slice(0, 70),
      scanDate: scan.createdAt,
    }
    for (const { key } of LLMS) {
      const result = scan.results.find(r => r.llm === key)
      row[key] = result ? { mentioned: result.mentioned, position: result.position } : null
    }
    return row
  })

  await useCredits(session.user.id, COST, 'coverage_matrix', '')
  const resultData = { brandName: brand.name, llms: LLMS, matrix }
  await prisma.analysisResult.create({
    data: {
      userId: session.user.id,
      brandId,
      type: 'coverage_matrix',
      input: inputKey,
      result: resultData,
      credits: COST,
    },
  })
  return NextResponse.json(resultData)
}
