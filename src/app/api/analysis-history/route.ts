export const dynamic = 'force-dynamic'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') ?? undefined
  const brandId = searchParams.get('brandId') ?? undefined
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 50)

  const analyses = await prisma.analysisResult.findMany({
    where: {
      userId: session.user.id,
      ...(type ? { type } : {}),
      ...(brandId ? { brandId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      type: true,
      brandId: true,
      input: true,
      credits: true,
      createdAt: true,
    },
  })

  return NextResponse.json({ analyses })
}
