export const dynamic = "force-dynamic"
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  brandId: z.string(),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
  }

  const brand = await prisma.brand.findFirst({
    where: { id: parsed.data.brandId, userId: session.user.id },
    include: {
      scans: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { globalScore: true },
      },
    },
  })
  if (!brand) {
    return NextResponse.json({ error: 'Marque introuvable' }, { status: 404 })
  }

  const score = brand.scans[0]?.globalScore ?? 0
  const color = score >= 70 ? '#6366f1' : score >= 40 ? '#f59e0b' : '#ef4444'
  const label = score >= 70 ? 'Excellent' : score >= 40 ? 'Moyen' : 'Faible'

  const html = `<!-- AIRank Badge for ${brand.name} -->
<a href="https://airank.fr" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:8px;background:#141416;border:1px solid #27272a;border-radius:8px;padding:8px 14px;text-decoration:none;font-family:system-ui,sans-serif;">
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="${color}" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>
  </svg>
  <span style="color:#ffffff;font-size:13px;font-weight:600;">Score AIRank</span>
  <span style="background:${color};color:#fff;font-size:13px;font-weight:700;border-radius:5px;padding:2px 7px;">${score}/100</span>
  <span style="color:#71717a;font-size:11px;">${label}</span>
</a>`

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="36" viewBox="0 0 200 36">
  <rect width="200" height="36" rx="6" fill="#141416" stroke="#27272a" stroke-width="1"/>
  <text x="12" y="23" font-family="system-ui" font-size="12" font-weight="600" fill="#ffffff">Score AIRank</text>
  <rect x="118" y="8" width="54" height="20" rx="4" fill="${color}"/>
  <text x="145" y="22" font-family="system-ui" font-size="12" font-weight="700" fill="#ffffff" text-anchor="middle">${score}/100</text>
</svg>`

  return NextResponse.json({ score, brandName: brand.name, html, svg })
}
