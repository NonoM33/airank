'use client'

import { useEffect, useRef } from 'react'

type EventHandler = (data: unknown) => void

/**
 * Subscribe to the SSE stream at /api/events/stream.
 *
 * LIMITATION (#17): the set of event types you subscribe to is locked at
 * mount time. If you pass new keys in `handlers` on a re-render, they will
 * NOT be subscribed. The handler *bodies* are always fresh (via ref), so
 * capturing fresh props/state from within a handler works. Just don't
 * conditionally add/remove event keys after mount.
 *
 * If you need dynamic subscriptions, listen for the generic 'message' event
 * and route by `data.type` inside your handler.
 */
export function useEventStream(handlers: Record<string, EventHandler>) {
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return

    const es = new EventSource('/api/events/stream')

    // Captured once: see function-level LIMITATION above.
    const subscribedTypes = Object.keys(handlersRef.current)
    const listeners = subscribedTypes.map((type) => {
      const fn = (evt: MessageEvent) => {
        try {
          const data = JSON.parse(evt.data)
          handlersRef.current[type]?.(data)
        } catch {
          /* ignore */
        }
      }
      es.addEventListener(type, fn as EventListener)
      return [type, fn] as const
    })

    es.onerror = () => {
      // Browser auto-reconnects; don't spam logs
    }

    return () => {
      for (const [type, fn] of listeners) {
        es.removeEventListener(type, fn as EventListener)
      }
      es.close()
    }
  }, [])
}
