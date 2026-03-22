'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Zap, Sparkles, X, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface AnalysisResult {
  businessName: string
  industry: string
  location: string | null
  description: string
  suggestedQueries: string[]
}

export function DashboardOnboarding() {
  const router = useRouter()
  const [brandName, setBrandName] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState('')
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [queries, setQueries] = useState<string[]>([])
  const [queryInput, setQueryInput] = useState('')
  const [step, setStep] = useState<'idle' | 'creating' | 'scanning'>('idle')
  const [error, setError] = useState('')

  const loading = step !== 'idle'

  async function handleAnalyze() {
    if (!websiteUrl.trim()) return
    setAnalyzeError('')
    setAnalyzing(true)
    try {
      const res = await fetch('/api/analyze-site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: websiteUrl.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAnalyzeError(data.error || 'Analyse impossible.')
        setAnalyzing(false)
        return
      }
      setAnalysisResult(data)
      if (!brandName.trim() && data.businessName) setBrandName(data.businessName)
      setQueries(data.suggestedQueries ?? [])
    } catch {
      setAnalyzeError('Une erreur est survenue.')
    }
    setAnalyzing(false)
  }

  function addQuery() {
    const q = queryInput.trim()
    if (q && !queries.includes(q)) setQueries([...queries, q])
    setQueryInput('')
  }

  async function handleLaunch(e: React.FormEvent) {
    e.preventDefault()
    if (!brandName.trim() || queries.length === 0) return
    setError('')
    setStep('creating')

    try {
      const brandRes = await fetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: brandName.trim(), keywords: queries }),
      })
      const brandData = await brandRes.json()
      if (!brandRes.ok) {
        setError(brandData.error || 'Erreur lors de la création.')
        setStep('idle')
        return
      }

      setStep('scanning')

      await Promise.allSettled(
        queries.map((q) =>
          fetch('/api/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ brandId: brandData.id, query: q }),
          })
        )
      )

      router.push('/scans')
    } catch {
      setError('Une erreur est survenue.')
      setStep('idle')
    }
  }

  return (
    <form onSubmit={handleLaunch} className="space-y-5">
      {error && (
        <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Nom de votre marque</label>
          <Input
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            placeholder="Ex: Acme Corp"
            required
            disabled={loading}
            className="h-11"
          />
          <p className="text-xs text-muted-foreground">Le nom que l&apos;IA doit mentionner</p>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Site web
            <span className="text-xs text-muted-foreground font-normal">(génère les requêtes auto)</span>
          </label>
          <div className="flex gap-2">
            <Input
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://acme.fr"
              disabled={loading || analyzing}
              className="h-11 flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleAnalyze}
              disabled={!websiteUrl.trim() || analyzing || loading}
              className="h-11 shrink-0 gap-1.5"
            >
              {analyzing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {analyzing ? 'Analyse...' : 'Analyser'}
            </Button>
          </div>
          {analyzeError && <p className="text-xs text-destructive">{analyzeError}</p>}
        </div>
      </div>

      {analysisResult && (
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-sm">
          <p className="font-medium text-primary">{analysisResult.industry}</p>
          {analysisResult.description && (
            <p className="text-muted-foreground text-xs mt-0.5">{analysisResult.description}</p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium">
          Requêtes à analyser{' '}
          {queries.length > 0 && (
            <span className="text-primary">({queries.length})</span>
          )}
        </label>
        {queries.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {queries.map((q) => (
              <Badge
                key={q}
                className="bg-secondary text-foreground border border-border gap-1.5 pr-1"
              >
                {q}
                <button
                  type="button"
                  onClick={() => setQueries(queries.filter((x) => x !== q))}
                  className="hover:text-destructive transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <Input
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder="Ex: meilleur logiciel CRM pour PME"
            disabled={loading}
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addQuery()
              }
            }}
          />
          <Button type="button" variant="outline" size="sm" onClick={addQuery} disabled={loading}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {queries.length === 0
            ? "Entrez l'URL pour générer automatiquement, ou ajoutez des requêtes manuellement"
            : 'Vous pouvez modifier ou ajouter des requêtes supplémentaires'}
        </p>
      </div>

      <Button
        type="submit"
        disabled={loading || !brandName.trim() || queries.length === 0}
        size="lg"
        className="gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {step === 'creating'
              ? 'Création de la marque...'
              : `Scan en cours (${queries.length} requête${queries.length > 1 ? 's' : ''})...`}
          </>
        ) : (
          <>
            <Zap className="h-4 w-4" />
            {queries.length > 0
              ? `Lancer l'analyse (${queries.length} requête${queries.length > 1 ? 's' : ''})`
              : "Lancer l'analyse"}
          </>
        )}
      </Button>
    </form>
  )
}
