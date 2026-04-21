export const dynamic = 'force-dynamic'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getPlanLimits } from '@/lib/plan-data'
import { NextResponse } from 'next/server'
import dns from 'node:dns/promises'

const TARGET_CNAME = 'custom.airank.ai'

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { plan: true, whiteLabelConfig: { select: { customDomain: true } } },
  })
  const limits = getPlanLimits(user?.plan ?? 'FREE')
  if (!limits.whiteLabel) {
    return NextResponse.json(
      { error: 'Marque blanche réservée au plan Agency', upgrade: true },
      { status: 402 }
    )
  }

  const domain = user?.whiteLabelConfig?.customDomain
  if (!domain) {
    return NextResponse.json(
      { error: 'Aucun domaine configuré — renseignez customDomain dans les réglages' },
      { status: 400 }
    )
  }

  // Validate syntactically first
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) {
    return NextResponse.json(
      { verified: false, reason: 'Domaine invalide' },
      { status: 400 }
    )
  }

  let cnames: string[] = []
  try {
    cnames = await dns.resolveCname(domain)
  } catch (err) {
    console.error('[verify-domain] CNAME resolution failed for', domain, err)
    return NextResponse.json(
      {
        verified: false,
        reason: 'Aucun CNAME trouvé. Ajoutez un enregistrement pointant vers ' + TARGET_CNAME,
        expected: TARGET_CNAME,
      },
      { status: 200 }
    )
  }

  const match = cnames.some((c) => c.replace(/\.$/, '').toLowerCase() === TARGET_CNAME)
  if (!match) {
    return NextResponse.json(
      {
        verified: false,
        reason: `Le CNAME actuel (${cnames.join(', ')}) ne pointe pas vers ${TARGET_CNAME}`,
        expected: TARGET_CNAME,
      },
      { status: 200 }
    )
  }

  await prisma.whiteLabelConfig.update({
    where: { userId: session.user.id },
    data: { customDomainVerified: true },
  })

  return NextResponse.json({ verified: true, domain, cname: TARGET_CNAME })
}
