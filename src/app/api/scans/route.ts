export const dynamic = "force-dynamic"
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const brandId = searchParams.get('brandId')
  const take = parseInt(searchParams.get('take') ?? '50', 10)
  const includeResults = searchParams.get('results') === 'true'

  const where = brandId
    ? { brandId, brand: { userId: session.user.id } }
    : { brand: { userId: session.user.id } }

  const scans = await prisma.scan.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take,
    include: {
      brand: { select: { id: true, name: true } },
      results: includeResults ? true : { select: { llm: true, mentioned: true, position: true } },
    },
  })

  return NextResponse.json(scans)
}
