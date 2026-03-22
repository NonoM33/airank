'use client'

import { useState } from 'react'
import { Loader2, Calendar, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface ScheduledScan {
  id: string
  frequency: string
  nextRunAt: string
  lastRunAt: string | null
  enabled: boolean
}

interface Props {
  brandId: string
  initial: ScheduledScan | null
}

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Hebdomadaire',
  biweekly: 'Bi-mensuel',
  monthly: 'Mensuel',
}

export function ScheduledScanSection({ brandId, initial }: Props) {
  const [scan, setScan] = useState<ScheduledScan | null>(initial)
  const [loading, setLoading] = useState(false)
  const [selectedFreq, setSelectedFreq] = useState<string>(initial?.frequency ?? 'weekly')
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/scheduled-scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId, frequency: selectedFreq }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Erreur')
        return
      }
      setScan(data.scan)
    } catch {
      setError('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  async function toggle() {
    if (!scan) return
    setLoading(true)
    try {
      const res = await fetch(`/api/scheduled-scans/${scan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !scan.enabled }),
      })
      const data = await res.json()
      if (res.ok) setScan(data.scan)
    } finally {
      setLoading(false)
    }
  }

  async function remove() {
    if (!scan) return
    setLoading(true)
    try {
      const res = await fetch(`/api/scheduled-scans/${scan.id}`, { method: 'DELETE' })
      if (res.ok) setScan(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card-glow rounded-xl border border-border bg-card p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold">Scan automatique</h2>
        <Badge className="bg-secondary text-muted-foreground text-xs ml-auto">1 crédit / scan</Badge>
      </div>

      <p className="text-sm text-muted-foreground">
        Programmez des scans automatiques de cette marque. Chaque exécution consomme 1 crédit.
      </p>

      {scan ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge className={scan.enabled ? 'bg-green-500/20 text-green-400' : 'bg-zinc-800 text-zinc-400'}>
              {scan.enabled ? '● Actif' : '○ Inactif'}
            </Badge>
            <span className="text-sm font-medium">{FREQUENCY_LABELS[scan.frequency] ?? scan.frequency}</span>
            <span className="text-xs text-muted-foreground">
              Prochain scan : {new Date(scan.nextRunAt).toLocaleDateString('fr-FR', {
                day: '2-digit', month: 'long', year: 'numeric'
              })}
            </span>
            {scan.lastRunAt && (
              <span className="text-xs text-muted-foreground">
                Dernier : {new Date(scan.lastRunAt).toLocaleDateString('fr-FR', {
                  day: '2-digit', month: 'short'
                })}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={toggle} disabled={loading} className="gap-1.5">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {scan.enabled ? 'Désactiver' : 'Activer'}
            </Button>
            <Button size="sm" variant="ghost" onClick={remove} disabled={loading} className="gap-1.5 text-red-400 hover:text-red-300">
              <Trash2 className="h-3.5 w-3.5" />
              Supprimer
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            {['weekly', 'biweekly', 'monthly'].map((f) => (
              <button
                key={f}
                onClick={() => setSelectedFreq(f)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                  selectedFreq === f
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/50'
                }`}
              >
                {FREQUENCY_LABELS[f]}
              </button>
            ))}
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <Button size="sm" onClick={save} disabled={loading} className="gap-1.5">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Calendar className="h-3.5 w-3.5" />}
            Activer le scan automatique
          </Button>
        </div>
      )}
    </div>
  )
}
