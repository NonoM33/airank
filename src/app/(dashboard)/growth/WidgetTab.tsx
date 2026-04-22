'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Code2, Copy, Check, Loader2 } from 'lucide-react'
import { useBrandOptional } from '@/lib/brand-context'

type Brand = { id: string; name: string }
type WidgetData = { score: number; brandName: string; html: string; svg: string }

export function WidgetTab({ brands }: { brands: Brand[] }) {
  const ctx = useBrandOptional()
  // Source of truth: the global BrandSwitcher in the sidebar.
  const brandId = ctx?.currentBrandId ?? brands[0]?.id ?? ''
  const activeBrand = brands.find((b) => b.id === brandId) ?? brands[0] ?? null

  const [widgetData, setWidgetData] = useState<WidgetData | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  // Invalidate stale widget when brand changes
  useEffect(() => {
    setWidgetData(null)
    setError('')
  }, [brandId])

  async function generate() {
    if (!brandId) return
    setLoading(true)
    setError('')
    const res = await fetch('/api/widget/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandId }),
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
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            Widget pour <span className="text-foreground font-medium">{activeBrand?.name ?? '—'}</span>
          </div>
          <Button onClick={generate} disabled={loading || !brandId}>
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
