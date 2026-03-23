export const dynamic = 'force-dynamic'
import { auth } from '@/lib/auth'
import { queryOpenRouter } from '@/lib/scanner/openrouter'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { useCredits, getCredits } from '@/lib/credits'
import { prisma } from '@/lib/db'

const schema = z.object({
  brandName: z.string().min(1).max(200),
  industry: z.string().min(1).max(200),
  count: z.number().int().min(3).max(15).default(8),
  focus: z.string().max(200).optional(),
})

const COST = 2

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

  const { brandName, industry, count, focus } = parsed.data
  const inputKey = { brandName, industry, count, focus: focus ?? null }

  // Check cache first (< 24h)
  const cached = await prisma.analysisResult.findFirst({
    where: {
      userId: session.user.id,
      type: 'faq_generator',
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

  const prompt = `Tu es un expert SEO spécialisé dans l'optimisation pour les LLMs.

Génère ${count} questions-réponses FAQ en français pour "${brandName}" dans le secteur "${industry}"${focus ? `, avec un focus sur "${focus}"` : ''}.

Objectif : Ces FAQs doivent être citées par ChatGPT, Claude, Gemini et Perplexity quand des utilisateurs posent des questions sur ce secteur.

Règles:
- Questions formulées comme de vraies questions d'utilisateurs
- Réponses factuelles, précises, de 2-4 phrases
- Intégrer naturellement "${brandName}" dans les réponses
- Couvrir : définitions, comparaisons, prix, utilisation, avantages, cas d'usage
- Vocabulaire conversationnel et professionnel

Réponds UNIQUEMENT en JSON valide:
{
  "faqs": [
    { "question": "<question>", "answer": "<réponse>" }
  ],
  "html": "<section de FAQ en HTML avec balises <div class=\\"faq-item\\">, <h3>, <p>>",
  "jsonLd": "<JSON-LD schema.org FAQPage complet en string>"
}`

  try {
    const raw = await queryOpenRouter('google/gemini-2.0-flash-lite-001', prompt, { maxTokens: 3000 })
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON')
    const result = JSON.parse(jsonMatch[0])
    await useCredits(session.user.id, COST, 'faq_generator', brandName)
    const resultData = { brandName, industry, count, ...result }
    await prisma.analysisResult.create({
      data: {
        userId: session.user.id,
        type: 'faq_generator',
        input: inputKey,
        result: resultData,
        credits: COST,
      },
    })
    return NextResponse.json(resultData)
  } catch {
    return NextResponse.json({ error: 'Génération impossible. Réessayez.' }, { status: 500 })
  }
}
