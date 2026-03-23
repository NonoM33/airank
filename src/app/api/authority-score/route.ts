export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { useCredits, getCredits } from '@/lib/credits'
import { prisma } from '@/lib/db'

const schema = z.object({ brandId: z.string() })

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
      type: 'authority_score',
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
        take: 30,
        orderBy: { createdAt: 'desc' },
        include: { results: true },
      },
    },
  })
  if (!brand) return NextResponse.json({ error: 'Marque introuvable' }, { status: 404 })

  const sentMap = { POSITIVE: 80, NEUTRAL: 60, NEGATIVE: 20 } as const

  const allResults = brand.scans.flatMap(s => s.results)
  const mentioned = allResults.filter(r => r.mentioned)

  const frequency = allResults.length > 0
    ? Math.round((mentioned.length / allResults.length) * 100)
    : 0

  const posScores = mentioned.filter(r => r.position).map(r => Math.max(0, 100 - ((r.position! - 1) * 20)))
  const position = posScores.length > 0
    ? Math.round(posScores.reduce((a, b) => a + b, 0) / posScores.length)
    : 0

  const sentScores = mentioned
    .filter(r => r.sentiment)
    .map(r => sentMap[r.sentiment as keyof typeof sentMap] ?? 60)
  const sentiment = sentScores.length > 0
    ? Math.round(sentScores.reduce((a, b) => a + b, 0) / sentScores.length)
    : 0

  const LLMS = ['CHATGPT', 'CLAUDE', 'PERPLEXITY', 'GEMINI']
  const llmsCovering = LLMS.filter(llm => allResults.some(r => r.llm === llm && r.mentioned))
  const coverage = Math.round((llmsCovering.length / LLMS.length) * 100)

  const scanScores = brand.scans.map(s => s.globalScore ?? 0).filter(s => s > 0)
  let constance = 0
  if (scanScores.length === 1) {
    constance = 50
  } else if (scanScores.length >= 2) {
    const avg = scanScores.reduce((a, b) => a + b, 0) / scanScores.length
    const variance = scanScores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / scanScores.length
    constance = Math.max(0, Math.min(100, Math.round(100 - Math.sqrt(variance))))
  }

  const score = Math.round(
    frequency * 0.25 + position * 0.25 + sentiment * 0.20 + coverage * 0.20 + constance * 0.10
  )
  const grade = score >= 80 ? 'A' : score >= 65 ? 'B' : score >= 50 ? 'C' : score >= 35 ? 'D' : 'E'
  const label = score >= 80 ? 'Excellent' : score >= 65 ? 'Bon' : score >= 50 ? 'Moyen' : score >= 35 ? 'Faible' : 'Très faible'

  await useCredits(session.user.id, COST, 'authority_score', '')
  const resultData = {
    brandName: brand.name,
    score,
    grade,
    label,
    breakdown: { frequency, position, sentiment, coverage, constance },
    scanCount: brand.scans.length,
    mentionCount: mentioned.length,
    totalResults: allResults.length,
  }
  await prisma.analysisResult.create({
    data: {
      userId: session.user.id,
      brandId,
      type: 'authority_score',
      input: inputKey,
      result: resultData,
      credits: COST,
    },
  })
  return NextResponse.json(resultData)
}
