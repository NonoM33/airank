import { NextResponse } from 'next/server'
import { z } from 'zod'

const freeScanSchema = z.object({
  brand: z.string().min(1).max(100),
})

export async function POST(req: Request) {
  const body = await req.json()
  const parsed = freeScanSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  // Free scan implementation in Phase 2
  return NextResponse.json({ message: 'Scan gratuit — Phase 2' }, { status: 501 })
}
