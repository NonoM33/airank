export const dynamic = "force-dynamic"
import { auth } from '@/lib/auth'
import { getPlanLimits } from '@/lib/plan-limits'
import { queryOpenRouter } from '@/lib/scanner/openrouter'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { useCredits, getCredits, CREDIT_COSTS } from '@/lib/credits'
import { prisma } from '@/lib/db'

const schema = z.object({
  competitorName: z.string().min(1).max(200),
  brandName: z.string().min(1).max(200),
  industry: z.string().max(200).optional(),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const plan = (session.user as { plan?: string }).plan ?? 'FREE'
  const limits = getPlanLimits(plan)
  if (limits.competitors === 0) {
    return NextResponse.json(
      { error: 'Analyse concurrentielle disponible avec le plan Pro' },
      { status: 403 }
    )
  }

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
  }

  const { competitorName, brandName, industry } = parsed.data
  const COST = CREDIT_COSTS.competitor_analysis
  const inputKey = { competitorName, brandName, industry: industry ?? null }

  // Check cache first (< 24h)
  const cached = await prisma.analysisResult.findFirst({
    where: {
      userId: session.user.id,
      type: 'competitor_analysis',
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

  const industryStr = industry || 'votre secteur'

  const prompt = `Analyse concurrentielle: ${competitorName} vs ${brandName} dans le secteur ${industryStr}.
Réponds en JSON avec exactement ces champs:
- strengths: tableau de 3 forces de ${competitorName} qui expliquent sa visibilité IA
- weaknesses: tableau de 3 faiblesses exploitables par ${brandName}
- contentGaps: tableau de 3 types de contenu que ${brandName} devrait créer pour rivaliser
- actionPlan: tableau de 5 actions concrètes ordonnées par priorité pour dépasser ${competitorName}
- estimatedTimeToOutrank: estimation réaliste du temps pour dépasser ce concurrent (ex: "3-6 mois")

Réponds UNIQUEMENT avec le JSON valide, sans markdown, sans commentaires, sans texte autour.`

  try {
    const response = await queryOpenRouter('google/gemini-2.0-flash-lite-001', prompt)
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')
    const data = JSON.parse(jsonMatch[0])
    await useCredits(session.user.id, COST, 'competitor_analysis', `Analyse ${competitorName}`)
    await prisma.analysisResult.create({
      data: {
        userId: session.user.id,
        type: 'competitor_analysis',
        input: inputKey,
        result: data,
        credits: COST,
      },
    })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      { error: 'Analyse impossible. Réessayez dans quelques instants.' },
      { status: 500 }
    )
  }
}
