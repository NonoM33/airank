'use client'

import { useEffect, useState, useRef } from 'react'
import { Bell, Check } from 'lucide-react'
import Link from 'next/link'
import { useEventStream } from '@/lib/use-event-stream'

interface Notification {
  id: string
  type: string
  title: string
  body: string
  link: string | null
  iconKey: string | null
  read: boolean
  createdAt: string
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  const load = () => {
    fetch('/api/notifications')
      .then((r) => r.json())
      .then((d: { notifications: Notification[]; unread: number }) => {
        setNotifications(d.notifications ?? [])
        setUnread(d.unread ?? 0)
      })
      .catch(() => {})
  }

  useEffect(() => {
    // Initial fetch only; real-time updates arrive via SSE.
    // Polling was removed (#15): the SSE stream is authoritative and the
    // 60s polling was racing with push events (double-count of unread).
    load()
  }, [])

  useEventStream({
    notification: (data) => {
      const n = data as Notification
      setNotifications((prev) => [n, ...prev].slice(0, 50))
      if (!n.read) setUnread((u) => u + 1)
    },
  })

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const markAllRead = async () => {
    // Optimistic UI: mark everything read immediately, reconcile with server after.
    setUnread(0)
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' })
    } catch {
      // On failure, reload truth from server so the UI converges back.
      load()
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-accent transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-muted-foreground" />
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-[500px] overflow-y-auto rounded-xl border border-border bg-card shadow-xl z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold">Notifications</h3>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <Check className="h-3 w-3" /> Tout marquer lu
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Aucune notification
            </div>
          ) : (
            <ul className="divide-y divide-border/40">
              {notifications.map((n) => {
                const inner = (
                  <div className={`px-4 py-3 hover:bg-accent/50 transition-colors ${!n.read ? 'bg-primary/5' : ''}`}>
                    <div className="flex items-start gap-2">
                      {!n.read && <div className="h-1.5 w-1.5 mt-2 rounded-full bg-primary flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{n.title}</div>
                        <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.body}</div>
                        <div className="text-[10px] text-muted-foreground mt-1">
                          {new Date(n.createdAt).toLocaleString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )
                return (
                  <li key={n.id}>
                    {n.link ? (
                      <Link href={n.link} onClick={() => setOpen(false)}>
                        {inner}
                      </Link>
                    ) : (
                      inner
                    )}
                  </li>
                )
              })}
            </ul>
          )}

          <div className="border-t border-border px-4 py-2">
            <Link
              href="/settings?tab=notifications"
              onClick={() => setOpen(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Préférences de notification →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
