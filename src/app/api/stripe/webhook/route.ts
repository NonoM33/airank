import { NextResponse } from 'next/server'

export async function POST() {
  // Stripe webhook — Phase 5
  return NextResponse.json({ message: 'Stripe webhook — Phase 5' }, { status: 501 })
}
