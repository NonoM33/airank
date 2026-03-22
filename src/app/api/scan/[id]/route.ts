export const dynamic = "force-dynamic"
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { id } = await params

  const scan = await prisma.scan.findUnique({
    where: { id },
    include: {
      results: true,
      brand: true,
    },
  })

  if (!scan || scan.brand.userId !== session.user.id) {
    return NextResponse.json({ error: 'Scan introuvable' }, { status: 404 })
  }

  return NextResponse.json(scan)
}
