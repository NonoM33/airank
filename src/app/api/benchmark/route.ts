export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { useCredits } from '@/lib/credits'
import { prisma } from '@/lib/db'
import { queryOpenRouter } from '@/lib/scanner/openrouter'

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
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: { results: true },
      },
    },
  })
  if (!brand) return NextResponse.json({ error: 'Marque introuvable' }, { status: 404 })

  const ok = await useCredits(session.user.id, 3, 'benchmark', `Benchmark secteur pour ${brand.name}`)
  if (!ok) return NextResponse.json({ error: 'Crédits insuffisants' }, { status: 402 })

  const allResults = brand.scans.flatMap(s => s.results)

  const frequency = allResults.length > 0
    ? Math.round((allResults.filter(r => r.mentioned).length / allResults.length) * 100)
    : 0

  const mentionedWithPos = allResults.filter(r => r.mentioned && r.position)
  const position = mentionedWithPos.length > 0
    ? Math.round(mentionedWithPos.reduce((sum, r) => sum + Math.max(20, 100 - ((r.position ?? 1) - 1) * 8), 0) / mentionedWithPos.length)
    : 0

  const sentimentMap = { POSITIVE: 100, NEUTRAL: 60, NEGATIVE: 20 } as const
  const sentWithSentiment = allResults.filter(r => r.mentioned && r.sentiment)
  const sentiment = sentWithSentiment.length > 0
    ? Math.round(sentWithSentiment.reduce((sum, r) => sum + (sentimentMap[r.sentiment as keyof typeof sentimentMap] ?? 60), 0) / sentWithSentiment.length)
    : 0

  const LLMS = ['CHATGPT', 'CLAUDE', 'PERPLEXITY', 'GEMINI']
  const llmsCovering = LLMS.filter(llm => allResults.some(r => r.llm === llm && r.mentioned))
  const coverage = Math.round((llmsCovering.length / LLMS.length) * 100)

  const scanScores = brand.scans.map(s => s.globalScore ?? 0).filter(s => s > 0)
  let constance = scanScores.length === 1 ? 50 : 0
  if (scanScores.length >= 2) {
    const avg = scanScores.reduce((a, b) => a + b, 0) / scanScores.length
    const stdDev = Math.sqrt(scanScores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / scanScores.length)
    constance = Math.max(0, Math.min(100, Math.round(100 - stdDev)))
  }

  const authority = Math.round(frequency * 0.25 + position * 0.25 + sentiment * 0.2 + coverage * 0.2 + constance * 0.1)
  const sector = brand.sector ?? 'SaaS'

  let sectorAvg = { frequency: 45, position: 40, sentiment: 58, coverage: 50, constance: 55, authority: 48 }
  try {
    const prompt = `Tu es expert en visibilité IA pour les marques.
Donne les scores moyens typiques pour une entreprise du secteur "${sector}" sur ces 6 dimensions (0 à 100):
1. frequency: fréquence de mention par les LLMs
2. position: qualité de la position (1ère = 100)
3. sentiment: qualité du sentiment (très positif = 100)
4. coverage: % de LLMs différents qui mentionnent la marque
5. constance: régularité des mentions
6. authority: score d'autorité global

Réponds UNIQUEMENT avec ce JSON sans markdown: {"frequency":XX,"position":XX,"sentiment":XX,"coverage":XX,"constance":XX,"authority":XX}`

    const aiText = await queryOpenRouter('google/gemini-flash-1.5', prompt)
    const match = aiText.match(/\{[^}]+\}/)
    if (match) {
      const ai = JSON.parse(match[0])
      const clamp = (v: unknown) => Math.min(100, Math.max(0, Number(v) || 0))
      sectorAvg = {
        frequency: clamp(ai.frequency) || 45,
        position: clamp(ai.position) || 40,
        sentiment: clamp(ai.sentiment) || 58,
        coverage: clamp(ai.coverage) || 50,
        constance: clamp(ai.constance) || 55,
        authority: clamp(ai.authority) || 48,
      }
    }
  } catch { /* use defaults */ }

  return NextResponse.json({
    brandName: brand.name,
    sector,
    scanCount: brand.scans.length,
    radarData: [
      { axis: 'Fréquence', brand: frequency, secteur: sectorAvg.frequency },
      { axis: 'Position', brand: position, secteur: sectorAvg.position },
      { axis: 'Sentiment', brand: sentiment, secteur: sectorAvg.sentiment },
      { axis: 'Couverture LLM', brand: coverage, secteur: sectorAvg.coverage },
      { axis: 'Constance', brand: constance, secteur: sectorAvg.constance },
      { axis: 'Autorité', brand: authority, secteur: sectorAvg.authority },
    ],
  })
}
