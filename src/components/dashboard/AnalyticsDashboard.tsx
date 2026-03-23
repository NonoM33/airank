'use client'

import { CreditCTA } from '@/components/ui/credit-cta'
import { notifyCreditsChanged } from '@/lib/credits-event'

import { useState } from 'react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts'
import { Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface Brand { id: string; name: string; sector: string | null }

interface BenchmarkData {
  brandName: string; sector: string; scanCount: number
  radarData: Array<{ axis: string; brand: number; secteur: number }>
}
interface SentimentData {
  brandName: string; total: number
  barData: Array<{ label: string; CHATGPT: number; CLAUDE: number; PERPLEXITY: number; GEMINI: number }>
}
interface CoverageData {
  brandName: string
  llms: Array<{ key: string; label: string }>
  matrix: Array<Record<string, unknown>>
}
interface AuthorityData {
  brandName: string; score: number; grade: string; label: string
  breakdown: { frequency: number; position: number; sentiment: number; coverage: number; constance: number }
  scanCount: number; mentionCount: number; totalResults: number
}

function CircularGauge({ score }: { score: number }) {
  const r = 68; const circ = 2 * Math.PI * r
  const color = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444'
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="160" height="160" className="-rotate-90">
        <circle cx="80" cy="80" r={r} fill="none" stroke="#27272A" strokeWidth="12" />
        <circle cx="80" cy="80" r={r} fill="none" stroke={color} strokeWidth="12"
          strokeDasharray={circ} strokeDashoffset={circ - (score / 100) * circ}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }} />
      </svg>
      <div className="-mt-[88px] flex flex-col items-center rotate-0">
        <span className="text-4xl font-bold">{score}</span>
        <span className="text-xs text-muted-foreground">/100</span>
      </div>
    </div>
  )
}

