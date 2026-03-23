'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Code2, Copy, Check, Loader2 } from 'lucide-react'

type Brand = { id: string; name: string }
type WidgetData = { score: number; brandName: string; html: string; svg: string }

export function WidgetTab({ brands }: { brands: Brand[] }) {
  const [selectedBrand, setSelectedBrand] = useState(brands[0]?.id ?? '')
  const [widgetData, setWidgetData] = useState<WidgetData | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  async function generate() {
    setLoading(true)
    setError('')
    const res = await fetch('/api/widget/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandId: selectedBrand }),
    })
    const data = await res.json()
    if (!res.ok) setError(data.error ?? 'Erreur')
    else setWidgetData(data)
    setLoading(false)
  }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Code2 className="h-4 w-4 text-primary" /> Générateur de widget
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3">
          <select
            value={selectedBrand}
            onChange={(e) => { setSelectedBrand(e.target.value); setWidgetData(null) }}
            className="flex-1 bg-secondary border border-border rounded-md px-3 py-2 text-sm"
          >
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <Button onClick={generate} disabled={loading || !selectedBrand}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Générer'}
          </Button>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}

        {widgetData && (
          <div className="space-y-4">
            <div className="p-4 bg-secondary rounded-lg flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:image/svg+xml;utf8,${encodeURIComponent(widgetData.svg)}`}
                alt="AIRank badge"
                width={200}
                height={36}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-mono">HTML</span>
                <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => copy(widgetData.html)}>
                  {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                  {copied ? 'Copié !' : 'Copier'}
                </Button>
              </div>
              <pre className="bg-background rounded-md p-3 text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap border border-border">
                {widgetData.html}
              </pre>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground">Intégrez ce badge sur votre site pour afficher votre score de visibilité IA. Gratuit.</p>
      </CardContent>
    </Card>
  )
}
