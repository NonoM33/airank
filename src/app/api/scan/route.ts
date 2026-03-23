export const dynamic = "force-dynamic"
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { scanBrand } from '@/lib/scanner'
import { calculateGlobalScore } from '@/lib/analysis'
import { useCredits, getCredits, CREDIT_COSTS } from '@/lib/credits'
import { calculateLLMScore } from '@/lib/analysis'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const brandId = searchParams.get('brandId')

  const scans = await prisma.scan.findMany({
    where: {
      brand: { userId: session.user.id },
      ...(brandId ? { brandId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: { results: true },
  })

  return NextResponse.json({ scans })
}

const scanSchema = z.object({
  brandId: z.string(),
  query: z.string().min(1).max(500),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = scanSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { brandId, query } = parsed.data

  const brand = await prisma.brand.findFirst({
    where: { id: brandId, userId: session.user.id },
  })
  if (!brand) {
    return NextResponse.json({ error: 'Marque introuvable' }, { status: 404 })
  }

  const ok = await useCredits(session.user.id, CREDIT_COSTS.scan, 'scan', `Scan ${brand.name}`)
  if (!ok) {
    const credits = await getCredits(session.user.id)
    return NextResponse.json({ error: 'Crédits insuffisants', credits }, { status: 402 })
  }

  const results = await scanBrand(brand.name, query)
  if (results.length === 0) {
    return NextResponse.json(
      { error: 'Aucun LLM disponible. Vérifiez vos clés API.' },
      { status: 503 }
    )
  }

  const globalScore = calculateGlobalScore(results)

  const scan = await prisma.scan.create({
    data: {
      brandId,
      query,
      globalScore,
      results: {
        create: results.map((r) => ({
          llm: r.llm,
          mentioned: r.mentioned,
          position: r.position,
          context: r.context,
          sentiment: r.sentiment,
          competitors: JSON.stringify(r.competitors),
          rawResponse: r.rawResponse,
          score: calculateLLMScore(r),
        })),
      },
    },
    include: { results: true },
  })

  return NextResponse.json({ scan })
}