function BreakdownBar({ label, value }: { label: string; value: number }) {
  const color = value >= 70 ? 'bg-green-500' : value >= 40 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-semibold">{value}</span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

function AnalysisCard({ title, cost, loading, onAnalyze, children }: {
  title: string; cost: number; loading: boolean; onAnalyze: () => void; children?: React.ReactNode
}) {
  return (
    <div className="card-glow rounded-xl bg-card border border-border p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" /> {title}
        </h2>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-mono text-primary border-primary/30">{cost} crédits</Badge>
          <Button size="sm" onClick={onAnalyze} disabled={loading}>
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Analyser'}
          </Button>
        </div>
      </div>
      {children}
    </div>
  )
}

export function AnalyticsDashboard({ brands }: { brands: Brand[] }) {
  const [brandId, setBrandId] = useState(brands[0]?.id ?? '')
  const [benchmark, setBenchmark] = useState<{ loading: boolean; data: BenchmarkData | null; err: string }>({ loading: false, data: null, err: '' })
  const [sentiment, setSentiment] = useState<{ loading: boolean; data: SentimentData | null; err: string }>({ loading: false, data: null, err: '' })
  const [coverage, setCoverage] = useState<{ loading: boolean; data: CoverageData | null; err: string }>({ loading: false, data: null, err: '' })
  const [authority, setAuthority] = useState<{ loading: boolean; data: AuthorityData | null; err: string }>({ loading: false, data: null, err: '' })

  async function call<T>(url: string, setter: (s: { loading: boolean; data: T | null; err: string }) => void) {
    setter({ loading: true, data: null, err: '' })
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ brandId }) })
      const json = await res.json()
      if (!res.ok) throw new Error(res.status === 402 ? '__CREDIT__' : (json.error ?? 'Erreur'))
      setter({ loading: false, data: json, err: '' }); notifyCreditsChanged()
    } catch (e) {
      setter({ loading: false, data: null, err: (e as Error).message })
    }
  }

  if (brands.length === 0) return (
    <div className="text-center py-20 text-muted-foreground">Ajoutez une marque pour accéder aux analytics.</div>
  )

  const TOOLTIP_STYLE = { backgroundColor: '#141416', border: '1px solid #27272A', borderRadius: 8 }

  return (
    <div className="space-y-5">
      {/* Brand selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-muted-foreground shrink-0">Marque :</label>
        <select value={brandId} onChange={e => setBrandId(e.target.value)}
          className="bg-card border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
          {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      {/* Benchmark sectoriel */}
      <AnalysisCard title="Benchmark Sectoriel" cost={3} loading={benchmark.loading} onAnalyze={() => call('/api/benchmark', setBenchmark)}>
        {benchmark.err && (benchmark.err === "__CREDIT__" ? <CreditCTA variant="inline" /> : <p className="text-xs text-red-400">{benchmark.err}</p>)}
        {benchmark.data && (
          <div>
            <p className="text-xs text-muted-foreground mb-3">Secteur : <strong>{benchmark.data.sector}</strong> · {benchmark.data.scanCount} scan(s)</p>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={benchmark.data.radarData}>
                <PolarGrid stroke="#27272A" />
                <PolarAngleAxis dataKey="axis" tick={{ fill: '#A1A1A3', fontSize: 11 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#A1A1A3', fontSize: 10 }} />
                <Radar name="Votre marque" dataKey="brand" stroke="#6366F1" fill="#6366F1" fillOpacity={0.3} />
                <Radar name="Moy. secteur" dataKey="secteur" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.15} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
      </AnalysisCard>

      {/* Sentiment deep */}
      <AnalysisCard title="Analyse Sentiment Profonde" cost={2} loading={sentiment.loading} onAnalyze={() => call('/api/sentiment-deep', setSentiment)}>
        {sentiment.err && (sentiment.err === "__CREDIT__" ? <CreditCTA variant="inline" /> : <p className="text-xs text-red-400">{sentiment.err}</p>)}
        {sentiment.data && (
          <div>
            <p className="text-xs text-muted-foreground mb-3">{sentiment.data.total} mention(s) analysées</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={sentiment.data.barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272A" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#A1A1A3', fontSize: 11 }} />
                <YAxis tick={{ fill: '#A1A1A3', fontSize: 11 }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="CHATGPT" name="ChatGPT" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="CLAUDE" name="Claude" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="PERPLEXITY" name="Perplexity" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="GEMINI" name="Gemini" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </AnalysisCard>

      {/* Coverage matrix */}
      <AnalysisCard title="Matrice de Couverture" cost={2} loading={coverage.loading} onAnalyze={() => call('/api/coverage-matrix', setCoverage)}>
        {coverage.err && (coverage.err === "__CREDIT__" ? <CreditCTA variant="inline" /> : <p className="text-xs text-red-400">{coverage.err}</p>)}
        {coverage.data && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Requête</th>
                  {coverage.data.llms.map(l => (
                    <th key={l.key} className="text-center py-2 px-3 text-muted-foreground font-medium">{l.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {coverage.data.matrix.map((row, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="py-2 pr-4 text-foreground max-w-[200px] truncate">{row.query as string}</td>
                    {coverage.data!.llms.map(l => {
                      const cell = row[l.key] as { mentioned: boolean; position: number | null } | null
                      return (
                        <td key={l.key} className="text-center py-2 px-3">
                          {cell === null ? <span className="text-muted-foreground">—</span>
                            : cell.mentioned
                            ? <span className="text-green-400 font-mono">{cell.position ? `#${cell.position}` : '✓'}</span>
                            : <span className="text-red-400">✗</span>}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AnalysisCard>

      {/* Authority score */}
      <AnalysisCard title="Score d'Autorité IA" cost={2} loading={authority.loading} onAnalyze={() => call('/api/authority-score', setAuthority)}>
        {authority.err && (authority.err === "__CREDIT__" ? <CreditCTA variant="inline" /> : <p className="text-xs text-red-400">{authority.err}</p>)}
        {authority.data && (
          <div className="flex flex-col md:flex-row gap-6 items-center">
            <div className="flex flex-col items-center gap-2 shrink-0">
              <CircularGauge score={authority.data.score} />
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl font-bold">{authority.data.grade}</span>
                <Badge className={authority.data.score >= 70 ? 'bg-green-500/20 text-green-400' : authority.data.score >= 40 ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}>
                  {authority.data.label}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{authority.data.mentionCount}/{authority.data.totalResults} mentions · {authority.data.scanCount} scans</p>
            </div>
            <div className="flex-1 w-full space-y-3">
              <BreakdownBar label="Fréquence" value={authority.data.breakdown.frequency} />
              <BreakdownBar label="Position" value={authority.data.breakdown.position} />
              <BreakdownBar label="Sentiment" value={authority.data.breakdown.sentiment} />
              <BreakdownBar label="Couverture LLM" value={authority.data.breakdown.coverage} />
              <BreakdownBar label="Constance" value={authority.data.breakdown.constance} />
            </div>
          </div>
        )}
      </AnalysisCard>
    </div>
  )
}
