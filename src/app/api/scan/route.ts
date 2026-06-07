export const dynamic = "force-dynamic"
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { scanBrand } from '@/lib/scanner'
import { calculateGlobalScore } from '@/lib/analysis'
import { useCredits, getCredits, CREDIT_COSTS } from '@/lib/credits'
import { calculateLLMScore } from '@/lib/analysis'
import { extractCitations } from '@/lib/citations'
import { dispatchWebhook } from '@/lib/webhook-dispatcher'
import { createNotification } from '@/lib/notifications'
import { analyzeSentiment } from '@/lib/sentiment'

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

  // Cache: never charge twice for the same brand+query within 24h. Return the
  // existing scan for free (results are deterministic, so this is also correct).
  const CACHE_WINDOW_MS = 24 * 60 * 60 * 1000
  const cached = await prisma.scan.findFirst({
    where: {
      brandId,
      query,
      createdAt: { gte: new Date(Date.now() - CACHE_WINDOW_MS) },
    },
    orderBy: { createdAt: 'desc' },
    include: { results: true },
  })
  if (cached) {
    return NextResponse.json({ scan: cached, cached: true })
  }

  // Check credits first but don't debit yet
  const currentCredits = await getCredits(session.user.id)
  if (currentCredits < CREDIT_COSTS.scan) {
    return NextResponse.json({ error: 'Crédits insuffisants', credits: currentCredits }, { status: 402 })
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
      llmCount: results.length,
      results: {
        create: results.map((r) => {
          const nuanced = r.mentioned ? analyzeSentiment(r.context ?? r.rawResponse) : null
          return {
            llm: r.llm,
            mentioned: r.mentioned,
            position: r.position,
            context: r.context,
            sentiment: nuanced?.bucket ?? r.sentiment,
            sentimentScore: nuanced?.score ?? null,
            sentimentTone: nuanced?.tone ?? null,
            competitors: JSON.stringify(r.competitors),
            rawResponse: r.rawResponse,
            score: calculateLLMScore(r),
          }
        }),
      },
    },
    include: { results: true },
  })

  // Extract & persist citations per scan result
  for (const res of scan.results) {
    const cits = extractCitations(res.rawResponse)
    if (cits.length > 0) {
      await prisma.citation.createMany({
        data: cits.map((c) => ({
          scanResultId: res.id,
          sourceUrl: c.sourceUrl,
          sourceDomain: c.sourceDomain,
          sourceTitle: c.sourceTitle,
          position: c.position,
        })),
      })
    }
  }

  await useCredits(session.user.id, CREDIT_COSTS.scan, 'scan', `Scan ${brand.name}`)

  // Fire-and-forget: webhook + notification
  void dispatchWebhook(session.user.id, 'scan.completed', {
    scanId: scan.id,
    brandId,
    brandName: brand.name,
    query,
    globalScore,
    llmCount: scan.results.length,
  })
  void createNotification(session.user.id, {
    type: 'SCAN_COMPLETED',
    title: `Scan terminé — ${brand.name}`,
    body: `Score global : ${globalScore}/100 sur "${query}"`,
    link: `/scans/${scan.id}`,
    iconKey: 'search',
  })

  return NextResponse.json({ scan })
}
