'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, X, Check, Loader2, Tag, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface Brand {
  id: string
  name: string
  domain: string | null
  keywords: string[]
}

interface Props {
  brands: Brand[]
  maxBrands: number
  plan: string
}

export function BrandManager({ brands: initialBrands, maxBrands, plan }: Props) {
  const router = useRouter()
  const [brands, setBrands] = useState(initialBrands)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [name, setName] = useState('')
  const [domain, setDomain] = useState('')
  const [keywordInput, setKeywordInput] = useState('')
  const [keywords, setKeywords] = useState<string[]>([])

  function openCreate() {
    setEditId(null)
    setName('')
    setDomain('')
    setKeywords([])
    setKeywordInput('')
    setError('')
    setShowForm(true)
  }

  function openEdit(brand: Brand) {
    setEditId(brand.id)
    setName(brand.name)
    setDomain(brand.domain ?? '')
    setKeywords(brand.keywords)
    setKeywordInput('')
    setError('')
    setShowForm(true)
  }

  function addKeyword() {
    const kw = keywordInput.trim()
    if (kw && !keywords.includes(kw)) {
      setKeywords([...keywords, kw])
    }
    setKeywordInput('')
  }

  function removeKeyword(kw: string) {
    setKeywords(keywords.filter((k) => k !== kw))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const url = editId ? `/api/brands/${editId}` : '/api/brands'
      const method = editId ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, domain: domain || undefined, keywords }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Une erreur est survenue.')
        setLoading(false)
        return
      }

      if (editId) {
        setBrands(brands.map((b) => (b.id === editId ? { ...b, name, domain: domain || null, keywords } : b)))
      } else {
        const newBrand = { id: data.id, name, domain: domain || null, keywords }
        setBrands([...brands, newBrand])
      }
      setShowForm(false)
      router.refresh()
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

      {/* Plan limit warning */}
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
                  Domaine
                </label>
                <Input
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="Ex: acme.fr"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                Requêtes de scan
              </label>
              <p className="text-xs text-muted-foreground">
                Entrez les requêtes que vos clients tapent dans ChatGPT, Perplexity, etc.
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
                    <Badge
                      key={kw}
                      className="bg-secondary text-foreground border border-border gap-1.5 pr-1"
                    >
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

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={loading} className="gap-1.5">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {editId ? 'Enregistrer' : 'Créer'}
              </Button>
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
        <div className="space-y-3">
          {brands.map((brand) => (
            <div
              key={brand.id}
              className="card-glow rounded-xl border border-border bg-card p-5 flex items-start justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold">{brand.name}</p>
                  {brand.domain && (
                    <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                      {brand.domain}
                    </span>
                  )}
                </div>
                {brand.keywords.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {brand.keywords.map((kw) => (
                      <Badge key={kw} className="bg-secondary text-muted-foreground text-xs border border-border">
                        {kw}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">
                    Aucune requête configurée
                  </p>
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
          ))}
        </div>
      )}
    </div>
  )
}
