export const dynamic = 'force-dynamic'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

// Server-Sent Events: real-time notifications stream.
// Polls the DB every 15s; emits new notifications since last cursor.
// Lightweight and works on any infra (no websockets needed).
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 })
  }
  const userId = session.user.id

  const encoder = new TextEncoder()
  let cursor = new Date()
  let closed = false

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
        } catch {
          closed = true
        }
      }

      send('hello', { ts: Date.now() })

      const poll = async () => {
        while (!closed) {
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
          await new Promise((r) => setTimeout(r, 15_000))
        }
      }

      void poll()
    },
    cancel() {
      closed = true
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
