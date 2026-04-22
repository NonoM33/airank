'use client'

import { useEffect, useState } from 'react'
import { Bell, Plus, Trash2, AlertTriangle } from 'lucide-react'
import { useBrand } from '@/lib/brand-context'

interface UserAlert {
  id: string
  type: string
  threshold: number | null
  message: string
  read: boolean
  createdAt: string
  brand: { id: string; name: string } | null
}

interface ScoreAlert {
  id: string
  type: string
  llm: string | null
  message: string
  read: boolean
  createdAt: string
  brandId: string
}

export default function AlertsPage() {
  const { brands, currentBrandId, currentBrand } = useBrand()
  const [userAlerts, setUserAlerts] = useState<UserAlert[]>([])
  const [scoreAlerts, setScoreAlerts] = useState<ScoreAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  // Form — alert target brand defaults to the globally-selected brand
  const [newType, setNewType] = useState<'score_below' | 'score_above' | 'no_mention' | 'competitor_spike'>('score_below')
  const [newBrandId, setNewBrandId] = useState<string>('')
  const [newThreshold, setNewThreshold] = useState<number>(50)
  const [newMessage, setNewMessage] = useState('')

  const reload = async () => {
    setLoading(true)
    const scopedUrl = currentBrandId
      ? `/api/alerts?source=alert&brandId=${currentBrandId}`
      : '/api/alerts?source=alert'
    const scopedScoreUrl = currentBrandId
      ? `/api/alerts?brandId=${currentBrandId}`
      : '/api/alerts'
    const [ua, sa] = await Promise.all([
      fetch(scopedUrl).then((r) => r.json()).catch(() => ({ alerts: [] })),
      fetch(scopedScoreUrl).then((r) => r.json()).catch(() => ({ alerts: [] })),
    ])
    setUserAlerts(ua.alerts ?? [])
    setScoreAlerts(sa.alerts ?? [])
    setLoading(false)
  }

  useEffect(() => {
    // Default the form's target brand to the globally-selected one
    if (currentBrandId && !newBrandId) setNewBrandId(currentBrandId)
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBrandId])

  const create = async () => {
    if (!newMessage.trim()) return
    setCreating(true)
    const body = {
      type: newType,
      brandId: newBrandId || undefined,
      threshold: ['score_below', 'score_above'].includes(newType) ? newThreshold : undefined,
      message: newMessage,
    }
    const res = await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      setNewMessage('')
      reload()
    }
    setCreating(false)
  }

  const remove = async (id: string) => {
    await fetch(`/api/alerts/${id}`, { method: 'DELETE' })
    reload()
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Bell className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Alertes</h1>
          <p className="text-sm text-muted-foreground">
            {currentBrand
              ? `Seuils et dérives détectées pour ${currentBrand.name}`
              : 'Définissez des seuils et consultez les dérives détectées'}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 mb-6">
        <h2 className="font-semibold mb-3">Créer une alerte</h2>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as typeof newType)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="score_below">Score en-dessous de</option>
            <option value="score_above">Score au-dessus de</option>
            <option value="no_mention">Aucune mention</option>
            <option value="competitor_spike">Spike concurrent</option>
          </select>
          <select
            value={newBrandId}
            onChange={(e) => setNewBrandId(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">Toutes les marques</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          {['score_below', 'score_above'].includes(newType) && (
            <input
              type="number"
              min={0}
              max={100}
              value={newThreshold}
              onChange={(e) => setNewThreshold(Number(e.target.value))}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              placeholder="Seuil"
            />
          )}
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Message (ex: score chute sous 40)"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm sm:col-span-2"
          />
          <button
            onClick={create}
            disabled={creating || !newMessage.trim()}
            className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" /> Créer
          </button>
        </div>
      </div>

      {loading && (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Chargement…
        </div>
      )}

      {!loading && (
        <>
          <div className="rounded-xl border border-border bg-card mb-6">
            <div className="px-5 py-3 border-b border-border">
              <h2 className="font-semibold text-sm">Mes alertes configurées</h2>
            </div>
            {userAlerts.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                Aucune alerte configurée. Créez-en une ci-dessus.
              </div>
            ) : (
              <ul className="divide-y divide-border/40">
                {userAlerts.map((a) => (
                  <li key={a.id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{a.message}</div>
                      <div className="text-xs text-muted-foreground">
                        {a.type} {a.threshold !== null ? `· seuil ${a.threshold}` : ''} · {a.brand?.name ?? 'toutes marques'}
                      </div>
                    </div>
                    <button
                      onClick={() => remove(a.id)}
                      className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card">
            <div className="px-5 py-3 border-b border-border flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <h2 className="font-semibold text-sm">Dérives détectées récemment</h2>
            </div>
            {scoreAlerts.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                Aucune dérive détectée — tout va bien.
              </div>
            ) : (
              <ul className="divide-y divide-border/40">
                {scoreAlerts.map((a) => (
                  <li key={a.id} className="px-5 py-3">
                    <div className="text-sm">{a.message}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {a.type} {a.llm ? `· ${a.llm}` : ''} · {new Date(a.createdAt).toLocaleString('fr-FR')}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}
