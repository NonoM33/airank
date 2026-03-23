'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, BarChart3, Zap, TrendingUp, Calendar } from 'lucide-react'
import { NewScanForm } from '@/components/dashboard/NewScanForm'
import { BrandFilter } from '@/components/dashboard/BrandFilter'

function getScoreColor(score: number) {
  if (score >= 70) return 'text-green-400'
  if (score >= 40) return 'text-amber-400'
  return 'text-red-400'
}

const LLM_SHORT: Record<string, string> = {
  CHATGPT: 'GPT',
  CLAUDE: 'CLD',
  PERPLEXITY: 'PPX',
  GEMINI: 'GEM',
}

interface Brand {
  id: string
  name: string
  domain: string | null
  keywords: string | string[]
}

interface Scan {
  id: string
  query: string
  globalScore: number
  createdAt: string
  brand: { id: string; name: string }
  results: { llm: string; mentioned: boolean; position: number | null }[]
}

export default function ScansPage() {
  const searchParams = useSearchParams()
  const brandFilter = searchParams.get('brand')

  const [brands, setBrands] = useState<Brand[] | null>(null)
  const [scans, setScans] = useState<Scan[]>([])

  useEffect(() => {
    fetch('/api/brands')
      .then((r) => r.json())
      .then((data: Brand[]) => {
        setBrands(data)
        const targetBrandId = brandFilter ?? data[0]?.id
        if (targetBrandId) {
          const url = brandFilter
            ? `/api/scans?brandId=${brandFilter}&results=true`
            : `/api/scans?results=true`
          return fetch(url)
            .then((r) => r.json())
            .then(setScans)
        }
      })
      .catch(() => setBrands([]))
  }, [brandFilter])

  if (!brands) {
    return (
      <div className="p-4 lg:p-6 space-y-6">
        <h1 className="text-2xl font-bold">Scans</h1>
        <p className="text-muted-foreground">Chargement…</p>
      </div>
    )
  }

  const brandsForForm = brands.map((b) => ({
    id: b.id,
    name: b.name,
    domain: b.domain ?? null,
    keywords: (() => {
      if (Array.isArray(b.keywords)) return b.keywords as string[]
      try { return JSON.parse(b.keywords as string) as string[] } catch { return [] }
    })(),
  }))

  if (brands.length === 0) {
    return (
      <div className="p-4 lg:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Scans</h1>
          <p className="text-muted-foreground">Historique de vos analyses LLM</p>
        </div>
        <div className="card-glow rounded-xl bg-card border border-primary/20 p-10 text-center">
          <p className="text-muted-foreground mb-2">Aucune marque configurée.</p>
          <p className="text-sm text-muted-foreground mb-6">
            Commencez par ajouter une marque dans les{' '}
            <Link href="/settings" className="text-primary hover:underline">paramètres</Link>.
          </p>
        </div>
      </div>
    )
  }

  const activeBrand = brandFilter ? (brands.find((b) => b.id === brandFilter) ?? null) : null
  const defaultBrandId = activeBrand?.id ?? brands[0].id

  const avgScore = scans.length > 0
    ? Math.round(scans.reduce((sum, s) => sum + s.globalScore, 0) / scans.length)
    : 0
  const bestScore = scans.length > 0 ? Math.max(...scans.map((s) => s.globalScore)) : 0
  const totalMentions = scans.reduce((sum, s) => sum + s.results.filter((r) => r.mentioned).length, 0)
  const totalResults = scans.reduce((sum, s) => sum + s.results.length, 0)
  const mentionRate = totalResults > 0 ? Math.round((totalMentions / totalResults) * 100) : 0

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Scans</h1>
          <p className="text-muted-foreground">
            {activeBrand ? (
              <>Analyses pour <span className="text-foreground font-medium">{activeBrand.name}</span></>
            ) : brands.length > 1 ? (
              'Toutes les analyses'
            ) : (
              <>Analyses pour <span className="text-foreground font-medium">{brands[0].name}</span></>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {brands.length > 1 && (
            <BrandFilter
              brands={brands.map((b) => ({ id: b.id, name: b.name }))}
              activeBrandId={activeBrand?.id ?? null}
            />
          )}
          <NewScanForm brands={brandsForForm} defaultBrandId={defaultBrandId} />
        </div>
      </div>

      {scans.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="card-glow rounded-xl bg-card border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Total scans</p>
            </div>
            <p className="text-2xl font-bold font-mono">{scans.length}</p>
          </div>
          <div className="card-glow rounded-xl bg-card border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Score moyen</p>
            </div>
            <p className={`text-2xl font-bold font-mono ${getScoreColor(avgScore)}`}>{avgScore}</p>
          </div>
          <div className="card-glow rounded-xl bg-card border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Taux de mention</p>
            </div>
            <p className={`text-2xl font-bold font-mono ${getScoreColor(mentionRate)}`}>{mentionRate}%</p>
          </div>
          <div className="card-glow rounded-xl bg-card border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Meilleur score</p>
            </div>
            <p className={`text-2xl font-bold font-mono ${getScoreColor(bestScore)}`}>{bestScore}</p>
          </div>
        </div>
      )}

      {scans.length === 0 ? (
        <div className="card-glow rounded-xl bg-card border border-primary/20 p-8">
          <p className="text-sm text-muted-foreground mb-6 text-center">
            Aucun scan{activeBrand ? ` pour ${activeBrand.name}` : ''} pour le moment. Lancez votre première analyse !
          </p>
          <NewScanForm brands={brandsForForm} defaultBrandId={defaultBrandId} startOpen />
        </div>
      ) : (
        <div className="card-glow rounded-xl bg-card border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Requête
                  </th>
                  {brands.length > 1 && !activeBrand && (
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                      Marque
                    </th>
                  )}
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
                    Date
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                    LLMs
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {scans.map((scan) => {
                  const mentionCount = scan.results.filter((r) => r.mentioned).length
                  return (
                    <tr key={scan.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-medium max-w-xs truncate">{scan.query}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 sm:hidden">
                          {new Date(scan.createdAt).toLocaleDateString('fr-FR', {
                            day: '2-digit', month: '2-digit', year: '2-digit',
                          })}
                        </p>
                      </td>
                      {brands.length > 1 && !activeBrand && (
                        <td className="px-4 py-3.5 hidden md:table-cell">
                          <Link
                            href={`/brands/${scan.brand.id}`}
                            className="text-xs text-muted-foreground hover:text-primary transition-colors"
                          >
                            {scan.brand.name}
                          </Link>
                        </td>
                      )}
                      <td className="px-4 py-3.5 hidden sm:table-cell">
                        <p className="text-sm text-muted-foreground whitespace-nowrap">
                          {new Date(scan.createdAt).toLocaleDateString('fr-FR', {
                            day: '2-digit', month: '2-digit', year: '2-digit',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        <div className="flex items-center gap-1">
                          {scan.results.map((r) => (
                            <Badge
                              key={r.llm}
                              className={`text-[10px] px-1.5 py-0 ${
                                r.mentioned ? 'bg-green-500/20 text-green-400' : 'bg-zinc-800 text-zinc-500'
                              }`}
                            >
                              {LLM_SHORT[r.llm] ?? r.llm}
                            </Badge>
                          ))}
                          <span className="text-xs text-muted-foreground ml-1">
                            {mentionCount}/{scan.results.length}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className={`font-mono font-bold text-sm ${getScoreColor(scan.globalScore)}`}>
                          {scan.globalScore}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <Link
                          href={`/scans/${scan.id}`}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
