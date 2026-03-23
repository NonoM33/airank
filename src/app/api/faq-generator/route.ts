export const dynamic = 'force-dynamic'
import { auth } from '@/lib/auth'
import { queryOpenRouter } from '@/lib/scanner/openrouter'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { useCredits, getCredits } from '@/lib/credits'

const schema = z.object({
  brandName: z.string().min(1).max(200),
  industry: z.string().min(1).max(200),
  count: z.number().int().min(3).max(15).default(8),
  focus: z.string().max(200).optional(),
})

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

  // Check credits first but don't debit yet
  const currentCredits = await getCredits(session.user.id)
  if (currentCredits < 2) {
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
    const raw = await queryOpenRouter('google/gemini-2.0-flash-lite-001', prompt)
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON')
    const result = JSON.parse(jsonMatch[0])
    return NextResponse.json({ brandName, industry, count, ...result })
  } catch {
    return NextResponse.json({ error: 'Génération impossible. Réessayez.' }, { status: 500 })
  }
}
