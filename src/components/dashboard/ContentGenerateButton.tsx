'use client'

import { useState } from 'react'
import { Loader2, Sparkles, Copy, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  brandId: string
  brandName: string
  type: 'article' | 'faq' | 'press_release' | 'comparison'
  context?: {
    industry?: string
    competitors?: string[]
    topic?: string
  }
  label: string
  cost: number
}

export function ContentGenerateButton({ brandId, brandName, type, context, label, cost }: Props) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ title: string; content: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)

  async function generate() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId,
          type,
          context: { brandName, ...context },
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Erreur lors de la génération')
        return
      }
      setResult({ title: data.title, content: data.content })
      setOpen(true)
    } catch {
      setError('Erreur réseau. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  async function copy() {
    if (!result) return
    await navigator.clipboard.writeText(result.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="inline-flex flex-col items-start gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={generate}
        disabled={loading}
        className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Sparkles className="h-3.5 w-3.5" />
        )}
        {label} ({cost} crédit{cost > 1 ? 's' : ''})
      </Button>

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      {open && result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-semibold text-sm truncate">{result.title}</h3>
              <div className="flex items-center gap-2 shrink-0">
                <Button size="sm" variant="outline" onClick={copy} className="gap-1.5">
                  {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Copié !' : 'Copier'}
                </Button>
                <button
                  onClick={() => setOpen(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed">
                {result.content}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
