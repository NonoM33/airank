export const dynamic = "force-dynamic"
import { NextResponse } from 'next/server'
import { getQueriesForSector, getAllSectors } from '@/lib/query-bank'

// GET /api/query-bank?sector=saas
// Public — no auth needed (used in landing + onboarding)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const sector = searchParams.get('sector')

  if (!sector) {
    // Return all sectors if no sector specified
    const sectors = getAllSectors()
    return NextResponse.json({ sectors })
  }

  const queries = getQueriesForSector(sector)
  return NextResponse.json({ queries, sector })
}
