export const dynamic = 'force-dynamic'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  language: z.enum(['fr', 'en', 'es', 'de']),
})

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Langue invalide' }, { status: 400 })

  await prisma.user.update({
    where: { id: session.user.id },
    data: { language: parsed.data.language },
  })

  return NextResponse.json({ ok: true })
}
