export const dynamic = "force-dynamic"
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

const LLM_LIST = ['CHATGPT', 'CLAUDE', 'PERPLEXITY', 'GEMINI'] as const

type LLMDiff = {
  llm: string
  scoreA: number | null
  scoreB: number | null
  delta: number | null
  mentionedA: boolean
  mentionedB: boolean
}

// GET /api/compare?scanId1=xxx&scanId2=yyy
// Auth required, PRO+ only
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const plan = (session.user as { plan?: string }).plan ?? 'FREE'
  if (plan !== 'PRO' && plan !== 'AGENCY') {
    return NextResponse.json({ error: 'Fonctionnalité réservée au plan PRO ou AGENCY' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const scanId1 = searchParams.get('scanId1')
  const scanId2 = searchParams.get('scanId2')

  if (!scanId1 || !scanId2) {
    return NextResponse.json({ error: 'Paramètres scanId1 et scanId2 requis' }, { status: 400 })
  }

  // Fetch both scans, ensuring they belong to the authenticated user
  const [scan1, scan2] = await Promise.all([
    prisma.scan.findUnique({
      where: { id: scanId1 },
      include: { results: true, brand: { select: { userId: true } } },
    }),
    prisma.scan.findUnique({
      where: { id: scanId2 },
      include: { results: true, brand: { select: { userId: true } } },
    }),
  ])

  if (!scan1 || scan1.brand.userId !== session.user.id) {
    return NextResponse.json({ error: 'Scan 1 introuvable' }, { status: 404 })
  }

  if (!scan2 || scan2.brand.userId !== session.user.id) {
    return NextResponse.json({ error: 'Scan 2 introuvable' }, { status: 404 })
  }

  // Compute per-LLM diff
  const diff: LLMDiff[] = LLM_LIST.map((llm) => {
    const rA = scan1.results.find((r) => r.llm === llm) ?? null
    const rB = scan2.results.find((r) => r.llm === llm) ?? null

    const scoreA = rA?.mentioned ? rA.score : null
    const scoreB = rB?.mentioned ? rB.score : null
    const delta = scoreA !== null && scoreB !== null ? scoreB - scoreA : null

    return {
      llm,
      scoreA,
      scoreB,
      delta,
      mentionedA: rA?.mentioned ?? false,
      mentionedB: rB?.mentioned ?? false,
    }
  })

  // Strip internal brand relation before returning
  const { brand: _brand1, ...scan1Data } = scan1
  const { brand: _brand2, ...scan2Data } = scan2

  return NextResponse.json({ scan1: scan1Data, scan2: scan2Data, diff })
}
