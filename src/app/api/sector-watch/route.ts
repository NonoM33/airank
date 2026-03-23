export const dynamic = 'force-dynamic'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { queryOpenRouter } from '@/lib/scanner/openrouter'
import { useCredits, getCredits, CREDIT_COSTS } from '@/lib/credits'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  sector: z.string().min(1).max(200),
  brandName: z.string().min(1).max(200).optional(),
  competitors: z.array(z.string()).max(10).optional(),
})

function buildSectorPrompt(sector: string, brandName?: string, competitors?: string[]): string {
  const competitorStr = competitors?.length
    ? `Concurrents à surveiller : ${competitors.join(', ')}.`
    : ''
  const brandStr = brandName
    ? `Ma marque s'appelle "${brandName}".`
    : ''

  return `Analyse les tendances actuelles du secteur "${sector}" en France du point de vue de la visibilité dans les IA (ChatGPT, Perplexity, Claude, Gemini).
${brandStr} ${competitorStr}

Réponds en JSON avec cette structure exacte :
{
  "trends": [
    { "title": "Tendance 1", "description": "...", "impact": "high|medium|low", "direction": "up|down|stable" }
  ],
  "topKeywords": ["mot-clé 1", "mot-clé 2", "mot-clé 3", "mot-clé 4", "mot-clé 5"],
  "opportunities": ["Opportunité 1", "Opportunité 2", "Opportunité 3"],
  "threats": ["Menace 1", "Menace 2"],
  "summary": "Résumé en 2 phrases."
}

Fournis 3-5 tendances pertinentes. Réponds UNIQUEMENT avec le JSON, sans markdown.`
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
  }

  const { sector, brandName, competitors } = parsed.data
  const COST = CREDIT_COSTS.sector_watch
  const inputKey = { sector, brandName: brandName ?? null, competitors: competitors ?? null }

  // Check cache first (< 24h)
  const cached = await prisma.analysisResult.findFirst({
    where: {
      userId: session.user.id,
      type: 'sector_watch',
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

  try {
    const prompt = buildSectorPrompt(sector, brandName, competitors)
    const raw = await queryOpenRouter('google/gemini-2.0-flash-lite-001', prompt, { maxTokens: 3000 })

    let analysis: Record<string, unknown>
    try {
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      analysis = JSON.parse(cleaned)
    } catch {
      analysis = {
        trends: [],
        topKeywords: [],
        opportunities: [],
        threats: [],
        summary: raw.slice(0, 300),
      }
    }

    await useCredits(session.user.id, COST, 'sector_watch', `Veille secteur: ${sector}`)
    const resultData = { sector, analysis, creditsUsed: COST }
    await prisma.analysisResult.create({
      data: {
        userId: session.user.id,
        type: 'sector_watch',
        input: inputKey,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        result: JSON.parse(JSON.stringify(resultData)) as any,
        credits: COST,
      },
    })
    return NextResponse.json(resultData)
  } catch (err) {
    console.error('[sector-watch] POST error:', err)
    return NextResponse.json(
      { error: 'Analyse impossible. Réessayez dans quelques instants.' },
      { status: 500 }
    )
  }
}
