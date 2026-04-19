'use client'

import { useEffect, useRef } from 'react'

type EventHandler = (data: unknown) => void

export function useEventStream(handlers: Record<string, EventHandler>) {
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return

    const es = new EventSource('/api/events/stream')

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
