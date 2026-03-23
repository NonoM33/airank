'use client'

import { useEffect, useState, useCallback } from 'react'
import { TrendingDown, Users, CheckCheck, X, Bell } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

interface ScoreAlert {
  id: string
  type: 'drift' | 'competitor_appeared'
  llm?: string | null
  message: string
  read: boolean
  createdAt: string
}

interface AlertsPanelProps {
  brandId: string
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `il y a ${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours}h`
  const days = Math.floor(hours / 24)
  return `il y a ${days}j`
}

export function AlertsPanel({ brandId }: AlertsPanelProps) {
  const [alerts, setAlerts] = useState<ScoreAlert[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch(`/api/alerts?brandId=${brandId}&unread=true`)
      if (!res.ok) return
      const data = await res.json()
      setAlerts(data.alerts ?? [])
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [brandId])

  useEffect(() => {
    fetchAlerts()
  }, [fetchAlerts])

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch(`/api/alerts/${id}`, { method: 'POST' })
      if (res.ok) {
        setAlerts((prev) => prev.filter((a) => a.id !== id))
      }
    } catch {
      // silent
    }
  }

  const deleteAlert = async (id: string) => {
    try {
      const res = await fetch(`/api/alerts/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setAlerts((prev) => prev.filter((a) => a.id !== id))
      }
    } catch {
      // silent
    }
  }

  if (loading) {
    return (
      <div className="space-y-3" data-testid="alerts-skeleton">
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
    )
  }

  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
        <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
          <CheckCheck className="h-5 w-5 text-green-400" />
        </div>
        <p className="text-sm text-muted-foreground">Aucune alerte — tout va bien ✓</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => {
        const isDrift = alert.type === 'drift'
        const Icon = isDrift ? TrendingDown : Users
        const iconColor = isDrift ? 'text-orange-400' : 'text-red-400'
        const borderColor = isDrift ? 'border-orange-500/30' : 'border-red-500/30'
        const bgColor = isDrift ? 'bg-orange-500/5' : 'bg-red-500/5'
        const badgeClass = isDrift
          ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
          : 'bg-red-500/20 text-red-400 border-red-500/30'

        return (
          <div
            key={alert.id}
            className={`relative flex items-start gap-3 p-3 rounded-lg border ${borderColor} ${bgColor}`}
          >
            <div
              className={`mt-0.5 h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${
                isDrift ? 'bg-orange-500/10' : 'bg-red-500/10'
              }`}
            >
              <Icon className={`h-4 w-4 ${iconColor}`} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={`text-xs border ${badgeClass}`}>
                  {isDrift ? 'Dérive' : 'Concurrent'}
                </Badge>
                {alert.llm && (
                  <span className="text-xs text-muted-foreground">{alert.llm}</span>
                )}
                <span className="text-xs text-muted-foreground ml-auto">
                  {timeAgo(alert.createdAt)}
                </span>
              </div>
              <p className="mt-1 text-sm text-foreground leading-snug">{alert.message}</p>
              <button
                onClick={() => markAsRead(alert.id)}
                className="mt-1.5 text-xs text-primary hover:underline"
                aria-label="Marquer comme lue"
              >
                Marquer comme lue
              </button>
            </div>

            <button
              onClick={() => deleteAlert(alert.id)}
              className="shrink-0 text-muted-foreground hover:text-foreground"
              aria-label="Supprimer l'alerte"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// AlertsBadge — standalone unread count badge for nav items
// ---------------------------------------------------------------------------

interface AlertsBadgeProps {
  brandId?: string
}

export function AlertsBadge({ brandId }: AlertsBadgeProps) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const url = brandId
      ? `/api/alerts?brandId=${brandId}&unread=true`
      : '/api/alerts?unread=true'

    fetch(url)
      .then((r) => r.json())
      .then((data) => setCount(data.alerts?.length ?? 0))
      .catch(() => {})
  }, [brandId])

  if (count === 0) return null

  return (
    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
      {count > 99 ? '99+' : count}
    </span>
  )
}
