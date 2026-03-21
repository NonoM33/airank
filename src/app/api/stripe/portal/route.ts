import { NextResponse } from 'next/server'

export async function POST() {
  // Stripe portal — Phase 5
  return NextResponse.json({ message: 'Stripe portal — Phase 5' }, { status: 501 })
}
