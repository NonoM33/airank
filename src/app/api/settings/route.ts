export const dynamic = "force-dynamic"
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const brands = await prisma.brand.findMany({
    where: { userId: session.user.id },
    include: { competitors: true, _count: { select: { scans: true } } },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(brands)
}
