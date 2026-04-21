export const dynamic = 'force-dynamic'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

// Server-Sent Events: real-time notifications stream.
// Polls the DB every 15s; emits new notifications since last cursor.
// Abort-aware: stops as soon as the client disconnects or the controller closes.
// For multi-instance scale, swap the poll for Postgres LISTEN/NOTIFY or Redis pub/sub.
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 })
  }
  const userId = session.user.id

  const encoder = new TextEncoder()
  let cursor = new Date()
  let closed = false
  let pollTimer: ReturnType<typeof setTimeout> | null = null

  const close = () => {
    if (closed) return
    closed = true
    if (pollTimer) {
      clearTimeout(pollTimer)
      pollTimer = null
    }
  }

  // Stop the poll as soon as the client disconnects (TCP abort / navigation).
  if (req.signal) {
    if (req.signal.aborted) close()
    else req.signal.addEventListener('abort', close, { once: true })
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (closed) return
        // desiredSize === null means the controller is closed/errored; stop writing.
        if (controller.desiredSize === null) {
          close()
          return
        }
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
        } catch {
          close()
        }
      }

      send('hello', { ts: Date.now() })

      const tick = async () => {
        if (closed) return
        try {
          const fresh = await prisma.notification.findMany({
            where: { userId, createdAt: { gt: cursor } },
            orderBy: { createdAt: 'asc' },
            take: 20,
          })
          if (fresh.length > 0) {
            cursor = fresh[fresh.length - 1].createdAt
            for (const n of fresh) send('notification', n)
          }
          send('ping', { ts: Date.now() })
        } catch (err) {
          console.error('[sse] poll error', err)
        }
        if (!closed) pollTimer = setTimeout(tick, 15_000)
      }

      void tick()
    },
    cancel() {
      close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
