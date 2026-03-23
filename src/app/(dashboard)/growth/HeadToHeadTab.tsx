'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Columns, Loader2 } from 'lucide-react'

type LLMResult = { mentioned: boolean; position: number | null; sentiment: string | null; score: number } | null
type Row = { llm: string; brand1: LLMResult; brand2: LLMResult }
type Result = { brand1: string; brand2: string; query: string; comparison: Row[]; score1: number; score2: number }

const LLM_LABELS: Record<string, string> = { CHATGPT: 'ChatGPT', CLAUDE: 'Claude', PERPLEXITY: 'Perplexity', GEMINI: 'Gemini' }

export function HeadToHeadTab() {
  const [brand1, setBrand1] = useState('')
  const [brand2, setBrand2] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState('')

  async function compare() {
    setLoading(true)
    setError('')
    const res = await fetch('/api/head-to-head', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brand1, brand2, query }),
    })
    const data = await res.json()
    if (!res.ok) setError(data.error ?? 'Erreur')
    else setResult(data)
    setLoading(false)
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Columns className="h-4 w-4 text-primary" /> Comparateur Head-to-Head
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <input value={brand1} onChange={(e) => setBrand1(e.target.value)} placeholder="Marque 1" className="bg-secondary border border-border rounded-md px-3 py-2 text-sm" />
          <input value={brand2} onChange={(e) => setBrand2(e.target.value)} placeholder="Marque 2" className="bg-secondary border border-border rounded-md px-3 py-2 text-sm" />
        </div>
        <input
          value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Requête de comparaison (ex: meilleur logiciel CRM PME)"
          className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm"
        />
        <Button onClick={compare} disabled={loading || !brand1 || !brand2 || query.length < 5} className="w-full">
          {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Analyse en cours...</> : 'Comparer (2 crédits)'}
        </Button>
        {error && <p className="text-sm text-red-400">{error}</p>}

        {result && (
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-secondary rounded-lg p-3">
                <p className="text-2xl font-bold font-mono text-primary">{result.score1}</p>
                <p className="text-xs text-muted-foreground truncate">{result.brand1}</p>
              </div>
              <div className="flex items-center justify-center text-muted-foreground font-bold">VS</div>
              <div className="bg-secondary rounded-lg p-3">
                <p className="text-2xl font-bold font-mono text-primary">{result.score2}</p>
                <p className="text-xs text-muted-foreground truncate">{result.brand2}</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-muted-foreground font-medium">LLM</th>
                    <th className="text-center py-2 text-muted-foreground font-medium">{result.brand1}</th>
                    <th className="text-center py-2 text-muted-foreground font-medium">{result.brand2}</th>
                  </tr>
                </thead>
                <tbody>
                  {result.comparison.map((row) => (
                    <tr key={row.llm} className="border-b border-border/50">
                      <td className="py-2 font-medium">{LLM_LABELS[row.llm] ?? row.llm}</td>
                      <td className="py-2 text-center"><LLMCell r={row.brand1} /></td>
                      <td className="py-2 text-center"><LLMCell r={row.brand2} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function LLMCell({ r }: { r: LLMResult }) {
  if (!r) return <span className="text-muted-foreground">—</span>
  if (!r.mentioned) return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">Non mentionné</Badge>
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="font-mono font-bold text-primary">{r.score}</span>
      {r.position && <span className="text-muted-foreground">#{r.position}</span>}
    </div>
  )
}
