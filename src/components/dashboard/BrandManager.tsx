'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Pencil, Trash2, X, Check, Loader2, Tag, Globe, Zap, Sparkles, ScanLine, BarChart2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

interface Brand {
  id: string
  name: string
  domain: string | null
  keywords: string[]
  _count?: { scans: number }
}

interface Props {
  brands: Brand[]
  maxBrands: number
  plan: string
}

interface AnalysisResult {
  businessName: string
  industry: string
  location: string | null
  description: string
  suggestedQueries: string[]
}

export function BrandManager({ brands: initialBrands, maxBrands, plan }: Props) {
  const router = useRouter()
  const [brands, setBrands] = useState(initialBrands)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [scanningBrandId, setScanningBrandId] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [siteUrl, setSiteUrl] = useState('') // combined URL field (sets domain + used for analyze)
  const [keywordInput, setKeywordInput] = useState('')
  const [keywords, setKeywords] = useState<string[]>([])

  // Analysis state (create flow only)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [analyzeError, setAnalyzeError] = useState('')

  function openCreate() {
    setEditId(null)
    setName('')
    setSiteUrl('')
    setKeywords([])
    setKeywordInput('')
    setError('')
    setAnalysisResult(null)
    setAnalyzeError('')
    setShowForm(true)
  }

  function openEdit(brand: Brand) {
    setEditId(brand.id)
    setName(brand.name)
    setSiteUrl(brand.domain ? `https://${brand.domain}` : '')
    setKeywords(brand.keywords)
    setKeywordInput('')
    setError('')
    setAnalysisResult(null)
    setAnalyzeError('')
    setShowForm(true)
  }

  async function handleAnalyze() {
    if (!siteUrl.trim()) return
    setAnalyzeError('')
    setAnalyzing(true)
    try {
      const res = await fetch('/api/analyze-site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: siteUrl.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAnalyzeError(data.error || 'Analyse impossible.')
        setAnalyzing(false)
        return
      }
      setAnalysisResult(data)
      if (!name.trim() && data.businessName) setName(data.businessName)
      setKeywords(data.suggestedQueries ?? [])
    } catch {
      setAnalyzeError('Une erreur est survenue.')
    }
    setAnalyzing(false)
  }

  function addKeyword() {
    const kw = keywordInput.trim()
    if (kw && !keywords.includes(kw)) setKeywords([...keywords, kw])
    setKeywordInput('')
  }

  function removeKeyword(kw: string) {
    setKeywords(keywords.filter((k) => k !== kw))
  }

  function extractDomain(url: string): string | undefined {
    try {
      const u = new URL(url.startsWith('http') ? url : `https://${url}`)
      return u.hostname.replace(/^www\./, '')
    } catch {
      return url || undefined
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const domain = siteUrl ? extractDomain(siteUrl) : undefined
    try {
      const apiUrl = editId ? `/api/brands/${editId}` : '/api/brands'
      const method = editId ? 'PUT' : 'POST'
      const res = await fetch(apiUrl, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, domain, keywords }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Une erreur est survenue.')
        setLoading(false)
        return
      }
      if (editId) {
        setBrands(brands.map((b) => (b.id === editId ? { ...b, name, domain: domain ?? null, keywords } : b)))
      } else {
        setBrands([...brands, { id: data.id, name, domain: domain ?? null, keywords }])
      }
      setShowForm(false)
      router.refresh()
    } catch {
      setError('Une erreur est survenue.')
    }
    setLoading(false)
  }

  async function handleCreateAndScan() {
    if (!name.trim() || keywords.length === 0) return
    setError('')
    setLoading(true)
    const domain = siteUrl ? extractDomain(siteUrl) : undefined
    try {
      const brandRes = await fetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, domain, keywords }),
      })
      const brandData = await brandRes.json()
      if (!brandRes.ok) {
        setError(brandData.error || 'Erreur lors de la création.')
        setLoading(false)
        return
      }
      setBrands([...brands, { id: brandData.id, name, domain: domain ?? null, keywords }])
      setShowForm(false)
      setScanningBrandId(brandData.id)
      await Promise.allSettled(
        keywords.map((kw) =>
          fetch('/api/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ brandId: brandData.id, query: kw }),
          })
        )
      )
      setScanningBrandId(null)
      router.push('/scans')
    } catch {
      setError('Une erreur est survenue.')
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette marque et tous ses scans ?')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/brands/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setBrands(brands.filter((b) => b.id !== id))
        router.refresh()
      }
    } catch { /* ignore */ }
    setLoading(false)
  }

  async function handleScanAll(brand: Brand) {
    if (brand.keywords.length === 0) return
    setScanningBrandId(brand.id)
    try {
      await Promise.allSettled(
        brand.keywords.map((kw) =>
          fetch('/api/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ brandId: brand.id, query: kw }),
          })
        )
      )
      router.push('/scans')
    } catch { /* ignore */ }
    setScanningBrandId(null)
  }

  const canAdd = maxBrands === 0 ? false : brands.length < maxBrands

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Vos marques</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {brands.length} / {maxBrands === 0 ? '∞' : maxBrands} marques utilisées
          </p>
        </div>
        {!showForm && (
          <Button
            size="sm"
            onClick={openCreate}
            disabled={!canAdd}
            title={!canAdd ? `Plan ${plan} : maximum ${maxBrands} marque(s)` : undefined}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Ajouter
          </Button>
        )}
      </div>

      {!canAdd && maxBrands === 0 && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-400">
          Le plan Gratuit ne permet pas d&apos;ajouter de marques.{' '}
          <a href="/billing" className="underline hover:no-underline">Passez au plan Starter →</a>
        </div>
      )}

      {!canAdd && maxBrands > 0 && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-400">
          Vous avez atteint la limite de {maxBrands} marque(s) pour votre plan.{' '}
          <a href="/billing" className="underline hover:no-underline">Upgradez →</a>
        </div>
      )}

      {/* Create / Edit form */}
      {showForm && (
        <div className="card-glow rounded-xl border border-primary/30 bg-primary/5 p-6">
          <h3 className="font-semibold mb-4">{editId ? 'Modifier la marque' : 'Nouvelle marque'}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Nom de la marque *</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Acme Corp"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                  URL du site
                  {!editId && (
                    <span className="text-xs text-muted-foreground font-normal">
                      — génère les requêtes auto
                    </span>
                  )}
                </label>
                <div className="flex gap-2">
                  <Input
                    value={siteUrl}
                    onChange={(e) => setSiteUrl(e.target.value)}
                    placeholder="https://acme.fr"
                  />
                  {!editId && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAnalyze}
                      disabled={!siteUrl.trim() || analyzing}
                      className="shrink-0 gap-1.5"
                    >
                      {analyzing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      {analyzing ? 'Analyse...' : 'Analyser'}
                    </Button>
                  )}
                </div>
                {analyzeError && <p className="text-xs text-destructive">{analyzeError}</p>}
                {analysisResult && (
                  <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-xs">
                    <p className="font-medium text-primary">{analysisResult.industry}</p>
                    <p className="text-muted-foreground mt-0.5">{analysisResult.description}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                Requêtes de scan
              </label>
              <p className="text-xs text-muted-foreground">
                Ce que vos clients tapent dans ChatGPT, Perplexity, etc.
              </p>
              <div className="flex gap-2">
                <Input
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  placeholder="Ex: meilleur logiciel CRM PME"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); addKeyword() }
                  }}
                />
                <Button type="button" variant="outline" size="sm" onClick={addKeyword}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {keywords.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {keywords.map((kw) => (
                    <Badge key={kw} className="bg-secondary text-foreground border border-border gap-1.5 pr-1">
                      {kw}
                      <button
                        type="button"
                        onClick={() => removeKeyword(kw)}
                        className="hover:text-destructive transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button type="submit" disabled={loading} variant="outline" className="gap-1.5">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {editId ? 'Enregistrer' : 'Créer la marque'}
              </Button>
              {!editId && keywords.length > 0 && (
                <Button
                  type="button"
                  disabled={loading || !name.trim()}
                  onClick={handleCreateAndScan}
                  className="gap-1.5"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                  Créer et scanner ({keywords.length} requête{keywords.length > 1 ? 's' : ''})
                </Button>
              )}
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                Annuler
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Brand list */}
      {brands.length === 0 ? (
        <div className="card-glow rounded-xl border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground mb-2">Aucune marque pour le moment.</p>
          {canAdd && (
            <Button size="sm" onClick={openCreate} className="mt-2">
              <Plus className="h-4 w-4 mr-1.5" />
              Ajouter ma première marque
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {brands.map((brand) => (
            <div key={brand.id} className="card-glow rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
              {/* Brand header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{brand.name}</p>
                  {brand.domain && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{brand.domain}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEdit(brand)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(brand.id)}
                    disabled={loading}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Keywords */}
              {brand.keywords.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {brand.keywords.map((kw) => (
                    <Badge key={kw} className="bg-secondary text-muted-foreground text-xs border border-border">
                      {kw}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Aucune requête configurée</p>
              )}

              {/* Stats + Actions */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-border">
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{brand.keywords.length}</span> requête{brand.keywords.length !== 1 ? 's' : ''}
                  {brand._count?.scans != null && (
                    <> · <span className="font-medium text-foreground">{brand._count.scans}</span> scan{brand._count.scans !== 1 ? 's' : ''}</>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Link href={`/brands/${brand.id}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 text-xs text-muted-foreground"
                    >
                      <BarChart2 className="h-3.5 w-3.5" />
                      Détails
                    </Button>
                  </Link>
                  {brand.keywords.length > 0 && (
                    <Button
                      size="sm"
                      onClick={() => handleScanAll(brand)}
                      disabled={scanningBrandId === brand.id}
                      className="h-8 gap-1.5 text-xs"
                    >
                      {scanningBrandId === brand.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <ScanLine className="h-3.5 w-3.5" />
                      )}
                      {scanningBrandId === brand.id ? 'Scan...' : 'Scanner'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
