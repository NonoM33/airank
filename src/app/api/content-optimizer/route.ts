export const dynamic = 'force-dynamic'
import { auth } from '@/lib/auth'
import { queryOpenRouter } from '@/lib/scanner/openrouter'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { useCredits, getCredits } from '@/lib/credits'
import { prisma } from '@/lib/db'

const schema = z.object({
  text: z.string().min(50).max(10000),
  brandName: z.string().min(1).max(200),
  context: z.string().max(300).optional(),
})

const COST = 3

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

  const { text, brandName, context } = parsed.data
  const inputKey = { text, brandName, context: context ?? null }

  // Check cache first (< 24h)
  const cached = await prisma.analysisResult.findFirst({
    where: {
      userId: session.user.id,
      type: 'content_optimizer',
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

  const prompt = `Tu es un expert en optimisation de contenu pour la visibilité dans les LLMs (ChatGPT, Claude, Gemini, Perplexity).

Réécris ce texte pour maximiser les chances que "${brandName}" soit cité positivement par les LLMs quand on pose des questions sur ${context || 'ce sujet'}.

Principes d'optimisation LLM:
- Utilise des phrases affirmatives claires et directes
- Intègre des faits vérifiables et des chiffres
- Structure l'information de façon encyclopédique
- Mentionne des cas d'usage concrets
- Emploie un vocabulaire du secteur
- Évite le langage publicitaire excessif

TEXTE ORIGINAL:
${text}

Réponds UNIQUEMENT en JSON valide:
{
  "optimizedText": "<texte réécrit>",
  "changes": ["<modification 1>", "<modification 2>", "<modification 3>"],
  "scoreEstimate": { "before": <0-100>, "after": <0-100> },
  "keyPhrases": ["<phrase clé 1>", "<phrase clé 2>", "<phrase clé 3>"],
  "tips": [
    {
      "title": "<titre court du conseil>",
      "priority": "<haute|moyenne|faible>",
      "difficulty": "<facile|moyen|avancé>",
      "time": "<temps estimé ex: 10 min, 1h>",
      "impact": "<impact ex: +20% citations LLM>",
      "steps": [
        { "text": "<action concrète à effectuer>" },
        { "text": "<autre action>", "code": "<exemple de phrase ou snippet si applicable>", "language": "<text|html|json>" }
      ]
    }
  ]
}`

  try {
    const raw = await queryOpenRouter('google/gemini-2.0-flash-lite-001', prompt)
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON')
    const result = JSON.parse(jsonMatch[0])
    await useCredits(session.user.id, COST, 'content_optimizer', '')
    await prisma.analysisResult.create({
      data: {
        userId: session.user.id,
        type: 'content_optimizer',
        input: inputKey,
        result,
        credits: COST,
      },
    })
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Optimisation impossible. Réessayez.' }, { status: 500 })
  }
}
