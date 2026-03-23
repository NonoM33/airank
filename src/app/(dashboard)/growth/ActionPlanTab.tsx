'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Circle, Sparkles, Loader2 } from 'lucide-react'

type Brand = { id: string; name: string }
type ActionItem = { id: string; title: string; description: string; impact: string; difficulty: string; done: boolean; dueDate: string | null }
type ActionPlan = { id: string; items: ActionItem[] }

const IMPACT_COLOR: Record<string, string> = {
  high: 'bg-green-500/20 text-green-400 border-green-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
}
const DIFF_COLOR: Record<string, string> = {
  easy: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  medium: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  hard: 'bg-red-500/20 text-red-400 border-red-500/30',
}

export function ActionPlanTab({ brands }: { brands: Brand[] }) {
  const [selectedBrand, setSelectedBrand] = useState(brands[0]?.id ?? '')
  const [plan, setPlan] = useState<ActionPlan | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function generate() {
    if (!selectedBrand) return
    setLoading(true)
    setError('')
    const res = await fetch('/api/action-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandId: selectedBrand }),
    })
    const data = await res.json()
    if (!res.ok) setError(data.error ?? 'Erreur')
    else setPlan(data)
    setLoading(false)
  }

  async function toggleItem(itemId: string, done: boolean) {
    await fetch('/api/action-plan', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, done }),
    })
    setPlan((p) => p ? { ...p, items: p.items.map((i) => i.id === itemId ? { ...i, done } : i) } : p)
  }

  const done = plan?.items.filter((i) => i.done).length ?? 0
  const total = plan?.items.length ?? 0

  return (
    <div className="space-y-4">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Plan d&apos;action 30 jours
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <select
              value={selectedBrand}
              onChange={(e) => { setSelectedBrand(e.target.value); setPlan(null) }}
              className="flex-1 min-w-0 bg-secondary border border-border rounded-md px-3 py-2 text-sm"
            >
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <Button onClick={generate} disabled={loading || !selectedBrand}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Génération...</> : 'Générer (3 crédits)'}
            </Button>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </CardContent>
      </Card>

      {plan && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Actions ({done}/{total} complétées)</span>
              <div className="h-2 w-32 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {plan.items.map((item) => (
              <div
                key={item.id}
                className={`flex gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${item.done ? 'border-border opacity-60' : 'border-border hover:border-primary/30'}`}
                onClick={() => toggleItem(item.id, !item.done)}
              >
                {item.done ? <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" /> : <Circle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${item.done ? 'line-through text-muted-foreground' : ''}`}>{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge className={`text-[10px] border ${IMPACT_COLOR[item.impact] ?? IMPACT_COLOR.medium}`}>{item.impact}</Badge>
                    <Badge className={`text-[10px] border ${DIFF_COLOR[item.difficulty] ?? DIFF_COLOR.medium}`}>{item.difficulty}</Badge>
                    {item.dueDate && <span className="text-[10px] text-muted-foreground">J{Math.ceil((new Date(item.dueDate).getTime() - Date.now()) / 86400000)}</span>}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
