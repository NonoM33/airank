export const dynamic = 'force-dynamic'
import { auth } from '@/lib/auth'
import { queryOpenRouter } from '@/lib/scanner/openrouter'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { useCredits, getCredits } from '@/lib/credits'

const schema = z.object({
  brandName: z.string().min(1).max(200),
  text: z.string().min(10).max(10000),
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

  const { brandName, text } = parsed.data

  // Check credits first but don't debit yet
  const currentCredits = await getCredits(session.user.id)
  if (currentCredits < 1) {
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
  "recommendations": ["<conseil pour améliorer la citation>"]
}`

  try {
    const raw = await queryOpenRouter('google/gemini-2.0-flash-lite-001', prompt)
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON')
    const result = JSON.parse(jsonMatch[0])
    return NextResponse.json({ brandName, ...result })
  } catch {
    return NextResponse.json({ error: 'Analyse impossible. Réessayez.' }, { status: 500 })
  }
}
