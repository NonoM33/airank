export const dynamic = 'force-dynamic'
import { createHmac } from 'crypto'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

// Retries pending webhook deliveries with exponential backoff.
// Max 3 attempts before marking as permanently failed.
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const pending = await prisma.webhookDelivery.findMany({
    where: {
      status: 'retrying',
      attemptCount: { lt: 3 },
      nextAttemptAt: { lte: new Date() },
    },
    take: 50,
  })

  const results = await Promise.allSettled(
    pending.map(async (d) => {
      const wh = await prisma.webhookConfig.findUnique({ where: { id: d.webhookId } })
      if (!wh || !wh.active) {
        await prisma.webhookDelivery.update({
          where: { id: d.id },
          data: { status: 'failed', error: 'webhook config missing' },
        })
        return
      }

      const body = JSON.stringify(d.payload)
      const signature = createHmac('sha256', wh.secret).update(body).digest('hex')

      try {
        const res = await fetch(wh.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-AIRank-Signature': signature,
            'X-AIRank-Event': d.event,
            'X-AIRank-Retry': String(d.attemptCount + 1),
          },
          body,
        })

        const attempt = d.attemptCount + 1
        if (res.ok) {
          await prisma.webhookDelivery.update({
            where: { id: d.id },
            data: {
              status: 'success',
              statusCode: res.status,
              attemptCount: attempt,
              lastAttemptAt: new Date(),
            },
          })
        } else if (attempt >= 3) {
          await prisma.webhookDelivery.update({
            where: { id: d.id },
            data: {
              status: 'failed',
              statusCode: res.status,
              attemptCount: attempt,
              lastAttemptAt: new Date(),
            },
          })
        } else {
          // Exponential backoff: 5min, 15min, 45min
          const delayMs = Math.pow(3, attempt) * 5 * 60_000
          await prisma.webhookDelivery.update({
            where: { id: d.id },
            data: {
              status: 'retrying',
              statusCode: res.status,
              attemptCount: attempt,
              lastAttemptAt: new Date(),
              nextAttemptAt: new Date(Date.now() + delayMs),
            },
          })
        }
      } catch (err) {
        await prisma.webhookDelivery.update({
          where: { id: d.id },
          data: {
            attemptCount: d.attemptCount + 1,
            error: String(err),
            lastAttemptAt: new Date(),
            status: d.attemptCount + 1 >= 3 ? 'failed' : 'retrying',
            nextAttemptAt: new Date(Date.now() + Math.pow(3, d.attemptCount + 1) * 5 * 60_000),
          },
        })
      }
    })
  )

  return NextResponse.json({
    processed: results.length,
    succeeded: results.filter((r) => r.status === 'fulfilled').length,
  })
}
