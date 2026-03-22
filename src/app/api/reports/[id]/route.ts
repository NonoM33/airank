export const dynamic = "force-dynamic"
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { ReportDocument } from '@/lib/pdf/report-document'
import { getPlanLimits } from '@/lib/plan-limits'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const plan = session.user.plan ?? 'FREE'
  const limits = getPlanLimits(plan)
  if (!limits.pdfExport) {
    return NextResponse.json({ error: 'Fonctionnalité réservée au plan Pro+' }, { status: 403 })
  }

  const { id: brandId } = await params

  const brand = await prisma.brand.findFirst({
    where: { id: brandId, userId: session.user.id },
  })
  if (!brand) {
    return NextResponse.json({ error: 'Marque introuvable' }, { status: 404 })
  }

  const scans = await prisma.scan.findMany({
    where: { brandId },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { results: true },
  })

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(React.createElement(ReportDocument, { brand, scans }) as any)

    const filename = `rapport-${brand.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('PDF generation error:', err)
    return NextResponse.json({ error: 'Erreur lors de la génération du PDF' }, { status: 500 })
  }
}
