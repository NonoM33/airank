export const dynamic = 'force-dynamic'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const onboardingSchema = z.object({
  completed: z.boolean(),
  step: z.number().int().min(0).max(3),
  sector: z.string().optional(),
  brandName: z.string().optional(),
  brandDomain: z.string().optional(),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = onboardingSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { completed, step, sector } = parsed.data

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      onboardingCompleted: completed,
      onboardingStep: step,
      ...(sector !== undefined ? { sector } : {}),
    },
  })

  return NextResponse.json({ ok: true })
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      onboardingCompleted: true,
      onboardingStep: true,
      sector: true,
    },
  })

  return NextResponse.json(user)
}
