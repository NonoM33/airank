export const dynamic = 'force-dynamic'
import { auth } from '@/lib/auth'
import { queryOpenRouter } from '@/lib/scanner/openrouter'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { useCredits, getCredits } from '@/lib/credits'

const schema = z.object({
  url: z.string().url(),
  brandName: z.string().max(200).optional(),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  // Auto-add https:// if missing
  if (body?.url && typeof body.url === 'string' && !body.url.match(/^https?:\/\//)) {
    body.url = 'https://' + body.url
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'URL invalide' }, { status: 400 })
  }

  const { url, brandName } = parsed.data

  // Check credits first but don't debit yet
  const currentCredits = await getCredits(session.user.id)
  if (currentCredits < 2) {
    return NextResponse.json({ error: 'Crédits insuffisants', credits: currentCredits }, { status: 402 })
  }

  // Fetch the page HTML
  let html = ''
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'AIRank-SEO-Auditor/1.0' },
      signal: AbortSignal.timeout(10000),
    })
    html = await res.text()
  } catch {
    return NextResponse.json({ error: `Impossible de récupérer la page "${parsed.data.url}". Le site ne répond pas ou l'URL est incorrecte. Essayez avec www (ex: www.exemple.fr).` }, { status: 422 })
  }

  // Truncate HTML for the prompt (keep structure, remove scripts/styles)
  const cleanHtml = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .slice(0, 8000)

  const prompt = `Tu es un expert SEO spécialisé dans l'optimisation pour les LLMs (ChatGPT, Claude, Gemini, Perplexity).

Analyse ce HTML de la page "${url}"${brandName ? ` pour la marque "${brandName}"` : ''}.

HTML:
${cleanHtml}

Effectue une analyse complète et réponds UNIQUEMENT en JSON valide avec cette structure exacte:
{
  "score": <number 0-100>,
  "categories": {
    "structure": { "score": <0-100>, "details": "<string>", "issues": ["<string>"] },
    "meta": { "score": <0-100>, "details": "<string>", "issues": ["<string>"] },
    "content": { "score": <0-100>, "details": "<string>", "issues": ["<string>"] },
    "schema": { "score": <0-100>, "details": "<string>", "issues": ["<string>"] },
    "llm_readability": { "score": <0-100>, "details": "<string>", "issues": ["<string>"] }
  },
  "recommendations": [
    {
      "title": "<titre court de la recommandation>",
      "priority": "<haute|moyenne|faible>",
      "difficulty": "<facile|moyen|avancé>",
      "time": "<temps estimé ex: 5 min, 30 min, 2h>",
      "impact": "<impact SEO LLM ex: +10 pts LLM, +15 pts Schema>",
      "steps": [
        { "text": "<description de l'étape 1>" },
        { "text": "<description de l'étape 2>", "code": "<snippet de code si applicable>", "language": "<html|json|javascript>" }
      ]
    }
  ],
  "strengths": ["<string>", "<string>"],
  "h1": "<extracted H1 or empty>",
  "h2s": ["<list of H2s found, max 5>"],
  "hasSchemaOrg": <boolean>,
  "hasFaq": <boolean>,
  "metaDescription": "<extracted meta description or empty>"
}`

  try {
    const raw = await queryOpenRouter('google/gemini-2.0-flash-lite-001', prompt)
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON')
    const result = JSON.parse(jsonMatch[0])
    // Debit credits only after successful analysis
    await useCredits(session.user.id, 2, 'seo_audit', url)
    return NextResponse.json({ url, ...result })
  } catch {
    return NextResponse.json({ error: 'Analyse impossible. Réessayez.' }, { status: 500 })
  }
}
