'use client'

import { useEffect, useState } from 'react'
import { Link2, ExternalLink, Globe } from 'lucide-react'

interface Brand {
  id: string
  name: string
}

interface CitationData {
  total: number
  byDomain: { domain: string; count: number; urls: string[] }[]
  citations: {
    sourceUrl: string
    sourceDomain: string
    sourceTitle?: string
    llm: string
    brandName: string
    query: string
    scanId: string
  }[]
}

export default function CitationsPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [selectedBrand, setSelectedBrand] = useState<string>('')
  const [data, setData] = useState<CitationData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/brands')
      .then((r) => r.json())
      .then((bs: Brand[]) => {
        setBrands(bs)
        if (bs[0]) setSelectedBrand(bs[0].id)
        // If user has no brands, no further fetch will happen —
        // release the loading state so the empty-state can render (#24).
        else setLoading(false)
      })
      .catch(() => {
        setBrands([])
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (!selectedBrand) return
    setLoading(true)
    fetch(`/api/citations?brandId=${selectedBrand}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false))
  }, [selectedBrand])

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Link2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Citations & sources</h1>
          <p className="text-sm text-muted-foreground">
            Quelles sources les IA citent-elles en parlant de votre marque ?
          </p>
        </div>
      </div>

      {brands.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {brands.map((b) => (
            <button
              key={b.id}
              onClick={() => setSelectedBrand(b.id)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                selectedBrand === b.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border hover:bg-accent'
              }`}
            >
              {b.name}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground text-sm">
          Chargement des citations…
        </div>
      )}

      {!loading && brands.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <Globe className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-3">
            Ajoutez d&apos;abord une marque pour analyser ses citations.
          </p>
          <a
            href="/settings"
            className="inline-block px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
          >
            + Ajouter une marque
          </a>
        </div>
      )}

      {!loading && brands.length > 0 && data && data.total === 0 && (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <Globe className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Aucune citation trouvée pour l'instant. Lancez des scans pour tracer les sources utilisées par les IA.
          </p>
        </div>
      )}

      {!loading && data && data.total > 0 && (
        <>
          <div className="mb-6 grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="text-xs text-muted-foreground mb-1">Citations totales</div>
              <div className="text-2xl font-bold">{data.total}</div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="text-xs text-muted-foreground mb-1">Domaines uniques</div>
              <div className="text-2xl font-bold">{data.byDomain.length}</div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="text-xs text-muted-foreground mb-1">Top domaine</div>
              <div className="text-sm font-semibold truncate">{data.byDomain[0]?.domain ?? '—'}</div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 mb-6">
            <h2 className="text-sm font-semibold mb-4">Domaines les plus cités</h2>
            <div className="space-y-2">
              {data.byDomain.slice(0, 15).map((d) => (
                <div key={d.domain} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <Globe className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm truncate">{d.domain}</span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="h-1.5 w-32 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${Math.min(100, (d.count / data.byDomain[0].count) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-10 text-right">{d.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-sm font-semibold mb-4">Citations récentes</h2>
            <div className="space-y-3">
              {data.citations.slice(0, 30).map((c, i) => (
                <div key={i} className="flex items-start justify-between gap-3 py-2">
                  <div className="min-w-0 flex-1">
                    <a
                      href={c.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium truncate flex items-center gap-1 hover:text-primary"
                    >
                      {c.sourceTitle ?? c.sourceDomain}
                      <ExternalLink className="h-3 w-3 flex-shrink-0" />
                    </a>
                    <div className="text-xs text-muted-foreground truncate mt-0.5">
                      {c.query} · <span className="text-primary">{c.llm}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
