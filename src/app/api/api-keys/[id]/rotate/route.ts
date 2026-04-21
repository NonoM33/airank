export const dynamic = 'force-dynamic'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { generateApiKey } from '@/lib/api-auth'
import { NextResponse } from 'next/server'

/**
 * POST /api/api-keys/{id}/rotate
 * Generates a new key value with the same name/scopes and revokes the old one.
 * Returns the new raw key ONCE — caller must save it.
 */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { id } = await ctx.params
  const existing = await prisma.apiKey.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!existing) return NextResponse.json({ error: 'Clé introuvable' }, { status: 404 })

  const { raw, hash, prefix } = generateApiKey()

  // Atomically: deactivate old, create new. Keep old row for audit (active=false).
  const [, created] = await prisma.$transaction([
    prisma.apiKey.update({
      where: { id: existing.id },
      data: { active: false },
    }),
    prisma.apiKey.create({
      data: {
        userId: session.user.id,
        name: `${existing.name} (rotated)`,
        keyHash: hash,
        keyPrefix: prefix,
        scopes: existing.scopes,
        expiresAt: existing.expiresAt,
      },
      select: { id: true, name: true, keyPrefix: true, createdAt: true },
    }),
  ])

  return NextResponse.json({ ...created, key: raw })
}
