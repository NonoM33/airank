import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).max(100),
  domain: z.string().optional(),
  keywords: z.array(z.string()).default([]),
})

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { id } = await params
  const brand = await prisma.brand.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!brand) {
    return NextResponse.json({ error: 'Marque introuvable' }, { status: 404 })
  }

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { name, domain, keywords } = parsed.data
  const updated = await prisma.brand.update({
    where: { id },
    data: { name, domain: domain ?? null, keywords: JSON.stringify(keywords) },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { id } = await params
  const brand = await prisma.brand.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!brand) {
    return NextResponse.json({ error: 'Marque introuvable' }, { status: 404 })
  }

  // Delete related data first
  await prisma.scanResult.deleteMany({ where: { scan: { brandId: id } } })
  await prisma.scan.deleteMany({ where: { brandId: id } })
  await prisma.competitor.deleteMany({ where: { brandId: id } })
  await prisma.brand.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
