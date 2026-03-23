export const dynamic = "force-dynamic"
import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { useCredits, getCredits } from '@/lib/credits'
import { scanBrand } from '@/lib/scanner'

const schema = z.object({
  brand1: z.string().min(1).max(100),
  brand2: z.string().min(1).max(100),
  query: z.string().min(5).max(300),
})

const HEAD_TO_HEAD_COST = 2

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

  const { brand1, brand2, query } = parsed.data

  // Check credits first but don't debit yet
  const currentCredits = await getCredits(session.user.id)
  if (currentCredits < HEAD_TO_HEAD_COST) {
    return NextResponse.json({ error: 'Crédits insuffisants', credits: currentCredits }, { status: 402 })
  }

  const [results1, results2] = await Promise.all([
    scanBrand(brand1, query),
    scanBrand(brand2, query),
  ])

  const llms = ['CHATGPT', 'CLAUDE', 'PERPLEXITY', 'GEMINI'] as const

  const comparison = llms.map((llm) => {
    const r1 = results1.find((r) => r.llm === llm)
    const r2 = results2.find((r) => r.llm === llm)
    return {
      llm,
      brand1: r1 ? { mentioned: r1.mentioned, position: r1.position, sentiment: r1.sentiment, score: scoreResult(r1) } : null,
      brand2: r2 ? { mentioned: r2.mentioned, position: r2.position, sentiment: r2.sentiment, score: scoreResult(r2) } : null,
    }
  })

  const score1 = Math.round(results1.reduce((s, r) => s + scoreResult(r), 0) / Math.max(results1.length, 1))
  const score2 = Math.round(results2.reduce((s, r) => s + scoreResult(r), 0) / Math.max(results2.length, 1))

  await useCredits(session.user.id, HEAD_TO_HEAD_COST, 'head_to_head', `${brand1} vs ${brand2}`)
  return NextResponse.json({ brand1, brand2, query, comparison, score1, score2 })
}

function scoreResult(r: { mentioned: boolean; position: number | null; sentiment: string | null }): number {
  if (!r.mentioned) return 0
  const posScore = r.position ? Math.max(0, 100 - (r.position - 1) * 20) : 60
  const sentBonus = r.sentiment === 'POSITIVE' ? 10 : r.sentiment === 'NEGATIVE' ? -10 : 0
  return Math.min(100, Math.max(0, posScore + sentBonus))
}
