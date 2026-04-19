export const dynamic = 'force-dynamic'
import { auth } from '@/lib/auth'
import { markAllRead } from '@/lib/notifications'
import { NextResponse } from 'next/server'

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  await markAllRead(session.user.id)
  return NextResponse.json({ ok: true })
}
