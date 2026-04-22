'use client'

import { useState } from 'react'
import { Code2, Copy, Check } from 'lucide-react'
import { useBrand } from '@/lib/brand-context'

export default function WidgetPage() {
  const { brands, currentBrandId, currentBrand } = useBrand()
  const [snippet, setSnippet] = useState('')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)

  const generate = async () => {
    if (!currentBrandId) return
    setLoading(true)
    const res = await fetch('/api/widget/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandId: currentBrandId }),
    })
    if (res.ok) {
      const d = await res.json()
      setSnippet(d.snippet ?? d.html ?? JSON.stringify(d, null, 2))
    } else {
      setSnippet('Erreur lors de la génération du widget.')
    }
    setLoading(false)
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Code2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Widget de score</h1>
          <p className="text-sm text-muted-foreground">
            Intégrez un badge AIRank sur votre site (score mis à jour automatiquement)
          </p>
        </div>
      </div>

      {brands.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Ajoutez d&apos;abord une marque pour générer un widget.
        </div>
      ) : !currentBrandId ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Sélectionnez une marque dans la barre latérale pour générer son widget.
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-border bg-card p-5 mb-6 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">Widget pour</div>
              <div className="text-sm font-semibold truncate">{currentBrand?.name}</div>
            </div>
            <button
              onClick={generate}
              disabled={loading}
              className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? 'Génération…' : 'Générer'}
            </button>
          </div>

          {snippet && (
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-sm">Code à coller dans votre site</h2>
                <button
                  onClick={copy}
                  className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-accent inline-flex items-center gap-1"
                >
                  {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                  {copied ? 'Copié' : 'Copier'}
                </button>
              </div>
              <pre className="bg-background border border-border rounded-lg p-3 text-xs overflow-x-auto whitespace-pre-wrap break-words">
                {snippet}
              </pre>
            </div>
          )}
        </>
      )}
    </div>
  )
}
