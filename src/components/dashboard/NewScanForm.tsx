'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Zap, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface Brand {
  id: string
  name: string
  keywords: string[]
}

interface Props {
  brands: Brand[]
  defaultBrandId?: string
  startOpen?: boolean
}

export function NewScanForm({ brands, defaultBrandId, startOpen = false }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(startOpen)
  const [brandId, setBrandId] = useState(defaultBrandId ?? brands[0]?.id ?? '')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const selectedBrand = brands.find((b) => b.id === brandId)

  async function handleScan(e: React.FormEvent) {
    e.preventDefault()
    if (!brandId || !query.trim()) return
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId, query: query.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erreur lors du scan.')
        setLoading(false)
        return
      }
      router.push(`/scans/${data.scan.id}`)
    } catch {
      setError('Une erreur est survenue.')
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Zap className="h-4 w-4" />
        Lancer un scan
      </Button>
    )
  }

  return (
    <div className="card-glow rounded-xl border border-primary/40 bg-primary/5 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Nouveau scan</h3>
        <button
          type="button"
          onClick={() => { setOpen(false); setError('') }}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleScan} className="space-y-4">
        {error && (
          <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {error}
          </div>
        )}

        <div className={`grid gap-4 ${brands.length > 1 ? 'sm:grid-cols-2' : 'grid-cols-1'}`}>
          {brands.length > 1 && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Marque
              </label>
              <select
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
                disabled={loading}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Requête
            </label>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ex: meilleur CRM pour PME"
              required
              disabled={loading}
            />
            {selectedBrand && selectedBrand.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                <span className="text-xs text-muted-foreground mr-0.5 self-center">Suggérés:</span>
                {selectedBrand.keywords.slice(0, 4).map((kw) => (
                  <button
                    key={kw}
                    type="button"
                    onClick={() => setQuery(kw)}
                    disabled={loading}
                    className="text-xs bg-secondary border border-border rounded-full px-2 py-0.5 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                  >
                    {kw}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <Button type="submit" disabled={loading || !query.trim()} className="gap-2">
          {loading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Analyse en cours (20s)...</>
          ) : (
            <><Zap className="h-4 w-4" /> Scanner</>
          )}
        </Button>
      </form>
    </div>
  )
}
