export const dynamic = "force-dynamic"
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { queryOpenRouter } from '@/lib/scanner/openrouter'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { useCredits, getCredits } from '@/lib/credits'

const schema = z.object({
  brandId: z.string(),
})

const ACTION_PLAN_COST = 3

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

  const brand = await prisma.brand.findFirst({
    where: { id: parsed.data.brandId, userId: session.user.id },
  })
  if (!brand) {
    return NextResponse.json({ error: 'Marque introuvable' }, { status: 404 })
  }

  // Check credits first but don't debit yet
  const currentCredits = await getCredits(session.user.id)
  if (currentCredits < ACTION_PLAN_COST) {
    return NextResponse.json({ error: 'Crédits insuffisants', credits: currentCredits }, { status: 402 })
  }

  const keywords = (() => { try { return JSON.parse(brand.keywords) } catch { return [] } })()

  // Fetch recent scan data for personalized recommendations
  const recentScans = await prisma.scan.findMany({
    where: { brandId: brand.id },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { results: true },
  })

  const scanContext = recentScans.length > 0
    ? `\nDonnées de scan réelles pour ${brand.name}:\n${recentScans.map(s => {
        const mentioned = s.results.filter(r => r.mentioned).length
        const avgScore = s.results.length ? Math.round(s.results.reduce((a, r) => a + r.score, 0) / s.results.length) : 0
        const notMentionedLLMs = s.results.filter(r => !r.mentioned).map(r => r.llm).join(', ')
        return `- Requête "${s.query}": score global ${s.globalScore}/100, mentionné par ${mentioned}/${s.results.length} LLMs${notMentionedLLMs ? `, absent chez ${notMentionedLLMs}` : ''}`
      }).join('\n')}`
    : ''

  const prompt = `Tu es un expert en visibilité IA (ChatGPT, Claude, Gemini, Perplexity).
Génère un plan d'action sur 30 jours pour améliorer la visibilité de la marque "${brand.name}"${brand.sector ? ` dans le secteur "${brand.sector}"` : ''}.
${keywords.length ? `Mots-clés cibles: ${keywords.slice(0, 5).join(', ')}.` : ''}${scanContext}

Génère 8 à 10 actions CONCRÈTES et PERSONNALISÉES basées sur les données ci-dessus.
Réponds UNIQUEMENT avec un tableau JSON valide (sans markdown, sans commentaires):
[
  {
    "title": "Titre court de l'action",
    "description": "Description complète et actionnable en 2-3 phrases expliquant pourquoi c'est important pour cette marque.",
    "impact": "high|medium|low",
    "difficulty": "easy|medium|hard",
    "dayOffset": 1,
    "estimatedTime": "2h",
    "actionType": "schema_org|faq|meta_description|og_tags|canonical|structured_data|content|generic",
    "steps": [
      "Étape 1 concrète et précise",
      "Étape 2 concrète et précise",
      "Étape 3 concrète et précise"
    ],
    "codeSnippet": "Code JSON-LD ou HTML si applicable (null sinon)"
  }
]
Les dayOffset doivent être répartis sur 30 jours. L'actionType doit correspondre au type de vérification automatique possible sur le site web.`

  try {
    const raw = await queryOpenRouter('google/gemini-2.0-flash-lite-001', prompt)
    const jsonMatch = raw.match(/\[[\s\S]*\]/)
    if (!jsonMatch) throw new Error('No JSON array in response')
    const items: Array<{
      title: string
      description: string
      impact: string
      difficulty: string
      dayOffset: number
      estimatedTime?: string
      actionType?: string
      steps?: string[]
      codeSnippet?: string
    }> = JSON.parse(jsonMatch[0])

    const now = new Date()
    const plan = await prisma.actionPlan.create({
      data: {
        userId: session.user.id,
        brandId: brand.id,
        items: {
          create: items.map((item) => ({
            title: item.title,
            description: item.description,
            impact: item.impact ?? 'medium',
            difficulty: item.difficulty ?? 'medium',
            dueDate: new Date(now.getTime() + (item.dayOffset ?? 7) * 86400000),
            steps: JSON.stringify(Array.isArray(item.steps) ? item.steps : []),
            codeSnippet: item.codeSnippet ?? null,
            estimatedTime: item.estimatedTime ?? null,
            actionType: item.actionType ?? null,
          })),
        },
      },
      include: { items: true },
    })

    return NextResponse.json(plan)
  } catch {
    return NextResponse.json({ error: 'Génération impossible. Réessayez.' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const brandId = searchParams.get('brandId')
  if (!brandId) return NextResponse.json({ error: 'brandId requis' }, { status: 400 })

  const plan = await prisma.actionPlan.findFirst({
    where: { userId: session.user.id, brandId },
    orderBy: { createdAt: 'desc' },
    include: { items: { orderBy: { dueDate: 'asc' } } },
  })

  return NextResponse.json(plan ?? null)
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { itemId, done } = await req.json().catch(() => ({}))
  if (!itemId || typeof done !== 'boolean') {
    return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
  }

  const item = await prisma.actionItem.findFirst({
    where: { id: itemId, plan: { userId: session.user.id } },
  })
  if (!item) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  const updated = await prisma.actionItem.update({
    where: { id: itemId },
    data: { done },
  })
  return NextResponse.json(updated)
}
