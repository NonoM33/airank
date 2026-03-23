export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { useCredits, getCredits } from '@/lib/credits'
import { prisma } from '@/lib/db'
import { queryOpenRouter } from '@/lib/scanner/openrouter'

const schema = z.object({ brandId: z.string() })

const LABELS = ['Recommandation', 'Enthousiaste', 'Neutre', 'Mise en garde'] as const
type Label = (typeof LABELS)[number]
const LLMS = ['CHATGPT', 'CLAUDE', 'PERPLEXITY', 'GEMINI'] as const

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
      type: 'sentiment_deep',
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
        take: 15,
        orderBy: { createdAt: 'desc' },
        include: {
          results: {
            where: { mentioned: true },
            select: { llm: true, context: true, sentiment: true },
          },
        },
      },
    },
  })
  if (!brand) return NextResponse.json({ error: 'Marque introuvable' }, { status: 404 })

  const mentionedResults = brand.scans.flatMap(s => s.results)
  const emptyBar = LABELS.map(label => ({ label, CHATGPT: 0, CLAUDE: 0, PERPLEXITY: 0, GEMINI: 0 }))

  if (mentionedResults.length === 0) {
    return NextResponse.json({ brandName: brand.name, barData: emptyBar, total: 0 })
  }

  const sample = mentionedResults.slice(0, 30)
  const counts: Record<Label, Record<string, number>> = {
    'Recommandation': { CHATGPT: 0, CLAUDE: 0, PERPLEXITY: 0, GEMINI: 0 },
    'Enthousiaste': { CHATGPT: 0, CLAUDE: 0, PERPLEXITY: 0, GEMINI: 0 },
    'Neutre': { CHATGPT: 0, CLAUDE: 0, PERPLEXITY: 0, GEMINI: 0 },
    'Mise en garde': { CHATGPT: 0, CLAUDE: 0, PERPLEXITY: 0, GEMINI: 0 },
  }

  try {
    const contexts = sample
      .map(r => `[${r.llm}] ${(r.context ?? '').slice(0, 200)}`)
      .join('\n---\n')

    const prompt = `Analyse ces extraits de réponses LLM mentionnant "${brand.name}".
Pour chaque extrait, classe-le dans UNE catégorie:
- Recommandation: la marque est explicitement recommandée
- Enthousiaste: ton très positif sur la marque
- Neutre: mention factuelle sans jugement
- Mise en garde: nuance négative ou critique

Extraits:
${contexts}

Réponds UNIQUEMENT en JSON array (un objet par extrait dans l'ordre): [{"llm":"CHATGPT","label":"Recommandation"}]
Labels valides: Recommandation, Enthousiaste, Neutre, Mise en garde`

    const aiText = await queryOpenRouter('google/gemini-flash-1.5', prompt, { maxTokens: 3000 })
    const match = aiText.match(/\[[\s\S]*\]/)
    if (match) {
      const items = JSON.parse(match[0]) as Array<{ llm: string; label: string }>
      items.forEach(item => {
        const label = item.label as Label
        if (LABELS.includes(label) && LLMS.includes(item.llm as (typeof LLMS)[number])) {
          counts[label][item.llm]++
        }
      })
    }
  } catch {
    const sentMap: Record<string, Label> = { POSITIVE: 'Recommandation', NEUTRAL: 'Neutre', NEGATIVE: 'Mise en garde' }
    sample.forEach(r => {
      const label = sentMap[r.sentiment ?? ''] ?? 'Neutre'
      if (LLMS.includes(r.llm as (typeof LLMS)[number])) counts[label][r.llm]++
    })
  }

  await useCredits(session.user.id, COST, 'sentiment_deep', '')
  const resultData = {
    brandName: brand.name,
    barData: LABELS.map(label => ({ label, ...counts[label] })),
    total: mentionedResults.length,
  }
  await prisma.analysisResult.create({
    data: {
      userId: session.user.id,
      brandId,
      type: 'sentiment_deep',
      input: inputKey,
      result: resultData,
      credits: COST,
    },
  })
  return NextResponse.json(resultData)
}
