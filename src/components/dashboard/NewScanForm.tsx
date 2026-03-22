'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ScanLine, Globe } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface Brand {
  id: string
  name: string
  keywords: string[]
  domain: string | null
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
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')
  const [url, setUrl] = useState('')
  const autoAnalyzedRef = useRef<string>('') // tracks brandId already auto-analyzed

  const selectedBrand = brands.find((b) => b.id === brandId)
  const hasKeywords = selectedBrand && selectedBrand.keywords.length > 0

  // Auto-analyze when form opens and brand has domain but no keywords
  useEffect(() => {
    if (!open || hasKeywords || !selectedBrand?.domain) return
    if (autoAnalyzedRef.current === brandId) return
    autoAnalyzedRef.current = brandId
    const domainUrl = selectedBrand.domain.startsWith('http')
      ? selectedBrand.domain
      : `https://${selectedBrand.domain}`
    setUrl(domainUrl)
    triggerAnalyze(domainUrl)
  }, [open, brandId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function triggerAnalyze(targetUrl: string) {
    setError('')
    setAnalyzing(true)
    try {
      const analyzeRes = await fetch('/api/analyze-site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl }),
      })
      const analyzeData = await analyzeRes.json()
      if (!analyzeRes.ok) {
        setError(analyzeData.error || "Erreur lors de l'analyse du site.")
        setAnalyzing(false)
        return
      }
      const queries = analyzeData.suggestedQueries ?? []
      if (queries.length === 0) {
        setError('Impossible de générer des requêtes pour ce site.')
        setAnalyzing(false)
        return
      }
      await fetch(`/api/brands/${brandId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: queries }),
      })
      setAnalyzing(false)
      setLoading(true)
      const results = await Promise.allSettled(
        queries.map((q: string) =>
          fetch('/api/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ brandId, query: q }),
          }).then((r) => r.json())
        )
      )
      const firstOk = results.find((r) => r.status === 'fulfilled' && (r as PromiseFulfilledResult<{ scan: { id: string } }>).value?.scan?.id)
      if (firstOk && firstOk.status === 'fulfilled') {
        router.push(`/scans/${(firstOk as PromiseFulfilledResult<{ scan: { id: string } }>).value.scan.id}`)
      } else {
        router.push('/scans')
        router.refresh()
      }
    } catch {
      setError('Une erreur est survenue.')
      setAnalyzing(false)
      setLoading(false)
    }
  }

  async function handleScanAll() {
    if (!brandId || !hasKeywords) return
    setError('')
    setLoading(true)
    try {
      const results = await Promise.allSettled(
        selectedBrand!.keywords.map((kw) =>
          fetch('/api/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ brandId, query: kw }),
          }).then((r) => r.json())
        )
      )
      const firstOk = results.find((r) => r.status === 'fulfilled' && (r as PromiseFulfilledResult<{ scan: { id: string } }>).value?.scan?.id)
      if (firstOk && firstOk.status === 'fulfilled') {
        router.push(`/scans/${(firstOk as PromiseFulfilledResult<{ scan: { id: string } }>).value.scan.id}`)
      } else {
        router.push('/scans')
        router.refresh()
      }
    } catch {
      setError('Une erreur est survenue.')
      setLoading(false)
    }
  }

  async function handleAnalyzeAndScan(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return
    await triggerAnalyze(url.trim())
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="gap-2 h-10 min-h-10">
        <ScanLine className="h-4 w-4" />
        Lancer un scan
      </Button>
    )
  }

  return (
    <div className="card-glow rounded-xl border border-primary/40 bg-primary/5 p-5 space-y-4 w-full">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Nouveau scan</h3>
        <button
          type="button"
          onClick={() => { setOpen(false); setError('') }}
          className="text-muted-foreground hover:text-foreground transition-colors text-xs"
        >
          ✕
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          {error}
        </div>
      )}

      {brands.length > 1 && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Marque
          </label>
          <select
            value={brandId}
            onChange={(e) => { setBrandId(e.target.value); autoAnalyzedRef.current = '' }}
            disabled={loading || analyzing}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      )}

      {analyzing ? (
        <div className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin shrink-0 text-primary" />
          <span>Analyse de votre site en cours — génération des requêtes...</span>
        </div>
      ) : hasKeywords ? (
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{selectedBrand!.keywords.length} requêtes</span> seront analysées sur 4 LLMs :
          </div>
          <div className="flex flex-wrap gap-1.5">
            {selectedBrand!.keywords.map((kw) => (
              <span key={kw} className="text-xs bg-secondary border border-border rounded-full px-2.5 py-1 text-muted-foreground">
                {kw}
              </span>
            ))}
          </div>
          <Button onClick={handleScanAll} disabled={loading} className="gap-2 w-full min-h-10">
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Analyse en cours (~30s)...</>
            ) : (
              <><ScanLine className="h-4 w-4" /> Scanner {selectedBrand!.name}</>
            )}
          </Button>
        </div>
      ) : (
        <form onSubmit={handleAnalyzeAndScan} className="space-y-3">
          <div className="text-xs text-muted-foreground">
            Entrez l&apos;URL du site pour générer automatiquement les requêtes de scan.
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                required
                disabled={loading || analyzing}
                className="pl-9 h-10"
              />
            </div>
            <Button type="submit" disabled={loading || analyzing || !url.trim()} className="gap-2 h-10 shrink-0">
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Scan...</>
              ) : (
                <><ScanLine className="h-4 w-4" /> Analyser &amp; Scanner</>
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
