import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

// Admin endpoint to sync plan - protected by secret
export async function POST(req: Request) {
  const { userId, plan, stripeId, secret } = await req.json()
  
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { 
      plan: plan as 'FREE' | 'STARTER' | 'PRO' | 'AGENCY',
      ...(stripeId ? { stripeId } : {}),
    },
  })

  return NextResponse.json({ id: user.id, plan: user.plan, email: user.email })
}
