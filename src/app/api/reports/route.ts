export const dynamic = "force-dynamic"
import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  // PDF report generation — Phase 4
  return NextResponse.json({ message: 'Rapports PDF — Phase 4' }, { status: 501 })
}
