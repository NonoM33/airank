export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { useCredits } from '@/lib/credits'
import { prisma } from '@/lib/db'

const schema = z.object({ brandId: z.string() })

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Données invalides' }, { status: 400 })

  const brand = await prisma.brand.findFirst({
    where: { id: parsed.data.brandId, userId: session.user.id },
    include: {
      scans: {
        take: 30,
        orderBy: { createdAt: 'desc' },
        include: { results: true },
      },
    },
  })
  if (!brand) return NextResponse.json({ error: 'Marque introuvable' }, { status: 404 })

  const ok = await useCredits(session.user.id, 2, 'authority_score', `Score autorité pour ${brand.name}`)
  if (!ok) return NextResponse.json({ error: 'Crédits insuffisants' }, { status: 402 })

  const allResults = brand.scans.flatMap(s => s.results)
  const mentioned = allResults.filter(r => r.mentioned)

  // Frequency: % of all results with a mention
  const frequency = allResults.length > 0
    ? Math.round((mentioned.length / allResults.length) * 100)
    : 0

  // Position: average normalized position score (1st=100, each step -8, min 20)
  const posScores = mentioned
    .filter(r => r.position)
    .map(r => Math.max(20, 100 - ((r.position ?? 1) - 1) * 8))
  const position = posScores.length > 0
    ? Math.round(posScores.reduce((a, b) => a + b, 0) / posScores.length)
    : 0

  // Sentiment: weighted average
  const sentMap = { POSITIVE: 100, NEUTRAL: 60, NEGATIVE: 10 } as const
  const sentScores = mentioned
    .filter(r => r.sentiment)
    .map(r => sentMap[r.sentiment as keyof typeof sentMap] ?? 60)
  const sentiment = sentScores.length > 0
    ? Math.round(sentScores.reduce((a, b) => a + b, 0) / sentScores.length)
    : 0

  // LLM Coverage: distinct LLMs that mentioned the brand
  const LLMS = ['CHATGPT', 'CLAUDE', 'PERPLEXITY', 'GEMINI']
  const llmsCovering = LLMS.filter(llm => allResults.some(r => r.llm === llm && r.mentioned))
  const coverage = Math.round((llmsCovering.length / LLMS.length) * 100)

  // Constance: inverse of score std deviation
  const scanScores = brand.scans.map(s => s.globalScore ?? 0).filter(s => s > 0)
  let constance = 0
  if (scanScores.length === 1) {
    constance = 50
  } else if (scanScores.length >= 2) {
    const avg = scanScores.reduce((a, b) => a + b, 0) / scanScores.length
    const variance = scanScores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / scanScores.length
    constance = Math.max(0, Math.min(100, Math.round(100 - Math.sqrt(variance))))
  }

  // Weighted authority score
  const score = Math.round(
    frequency * 0.25 + position * 0.25 + sentiment * 0.20 + coverage * 0.20 + constance * 0.10
  )

  const grade = score >= 80 ? 'A' : score >= 65 ? 'B' : score >= 50 ? 'C' : score >= 35 ? 'D' : 'E'
  const label = score >= 80 ? 'Excellent' : score >= 65 ? 'Bon' : score >= 50 ? 'Moyen' : score >= 35 ? 'Faible' : 'Très faible'

  return NextResponse.json({
    brandName: brand.name,
    score,
    grade,
    label,
    breakdown: { frequency, position, sentiment, coverage, constance },
    scanCount: brand.scans.length,
    mentionCount: mentioned.length,
    totalResults: allResults.length,
  })
}
