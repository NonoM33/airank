import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const scanSchema = z.object({
  brandId: z.string(),
  query: z.string().min(1).max(500),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = scanSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  // Scanner implementation in Phase 2
  return NextResponse.json({ message: 'Scanner — Phase 2' }, { status: 501 })
}
