import { createHmac } from 'crypto'
import { prisma } from './db'

/**
 * Dispatch a webhook event to all active webhook configs for the given user and event.
 * Fire-and-forget: errors are logged but not re-thrown.
 */
export async function dispatchWebhook(
  userId: string,
  event: string,
  data: unknown
): Promise<void> {
  let webhooks: { url: string; secret: string; events: string }[] = []
  try {
    webhooks = await prisma.webhookConfig.findMany({
      where: { userId, active: true },
      select: { url: true, secret: true, events: true },
    })
  } catch (err) {
    console.error('[webhook-dispatcher] Failed to fetch webhooks:', err)
    return
  }

  const body = JSON.stringify({ event, data, timestamp: new Date().toISOString() })

  const calls = webhooks
    .filter((wh) => {
      try {
        const events = JSON.parse(wh.events) as string[]
        return events.includes(event) || events.includes('*')
      } catch {
        return false
      }
    })
    .map(async (wh) => {
      const signature = createHmac('sha256', wh.secret).update(body).digest('hex')
      try {
        await fetch(wh.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-AIRank-Signature': signature,
          },
          body,
        })
      } catch (err) {
        console.error(`[webhook-dispatcher] Failed to deliver to ${wh.url}:`, err)
      }
    })

  await Promise.allSettled(calls)
}
