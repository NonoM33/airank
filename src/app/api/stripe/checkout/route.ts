import { NextResponse } from 'next/server'

export async function POST() {
  // Stripe checkout — Phase 5
  return NextResponse.json({ message: 'Stripe checkout — Phase 5' }, { status: 501 })
}
