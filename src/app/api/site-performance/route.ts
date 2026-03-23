export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { useCredits, getCredits } from '@/lib/credits'
import { prisma } from '@/lib/db'

const PSI_BASE = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'

const COST = 1

async function fetchPSI(url: string, strategy: 'mobile' | 'desktop') {
  const apiUrl = `${PSI_BASE}?url=${encodeURIComponent(url)}&strategy=${strategy}&category=performance`
  const res = await fetch(apiUrl, { signal: AbortSignal.timeout(35000) })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`PSI ${res.status}: ${text.slice(0, 300)}`)
  }
  return res.json()
}

function extractMetrics(data: any) {
  const lr = data?.lighthouseResult
  const score = Math.round((lr?.categories?.performance?.score ?? 0) * 100)
  const audits = lr?.audits ?? {}

  const opportunities = (Object.values(audits) as any[])
    .filter((a) => a?.details?.type === 'opportunity' && (a?.numericValue ?? 0) > 500)
    .map((a) => ({
      id: a.id as string,
      title: a.title as string,
      displayValue: (a.displayValue as string | null) ?? null,
      savingsMs: Math.round(a.numericValue ?? 0),
    }))
    .sort((a, b) => b.savingsMs - a.savingsMs)
    .slice(0, 6)

  return {
    score,
    fcp: (audits['first-contentful-paint']?.displayValue as string | null) ?? null,
    fcpMs: (audits['first-contentful-paint']?.numericValue as number | null) ?? null,
    lcp: (audits['largest-contentful-paint']?.displayValue as string | null) ?? null,
    lcpMs: (audits['largest-contentful-paint']?.numericValue as number | null) ?? null,
    cls: (audits['cumulative-layout-shift']?.displayValue as string | null) ?? null,
    clsValue: (audits['cumulative-layout-shift']?.numericValue as number | null) ?? null,
    tbt: (audits['total-blocking-time']?.displayValue as string | null) ?? null,
    tbtMs: (audits['total-blocking-time']?.numericValue as number | null) ?? null,
    speedIndex: (audits['speed-index']?.displayValue as string | null) ?? null,
    speedIndexMs: (audits['speed-index']?.numericValue as number | null) ?? null,
    opportunities,
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  if (!body?.url || typeof body.url !== 'string') {
    return NextResponse.json({ error: 'URL invalide' }, { status: 400 })
  }

  let url = body.url.trim()
  if (!url.startsWith('http')) url = 'https://' + url

  const inputKey = { url }

  // Check cache first (< 24h)
  const cached = await prisma.analysisResult.findFirst({
    where: {
      userId: session.user.id,
      type: 'site_performance',
      input: { equals: inputKey },
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    orderBy: { createdAt: 'desc' },
  })
  if (cached) {
    return NextResponse.json({ ...(cached.result as object), cached: true, cachedAt: cached.createdAt })
  }

  const currentCredits = await getCredits(session.user.id)
  if (currentCredits < COST) {
    return NextResponse.json({ error: 'Crédits insuffisants', credits: currentCredits }, { status: 402 })
  }

  try {
    const [mobileData, desktopData] = await Promise.all([
      fetchPSI(url, 'mobile'),
      fetchPSI(url, 'desktop'),
    ])
    await useCredits(session.user.id, COST, 'site_performance', url)
    const resultData = {
      url,
      mobile: extractMetrics(mobileData),
      desktop: extractMetrics(desktopData),
    }
    await prisma.analysisResult.create({
      data: {
        userId: session.user.id,
        type: 'site_performance',
        input: inputKey,
        result: resultData,
        credits: COST,
      },
    })
    return NextResponse.json(resultData)
  } catch {
    return NextResponse.json(
      { error: "Impossible d'analyser ce site. Vérifiez l'URL et réessayez." },
      { status: 422 }
    )
  }
}
