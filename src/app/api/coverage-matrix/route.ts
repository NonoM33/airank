export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { useCredits, getCredits, getCredits } from '@/lib/credits'
import { prisma } from '@/lib/db'

const schema = z.object({ brandId: z.string() })

const LLMS = [
  { key: 'CHATGPT', label: 'ChatGPT' },
  { key: 'CLAUDE', label: 'Claude' },
  { key: 'PERPLEXITY', label: 'Perplexity' },
  { key: 'GEMINI', label: 'Gemini' },
]

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Données invalides' }, { status: 400 })

  const brand = await prisma.brand.findFirst({
    where: { id: parsed.data.brandId, userId: session.user.id },
    include: {
      scans: {
        take: 20,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          query: true,
          createdAt: true,
          results: {
            select: { llm: true, mentioned: true, position: true },
          },
        },
      },
    },
  })
  if (!brand) return NextResponse.json({ error: 'Marque introuvable' }, { status: 404 })

  // Check credits first but don't debit yet
  const currentCredits = await getCredits(session.user.id)
  if (currentCredits < 2) {
    return NextResponse.json({ error: 'Crédits insuffisants', credits: currentCredits }, { status: 402 })
  }
  }

  const matrix = uniqueScans.slice(0, 10).map(scan => {
    const row: Record<string, unknown> = {
      query: scan.query.slice(0, 70),
      scanDate: scan.createdAt,
    }
    for (const { key } of LLMS) {
      const result = scan.results.find(r => r.llm === key)
      row[key] = result ? { mentioned: result.mentioned, position: result.position } : null
    }
    return row
  })

  return NextResponse.json({ brandName: brand.name, llms: LLMS, matrix })
}
