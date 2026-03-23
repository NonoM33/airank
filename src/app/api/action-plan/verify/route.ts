export const dynamic = "force-dynamic"
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  actionId: z.string(),
  url: z.string().url(),
  actionType: z.string().optional(),
})

type VerifyStatus = 'implemented' | 'partial' | 'not_implemented'
type VerifyResult = { status: VerifyStatus; details: string }

async function fetchPageHtml(url: string): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'AIRank-Verifier/1.0 (SEO checker)' },
    })
    return await res.text()
  } finally {
    clearTimeout(timeout)
  }
}

function checkSchemaOrg(html: string): VerifyResult {
  const blocks = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
  if (!blocks) return { status: 'not_implemented', details: 'Aucun bloc JSON-LD trouvé sur la page.' }
  const hasType = blocks.some(b => /"@type"\s*:/.test(b))
  if (hasType) return { status: 'implemented', details: `${blocks.length} bloc(s) JSON-LD avec @type détecté(s).` }
  return { status: 'partial', details: 'JSON-LD présent mais sans @type défini.' }
}

function checkFaq(html: string): VerifyResult {
  const hasFaqSchema = /"FAQPage"/.test(html) || /"@type"\s*:\s*"FAQPage"/.test(html)
  if (hasFaqSchema) return { status: 'implemented', details: 'Schema FAQPage JSON-LD trouvé.' }
  const hasFaqContent = /\b(faq|questions?\s+fr[ée]quemment|questions?\s+fr[ée]quentes?|accord[eé]on|fr[ée]quently\s+asked)\b/i.test(html)
  if (hasFaqContent) return { status: 'partial', details: 'Contenu FAQ présent mais sans schema JSON-LD structuré.' }
  return { status: 'not_implemented', details: 'Aucune section FAQ détectée sur la page.' }
}

function checkMetaDescription(html: string): VerifyResult {
  const match = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i)
    ?? html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i)
  if (!match) return { status: 'not_implemented', details: 'Meta description absente.' }
  const len = match[1].trim().length
  if (len >= 100) return { status: 'implemented', details: `Meta description présente (${len} caractères).` }
  if (len >= 50) return { status: 'partial', details: `Meta description courte (${len} car., idéal ≥100).` }
  return { status: 'partial', details: `Meta description trop courte (${len} car.).` }
}

function checkOgTags(html: string): VerifyResult {
  const hasTitle = /<meta[^>]*property=["']og:title["'][^>]*>/i.test(html)
  const hasDesc = /<meta[^>]*property=["']og:description["'][^>]*>/i.test(html)
  const hasImage = /<meta[^>]*property=["']og:image["'][^>]*>/i.test(html)
  const found = [hasTitle && 'og:title', hasDesc && 'og:description', hasImage && 'og:image'].filter(Boolean)
  if (found.length === 3) return { status: 'implemented', details: 'Tags Open Graph complets (titre, description, image).' }
  if (found.length > 0) return { status: 'partial', details: `Tags OG partiels : ${found.join(', ')} trouvé(s).` }
  return { status: 'not_implemented', details: 'Aucun tag Open Graph trouvé.' }
}

function checkCanonical(html: string): VerifyResult {
  if (/<link[^>]*rel=["']canonical["'][^>]*>/i.test(html)) {
    return { status: 'implemented', details: 'Tag canonique présent.' }
  }
  return { status: 'not_implemented', details: 'Tag canonique absent.' }
}

function checkStructuredData(html: string): VerifyResult {
  return checkSchemaOrg(html)
}

function checkContent(html: string): VerifyResult {
  // Check for article/blog content signals
  const hasArticle = /"Article"|"BlogPosting"|"NewsArticle"/.test(html)
  if (hasArticle) return { status: 'implemented', details: 'Schema Article/Blog trouvé sur la page.' }
  const hasContentElements = /<article|<main|class=["'][^"']*article[^"']*["']/.test(html)
  if (hasContentElements) return { status: 'partial', details: 'Contenu article présent sans schema JSON-LD Article.' }
  return { status: 'not_implemented', details: 'Aucun contenu article structuré détecté.' }
}

function checkGeneric(html: string): VerifyResult {
  const hasJsonLd = html.includes('application/ld+json')
  const hasMetaDesc = /<meta[^>]*name=["']description["'][^>]*>/i.test(html)
  if (hasJsonLd && hasMetaDesc) return { status: 'implemented', details: 'Données structurées et meta description présentes.' }
  if (hasJsonLd || hasMetaDesc) return { status: 'partial', details: 'Optimisation partielle détectée.' }
  return { status: 'not_implemented', details: 'Aucune optimisation SEO/IA de base détectée.' }
}

const CHECKERS: Record<string, (html: string) => VerifyResult> = {
  schema_org: checkSchemaOrg,
  faq: checkFaq,
  meta_description: checkMetaDescription,
  og_tags: checkOgTags,
  canonical: checkCanonical,
  structured_data: checkStructuredData,
  content: checkContent,
  generic: checkGeneric,
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Données invalides' }, { status: 400 })

  const { actionId, url, actionType } = parsed.data

  // Verify ownership
  const item = await prisma.actionItem.findFirst({
    where: { id: actionId, plan: { userId: session.user.id } },
  })
  if (!item) return NextResponse.json({ error: 'Action introuvable' }, { status: 404 })

  let html: string
  try {
    html = await fetchPageHtml(url)
  } catch {
    return NextResponse.json(
      { error: "Impossible de charger le site. Vérifiez l'URL ou réessayez." },
      { status: 422 }
    )
  }

  const checker = (actionType && CHECKERS[actionType]) ? CHECKERS[actionType] : checkGeneric
  const result = checker(html)

  await prisma.actionItem.update({
    where: { id: actionId },
    data: { verificationStatus: result.status, verifiedAt: new Date() },
  })

  return NextResponse.json({ ...result, verifiedAt: new Date().toISOString() })
}
