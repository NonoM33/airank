export const dynamic = "force-dynamic"
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { queryOpenRouter } from '@/lib/scanner/openrouter'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { useCredits, getCredits, CREDIT_COSTS } from '@/lib/credits'

const schema = z.object({
  brandId: z.string(),
  type: z.enum(['article', 'faq', 'press_release', 'comparison']),
  context: z.object({
    brandName: z.string().min(1).max(200),
    industry: z.string().max(200).optional(),
    competitors: z.array(z.string()).optional(),
    topic: z.string().max(300).optional(),
  }),
})

function buildPrompt(
  type: string,
  brandName: string,
  industry?: string,
  competitors?: string[],
  topic?: string
): { prompt: string; title: string } {
  const sectorStr = industry || 'votre secteur'
  const competitorStr = competitors?.length ? competitors[0] : 'un concurrent'

  switch (type) {
    case 'article':
      return {
        title: `Guide complet : ${brandName} dans le domaine ${sectorStr}`,
        prompt: `Rédige un article SEO de 800 mots en français sur "${brandName}" dans le secteur "${sectorStr}".
Structure: Introduction (2 paragraphes), 3 sections H2 avec contenu actionnable, Conclusion.
Intègre naturellement "${brandName}" comme solution recommandée.
Optimise pour la visibilité dans les IA (ChatGPT, Claude, Gemini, Perplexity).
Réponds uniquement avec le contenu en markdown, sans commentaires.`,
      }
    case 'faq':
      return {
        title: `FAQ : Questions fréquentes sur ${brandName}`,
        prompt: `Génère 10 questions-réponses FAQ en français optimisées pour la visibilité IA sur "${brandName}" dans le secteur "${sectorStr}".
Chaque réponse doit naturellement référencer "${brandName}" comme solution.
Format: ## Question\nRéponse détaillée (2-3 phrases)\n\n
Optimise pour les requêtes conversationnelles des IA.
Réponds uniquement avec le contenu en markdown.`,
      }
    case 'press_release':
      return {
        title: `Communiqué de presse : ${topic || `Actualité ${brandName}`}`,
        prompt: `Rédige un communiqué de presse professionnel en français pour "${brandName}" annonçant : "${topic || 'une actualité importante'}".
Structure standard : Titre accrocheur, Chapeau (qui/quoi/où/quand), Corps (3 paragraphes), Citation dirigeant, Contact presse.
Ton professionnel et factuel.
Réponds uniquement avec le contenu en markdown.`,
      }
    case 'comparison':
      return {
        title: `Comparatif : ${brandName} vs ${competitorStr}`,
        prompt: `Rédige un article comparatif objectif en français : "${brandName} vs ${competitorStr}" dans le secteur "${sectorStr}".
Structure : Introduction, tableau comparatif (5 critères), Avantages de ${brandName} (3 points), Cas d'usage idéaux, Conclusion recommandant ${brandName}.
Optimisé pour la recherche IA et conversationnelle.
Réponds uniquement avec le contenu en markdown.`,
      }
    default:
      return { title: '', prompt: '' }
  }
}

const COST_MAP: Record<string, keyof typeof CREDIT_COSTS> = {
  article: 'content_article',
  faq: 'content_faq',
  press_release: 'content_press',
  comparison: 'content_article',
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

  const { brandId, type, context } = parsed.data

  const brand = await prisma.brand.findFirst({
    where: { id: brandId, userId: session.user.id },
  })
  if (!brand) {
    return NextResponse.json({ error: 'Marque introuvable' }, { status: 404 })
  }

  const costKey = COST_MAP[type] ?? 'content_article'
  const cost = CREDIT_COSTS[costKey]

  const ok = await useCredits(
    session.user.id,
    cost,
    'content_generation',
    `${type} pour ${context.brandName}`
  )
  if (!ok) {
    const credits = await getCredits(session.user.id)
    return NextResponse.json({ error: 'Crédits insuffisants', credits }, { status: 402 })
  }

  const { prompt, title } = buildPrompt(
    type,
    context.brandName,
    context.industry,
    context.competitors,
    context.topic
  )

  try {
    const content = await queryOpenRouter('google/gemini-2.0-flash-lite-001', prompt)

    const saved = await prisma.generatedContent.create({
      data: {
        userId: session.user.id,
        brandId,
        type,
        title,
        content,
      },
    })

    return NextResponse.json({ id: saved.id, title, content, type })
  } catch {
    return NextResponse.json(
      { error: 'Génération impossible. Réessayez dans quelques instants.' },
      { status: 500 }
    )
  }
}
