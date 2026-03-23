export const dynamic = 'force-dynamic'
import { auth } from '@/lib/auth'
import { queryOpenRouter } from '@/lib/scanner/openrouter'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { useCredits, getCredits } from '@/lib/credits'
import { prisma } from '@/lib/db'

const schema = z.object({
  brandName: z.string().min(1).max(200),
  text: z.string().min(10).max(10000),
})

const COST = 1

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

  const { brandName, text } = parsed.data
  const inputKey = { brandName, text }

  // Check cache first (< 24h)
  const cached = await prisma.analysisResult.findFirst({
    where: {
      userId: session.user.id,
      type: 'citation_analysis',
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

  const prompt = `Tu es un expert en analyse de réputation et de visibilité dans les LLMs.

Analyse comment "${brandName}" est citée dans ce texte généré par un LLM.

TEXTE:
${text}

Analyse en détail et réponds UNIQUEMENT en JSON valide:
{
  "isMentioned": <boolean>,
  "mentionCount": <number>,
  "sentiment": "<positive|neutral|negative|not_mentioned>",
  "sentimentScore": <-1.0 à 1.0>,
  "position": <number or null, 1=première mention>,
  "citations": [
    {
      "excerpt": "<phrase exacte contenant la marque>",
      "sentiment": "<positive|neutral|negative>",
      "context": "<description du contexte>",
      "isRecommendation": <boolean>
    }
  ],
  "keywords": ["<mot-clé associé à la marque>"],
  "competitors": ["<autres marques/concurrents mentionnés>"],
  "strengths": ["<point fort mentionné>"],
  "weaknesses": ["<point faible ou critique mentionné>"],
  "summary": "<résumé en 2 phrases de comment la marque est perçue>",
  "recommendations": [
    {
      "title": "<titre court du conseil>",
      "priority": "<haute|moyenne|faible>",
      "difficulty": "<facile|moyen|avancé>",
      "time": "<temps estimé ex: 30 min, 2h>",
      "impact": "<impact ex: +2 citations LLM, meilleur sentiment>",
      "steps": [
        { "text": "<description de l'action concrète à faire>" },
        { "text": "<autre action>", "code": "<exemple de texte ou snippet si applicable>", "language": "<html|json|text>" }
      ]
    }
  ]
}`

  try {
    const raw = await queryOpenRouter('google/gemini-2.0-flash-lite-001', prompt)
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON')
    const result = JSON.parse(jsonMatch[0])
    await useCredits(session.user.id, COST, 'citation_analysis', brandName)
    const resultData = { brandName, ...result }
    await prisma.analysisResult.create({
      data: {
        userId: session.user.id,
        type: 'citation_analysis',
        input: inputKey,
        result: resultData,
        credits: COST,
      },
    })
    return NextResponse.json(resultData)
  } catch {
    return NextResponse.json({ error: 'Analyse impossible. Réessayez.' }, { status: 500 })
  }
}
