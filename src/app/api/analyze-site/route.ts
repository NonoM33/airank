export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { queryOpenRouter } from '@/lib/scanner/openrouter'

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body?.url || typeof body.url !== 'string') {
    return NextResponse.json({ error: 'URL invalide' }, { status: 400 })
  }

  let targetUrl = body.url.trim()
  if (!targetUrl.startsWith('http')) targetUrl = 'https://' + targetUrl

  let html = ''
  try {
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; AIRank/1.0; +https://airank.fr)',
        Accept: 'text/html',
      },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    html = await res.text()
  } catch {
    return NextResponse.json(
      { error: 'Impossible de récupérer le site. Vérifiez l\'URL.' },
      { status: 422 }
    )
  }

  // Extract metadata
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? ''
  const metaDesc =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{1,300})["']/i)?.[1]?.trim() ??
    html.match(/<meta[^>]+content=["']([^"']{1,300})["'][^>]+name=["']description["']/i)?.[1]?.trim() ??
    ''
  const metaKeywords =
    html.match(/<meta[^>]+name=["']keywords["'][^>]+content=["']([^"']{1,200})["']/i)?.[1]?.trim() ?? ''
  const h1 = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1]?.trim() ?? ''

  // Extract clean text content
  const bodyText = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1200)

  const prompt = `Analyse ce site web et retourne un objet JSON avec exactement ces champs:
- businessName: nom exact de l'entreprise ou marque
- industry: secteur d'activité court (ex: "Agence SEO", "Logiciel CRM", "E-commerce mode", "Cabinet comptable")
- location: ville et pays si détectable, sinon null
- description: description courte de l'activité en 1-2 phrases
- suggestedQueries: tableau de exactement 3 requêtes que les clients pourraient taper dans ChatGPT ou Perplexity pour trouver ce type de service (en français, formulées comme de vraies recherches utilisateur, commençant par des mots comme "meilleur", "recommande", "quelle", etc.)

Données du site:
Titre: ${title}
Description meta: ${metaDesc}
Mots-clés: ${metaKeywords}
H1: ${h1}
Contenu: ${bodyText}

Réponds UNIQUEMENT avec le JSON valide, sans markdown, sans commentaires, sans texte autour.`

  try {
    const response = await queryOpenRouter('google/gemini-2.0-flash-lite-001', prompt)
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')
    const data = JSON.parse(jsonMatch[0])
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      { error: 'Impossible d\'analyser le site. Essayez de renseigner les informations manuellement.' },
      { status: 500 }
    )
  }
}
