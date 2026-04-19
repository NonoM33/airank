import { createHmac } from 'crypto'
import { prisma } from './db'
import { formatSlackMessage, sendToSlack } from './slack'

/**
 * Dispatch a webhook event to all matching configs for a user.
 * - Fire-and-forget: errors logged, never thrown.
 * - Auto-detect Slack URLs and format as Block Kit.
 * - Logs each delivery (status, attempt count) for retry tracking.
 * - Standard Zapier-ready JSON payload.
 */
export async function dispatchWebhook(
  userId: string,
  event: string,
  data: Record<string, unknown>
): Promise<void> {
  // Also send to user's slack preference if configured
  try {
    const prefs = await prisma.notificationPreference.findUnique({ where: { userId } })
    if (prefs?.slackEnabled && prefs.slackWebhook) {
      const msg = formatSlackMessage(event, data)
      void sendToSlack(prefs.slackWebhook, msg)
    }
  } catch (err) {
    console.error('[webhook] slack pref fetch failed', err)
  }

  let webhooks: { id: string; url: string; secret: string; events: string }[] = []
  try {
    webhooks = await prisma.webhookConfig.findMany({
      where: { userId, active: true },
      select: { id: true, url: true, secret: true, events: true },
    })
  } catch (err) {
    console.error('[webhook-dispatcher] fetch failed:', err)
    return
  }

  const payload = {
    event,
    data,
    timestamp: new Date().toISOString(),
    // Flat fields for Zapier convenience
    ...flattenForZapier(data),
  }
  const body = JSON.stringify(payload)

  const targets = webhooks.filter((wh) => {
    try {
      const events = JSON.parse(wh.events) as string[]
      return events.includes(event) || events.includes('*')
    } catch {
      return false
    }
  })

  await Promise.allSettled(
    targets.map(async (wh) => {
      // Slack URLs: send pretty format
      if (wh.url.includes('hooks.slack.com')) {
        const msg = formatSlackMessage(event, data)
        const ok = await sendToSlack(wh.url, msg)
        await logDelivery(wh.id, event, payload, ok ? 'success' : 'failed', ok ? 200 : 0)
        return
      }

      const signature = createHmac('sha256', wh.secret).update(body).digest('hex')
      const t0 = Date.now()
      try {
        const res = await fetch(wh.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-AIRank-Signature': signature,
            'X-AIRank-Event': event,
          },
          body,
        })
        await logDelivery(wh.id, event, payload, res.ok ? 'success' : 'failed', res.status, Date.now() - t0)
        // Schedule retry if failed (up to 3 attempts)
        if (!res.ok) await scheduleRetry(wh.id, event, payload)
      } catch (err) {
        console.error(`[webhook-dispatcher] ${wh.url}:`, err)
        await logDelivery(wh.id, event, payload, 'failed', 0, Date.now() - t0, String(err))
        await scheduleRetry(wh.id, event, payload)
      }
    })
  )
}

function flattenForZapier(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(data)) {
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      out[`data_${k}`] = v
    }
  }
  return out
}

async function logDelivery(
  webhookId: string,
  event: string,
  payload: unknown,
  status: string,
  statusCode?: number,
  latency?: number,
  error?: string
): Promise<void> {
  try {
    await prisma.webhookDelivery.create({
      data: {
        webhookId,
        event,
        payload: payload as object,
        status,
        statusCode,
        attemptCount: 1,
        lastAttemptAt: new Date(),
        error: error ?? null,
      },
    })
  } catch (err) {
    console.error('[webhook-dispatcher] log failed', err)
  }
}

async function scheduleRetry(
  webhookId: string,
  event: string,
  payload: unknown
): Promise<void> {
  try {
    const nextAttemptAt = new Date(Date.now() + 5 * 60_000) // retry in 5 min
    await prisma.webhookDelivery.create({
      data: {
        webhookId,
        event,
        payload: payload as object,
        status: 'retrying',
        attemptCount: 0,
        nextAttemptAt,
      },
    })
  } catch {
    /* ignore */
  }
}
