'use client'

import { useEffect, useState } from 'react'
import { Key, Plus, Trash2, Copy, Check } from 'lucide-react'
import { CreditCTA } from '@/components/ui/credit-cta'

interface ApiKey {
  id: string
  name: string
  keyPrefix: string
  scopes: string
  lastUsedAt: string | null
  expiresAt: string | null
  active: boolean
  createdAt: string
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newScopes, setNewScopes] = useState<string[]>(['read'])
  const [revealedKey, setRevealedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [planError, setPlanError] = useState(false)

  const load = () => {
    setLoading(true)
    fetch('/api/api-keys')
      .then((r) => r.json())
      .then((d) => setKeys(d.keys ?? []))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const createKey = async () => {
    if (!newName.trim()) return
    setCreating(true)
    const res = await fetch('/api/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, scopes: newScopes }),
    })
    if (res.status === 402) {
      setPlanError(true)
      setCreating(false)
      return
    }
    const data = await res.json()
    if (data.key) {
      setRevealedKey(data.key)
      setNewName('')
      load()
    }
    setCreating(false)
  }

  const deleteKey = async (id: string) => {
    if (!confirm('Révoquer cette clé ?')) return
    await fetch(`/api/api-keys/${id}`, { method: 'DELETE' })
    load()
  }

  const copyKey = () => {
    if (!revealedKey) return
    navigator.clipboard.writeText(revealedKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Key className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Clés API</h1>
          <p className="text-sm text-muted-foreground">
            Générez des clés pour accéder à l'API AIRank programmatiquement
          </p>
        </div>
      </div>

      {planError && (
        <CreditCTA variant="banner" message="L'API publique est réservée au plan Agency" />
      )}

      {revealedKey && (
        <div className="mb-6 rounded-xl border-2 border-primary/50 bg-primary/5 p-5">
          <h2 className="font-semibold mb-2">🔑 Votre nouvelle clé API</h2>
          <p className="text-sm text-muted-foreground mb-3">
            Copiez-la maintenant. Elle ne sera plus jamais affichée.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 font-mono text-sm bg-background border border-border rounded px-3 py-2 truncate">
              {revealedKey}
            </code>
            <button
              onClick={copyKey}
              className="p-2 rounded-lg border border-border hover:bg-accent transition-colors"
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <button
            onClick={() => setRevealedKey(null)}
            className="mt-3 text-xs text-muted-foreground hover:text-foreground"
          >
            J'ai sauvegardé la clé, la masquer
          </button>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-5 mb-6">
        <h2 className="font-semibold mb-3">Créer une nouvelle clé</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Ex: Production integration"
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <select
            value={newScopes[0]}
            onChange={(e) => setNewScopes([e.target.value])}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="read">Lecture seule</option>
            <option value="write">Lecture + Écriture</option>
            <option value="admin">Admin (tout)</option>
          </select>
          <button
            onClick={createKey}
            disabled={creating || !newName.trim()}
            className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Créer
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="px-5 py-3 border-b border-border">
          <h2 className="font-semibold text-sm">Clés actives</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Chargement…</div>
        ) : keys.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Aucune clé API</div>
        ) : (
          <ul className="divide-y divide-border/40">
            {keys.map((k) => (
              <li key={k.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-sm">{k.name}</div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {k.keyPrefix}…
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {k.lastUsedAt
                      ? `Dernier usage : ${new Date(k.lastUsedAt).toLocaleDateString('fr-FR')}`
                      : 'Jamais utilisée'}
                  </div>
                </div>
                <button
                  onClick={() => deleteKey(k.id)}
                  className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6 text-sm">
        <a href="/api-docs" className="text-primary hover:underline">
          → Voir la documentation API
        </a>
      </div>
    </div>
  )
}
