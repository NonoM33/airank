export const dynamic = 'force-dynamic'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getPlanLimits } from '@/lib/plan-data'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { sanitizeCss } from '@/lib/css-sanitizer'

const schema = z.object({
  companyName: z.string().max(100).optional().nullable(),
  logoUrl: z.string().url().optional().nullable(),
  faviconUrl: z.string().url().optional().nullable(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
  customDomain: z.string().max(255).optional().nullable(),
  supportEmail: z.string().email().optional().nullable(),
  footerText: z.string().max(500).optional().nullable(),
  hideAirankBranding: z.boolean().optional(),
  customCss: z.string().max(10000).optional().nullable().transform((v) => (v ? sanitizeCss(v) : v)),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  const config = await prisma.whiteLabelConfig.findUnique({
    where: { userId: session.user.id },
  })
  return NextResponse.json(config ?? {})
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { plan: true },
  })
  const limits = getPlanLimits(user?.plan ?? 'FREE')
  if (!limits.whiteLabel) {
    return NextResponse.json(
      { error: 'White-label réservé au plan Agency', upgrade: true },
      { status: 402 }
    )
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const config = await prisma.whiteLabelConfig.upsert({
    where: { userId: session.user.id },
    update: parsed.data,
    create: { userId: session.user.id, ...parsed.data },
  })

  return NextResponse.json(config)
}
