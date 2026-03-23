'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Search,
  FileText,
  MessageSquare,
  BarChart2,
  Loader2,
  CheckCircle,
  AlertCircle,
  Copy,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

// ── SEO Audit ────────────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const color = score >= 70 ? 'text-green-400' : score >= 40 ? 'text-yellow-400' : 'text-red-400'
  return (
    <div className={`text-5xl font-black font-mono ${color}`}>
      {score}<span className="text-2xl text-muted-foreground">/100</span>
    </div>
  )
}

function CategoryBar({ label, score, issues }: { label: string; score: number; issues: string[] }) {
  const [open, setOpen] = useState(false)
  const color = score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <button onClick={() => setOpen(!open)} className="flex items-center gap-1 hover:text-foreground text-muted-foreground transition-colors">
          {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {label}
        </button>
        <span className="font-mono font-bold">{score}/100</span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${score}%` }} />
      </div>
      {open && issues.length > 0 && (
        <ul className="mt-1 space-y-0.5">
          {issues.map((issue, i) => (
            <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
              <AlertCircle className="h-3 w-3 text-yellow-400 mt-0.5 shrink-0" />
              {issue}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function SeoAuditTool() {
  const [url, setUrl] = useState('')
  const [brandName, setBrandName] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  async function run() {
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await fetch('/api/seo-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, brandName: brandName || undefined }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erreur'); return }
      setResult(data)
    } catch {
      setError('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  const catLabels: Record<string, string> = {
    structure: 'Structure HTML',
    meta: 'Balises Meta',
    content: 'Contenu',
    schema: 'Schema.org',
    llm_readability: 'Lisibilité LLM',
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr,auto,auto]">
        <Input
          placeholder="example.com/votre-page"
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && run()}
        />
        <Input
          placeholder="Nom de marque (optionnel)"
          value={brandName}
          onChange={e => setBrandName(e.target.value)}
          className="sm:w-48"
        />
        <Button onClick={run} disabled={loading || !url}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          <span className="ml-1.5">Analyser</span>
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Coût : 2 crédits</p>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Card className="p-5 space-y-2">
              <p className="text-sm text-muted-foreground">Score global</p>
              <ScoreRing score={result.score} />
              <div className="flex flex-wrap gap-2 pt-1">
                {result.hasSchemaOrg && <Badge className="bg-green-500/10 text-green-400 border-green-500/20">Schema.org ✓</Badge>}
                {result.hasFaq && <Badge className="bg-green-500/10 text-green-400 border-green-500/20">FAQ ✓</Badge>}
              </div>
            </Card>
            <Card className="p-5 space-y-1">
              {result.h1 && <p className="text-sm"><span className="text-muted-foreground">H1 :</span> {result.h1}</p>}
              {result.metaDescription && (
                <p className="text-sm"><span className="text-muted-foreground">Meta :</span> <span className="italic">{result.metaDescription.slice(0, 120)}</span></p>
              )}
              {result.h2s?.length > 0 && (
                <div className="pt-1">
                  <p className="text-xs text-muted-foreground mb-1">H2s détectés :</p>
                  <ul className="space-y-0.5">
                    {result.h2s.map((h: string, i: number) => (
                      <li key={i} className="text-xs text-muted-foreground">• {h}</li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          </div>

          {result.categories && (
            <Card className="p-5 space-y-3">
              <h3 className="text-sm font-semibold">Détail par catégorie</h3>
              {Object.entries(result.categories).map(([key, cat]: [string, any]) => (
                <CategoryBar key={key} label={catLabels[key] || key} score={cat.score} issues={cat.issues || []} />
              ))}
            </Card>
          )}

          {(result.recommendations?.length > 0 || result.strengths?.length > 0) && (
            <div className="grid sm:grid-cols-2 gap-4">
              {result.strengths?.length > 0 && (
                <Card className="p-4 space-y-2">
                  <h3 className="text-sm font-semibold text-green-400">Points forts</h3>
                  <ul className="space-y-1">
                    {result.strengths.map((s: string, i: number) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-1.5">
                        <CheckCircle className="h-3.5 w-3.5 text-green-400 mt-0.5 shrink-0" /> {s}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
              {result.recommendations?.length > 0 && (
                <Card className="p-4 space-y-2">
                  <h3 className="text-sm font-semibold">Recommandations</h3>
                  <ul className="space-y-1">
                    {result.recommendations.map((r: string, i: number) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-1.5">
                        <span className="text-primary font-bold shrink-0">{i + 1}.</span> {r}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Content Optimizer ────────────────────────────────────────────────────────

function ContentOptimizerTool() {
  const [text, setText] = useState('')
  const [brandName, setBrandName] = useState('')
  const [context, setContext] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  async function run() {
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await fetch('/api/content-optimizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, brandName, context: context || undefined }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erreur'); return }
      setResult(data)
    } catch {
      setError('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  function copy(t: string) {
    navigator.clipboard.writeText(t)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input placeholder="Nom de marque *" value={brandName} onChange={e => setBrandName(e.target.value)} />
        <Input placeholder="Contexte / sujet (optionnel)" value={context} onChange={e => setContext(e.target.value)} />
      </div>
      <textarea
        className="w-full min-h-[140px] rounded-lg border border-border bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
        placeholder="Collez votre texte ici (50 caractères minimum)…"
        value={text}
        onChange={e => setText(e.target.value)}
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Coût : 3 crédits</p>
        <Button onClick={run} disabled={loading || !text || !brandName}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          <span className="ml-1.5">Optimiser</span>
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          {result.scoreEstimate && (
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Avant</p>
                <p className="text-2xl font-black font-mono text-red-400">{result.scoreEstimate.before}</p>
              </div>
              <div className="text-2xl text-muted-foreground">→</div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Après</p>
                <p className="text-2xl font-black font-mono text-green-400">{result.scoreEstimate.after}</p>
              </div>
            </div>
          )}
          <Card className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Texte optimisé</h3>
              <Button variant="ghost" size="sm" onClick={() => copy(result.optimizedText)} className="h-7 gap-1.5 text-xs">
                <Copy className="h-3.5 w-3.5" />
                {copied ? 'Copié !' : 'Copier'}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{result.optimizedText}</p>
          </Card>
          {result.changes?.length > 0 && (
            <Card className="p-4 space-y-2">
              <h3 className="text-sm font-semibold">Modifications apportées</h3>
              <ul className="space-y-1">
                {result.changes.map((c: string, i: number) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5 text-green-400 mt-0.5 shrink-0" /> {c}
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {result.keyPhrases?.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Phrases clés intégrées :</p>
              <div className="flex flex-wrap gap-2">
                {result.keyPhrases.map((kp: string, i: number) => (
                  <Badge key={i} className="bg-primary/10 text-primary border-primary/20">{kp}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── FAQ Generator ────────────────────────────────────────────────────────────

function FaqGeneratorTool() {
  const [brandName, setBrandName] = useState('')
  const [industry, setIndustry] = useState('')
  const [focus, setFocus] = useState('')
  const [count, setCount] = useState(8)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [activeView, setActiveView] = useState<'list' | 'html' | 'jsonld'>('list')
  const [copied, setCopied] = useState(false)

  async function run() {
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await fetch('/api/faq-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandName, industry, focus: focus || undefined, count }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erreur'); return }
      setResult(data)
    } catch {
      setError('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  function copy(t: string) {
    navigator.clipboard.writeText(t)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input placeholder="Nom de marque *" value={brandName} onChange={e => setBrandName(e.target.value)} />
        <Input placeholder="Secteur d'activité *" value={industry} onChange={e => setIndustry(e.target.value)} />
        <Input placeholder="Focus (ex: tarifs, fonctionnalités…)" value={focus} onChange={e => setFocus(e.target.value)} />
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground shrink-0">Nombre :</label>
          <Input
            type="number"
            min={3}
            max={15}
            value={count}
            onChange={e => setCount(Number(e.target.value))}
            className="w-20"
          />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Coût : 2 crédits</p>
        <Button onClick={run} disabled={loading || !brandName || !industry}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
          <span className="ml-1.5">Générer</span>
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {result && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            {(['list', 'html', 'jsonld'] as const).map(v => (
              <Button
                key={v}
                variant={activeView === v ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveView(v)}
                className="text-xs"
              >
                {v === 'list' ? 'Questions' : v === 'html' ? 'HTML' : 'JSON-LD'}
              </Button>
            ))}
            {activeView !== 'list' && (
              <Button variant="ghost" size="sm" className="ml-auto h-7 gap-1.5 text-xs" onClick={() => copy(activeView === 'html' ? result.html : result.jsonLd)}>
                <Copy className="h-3.5 w-3.5" />
                {copied ? 'Copié !' : 'Copier'}
              </Button>
            )}
          </div>

          {activeView === 'list' && (
            <div className="space-y-3">
              {result.faqs?.map((faq: { question: string; answer: string }, i: number) => (
                <Card key={i} className="p-4">
                  <p className="text-sm font-semibold mb-1">{faq.question}</p>
                  <p className="text-sm text-muted-foreground">{faq.answer}</p>
                </Card>
              ))}
            </div>
          )}

          {activeView === 'html' && (
            <Card className="p-4">
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap overflow-x-auto">{result.html}</pre>
            </Card>
          )}

          {activeView === 'jsonld' && (
            <Card className="p-4">
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap overflow-x-auto">{result.jsonLd}</pre>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

// ── Citation Analysis ─────────────────────────────────────────────────────────

const SENTIMENT_BADGE: Record<string, string> = {
  positive: 'bg-green-500/10 text-green-400 border-green-500/20',
  neutral: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  negative: 'bg-red-500/10 text-red-400 border-red-500/20',
  not_mentioned: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
}

function CitationAnalysisTool() {
  const [brandName, setBrandName] = useState('')
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  async function run() {
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await fetch('/api/citation-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandName, text }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erreur'); return }
      setResult(data)
    } catch {
      setError('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Input placeholder="Nom de marque *" value={brandName} onChange={e => setBrandName(e.target.value)} />
      <textarea
        className="w-full min-h-[140px] rounded-lg border border-border bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
        placeholder="Collez ici la réponse d'un LLM (ChatGPT, Claude, Gemini…) à analyser…"
        value={text}
        onChange={e => setText(e.target.value)}
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Coût : 1 crédit</p>
        <Button onClick={run} disabled={loading || !text || !brandName}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart2 className="h-4 w-4" />}
          <span className="ml-1.5">Analyser</span>
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <Badge className={`text-sm px-3 py-1 ${SENTIMENT_BADGE[result.sentiment] ?? SENTIMENT_BADGE.neutral}`}>
              {result.sentiment === 'positive' ? '😊 Positif' :
               result.sentiment === 'negative' ? '😞 Négatif' :
               result.sentiment === 'neutral' ? '😐 Neutre' : '❌ Non mentionné'}
            </Badge>
            {result.isMentioned && (
              <span className="text-sm text-muted-foreground">
                {result.mentionCount} mention{result.mentionCount > 1 ? 's' : ''}
                {result.position != null && `, position #${result.position}`}
              </span>
            )}
          </div>

          {result.summary && (
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">{result.summary}</p>
            </Card>
          )}

          {result.citations?.length > 0 && (
            <Card className="p-4 space-y-3">
              <h3 className="text-sm font-semibold">Citations</h3>
              {result.citations.map((c: any, i: number) => (
                <div key={i} className="border-l-2 border-primary/30 pl-3 space-y-0.5">
                  <p className="text-sm italic text-muted-foreground">"{c.excerpt}"</p>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-xs ${SENTIMENT_BADGE[c.sentiment] ?? SENTIMENT_BADGE.neutral}`}>{c.sentiment}</Badge>
                    {c.isRecommendation && <Badge className="text-xs bg-primary/10 text-primary border-primary/20">Recommandation</Badge>}
                  </div>
                </div>
              ))}
            </Card>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            {result.keywords?.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Mots-clés associés :</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.keywords.map((kw: string, i: number) => (
                    <Badge key={i} className="bg-primary/10 text-primary border-primary/20 text-xs">{kw}</Badge>
                  ))}
                </div>
              </div>
            )}
            {result.competitors?.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Concurrents mentionnés :</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.competitors.map((c: string, i: number) => (
                    <Badge key={i} className="bg-zinc-500/10 text-zinc-400 border-zinc-500/20 text-xs">{c}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {result.recommendations?.length > 0 && (
            <Card className="p-4 space-y-2">
              <h3 className="text-sm font-semibold">Recommandations</h3>
              <ul className="space-y-1">
                {result.recommendations.map((r: string, i: number) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-1.5">
                    <span className="text-primary font-bold shrink-0">{i + 1}.</span> {r}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const TOOLS = [
  {
    id: 'seo-audit',
    label: 'Audit SEO',
    icon: Search,
    description: 'Analysez une URL et obtenez un score SEO LLM avec recommandations',
    credits: 2,
    component: SeoAuditTool,
  },
  {
    id: 'content-optimizer',
    label: 'Optimiseur de contenu',
    icon: FileText,
    description: 'Réécrivez votre texte pour maximiser les citations par les LLMs',
    credits: 3,
    component: ContentOptimizerTool,
  },
  {
    id: 'faq-generator',
    label: 'Générateur FAQ',
    icon: MessageSquare,
    description: 'Créez des FAQs optimisées LLM avec HTML et JSON-LD intégrables',
    credits: 2,
    component: FaqGeneratorTool,
  },
  {
    id: 'citation-analysis',
    label: 'Analyse des citations',
    icon: BarChart2,
    description: 'Analysez comment un LLM cite votre marque (sentiment, contexte, position)',
    credits: 1,
    component: CitationAnalysisTool,
  },
]

export default function SeoToolsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Outils SEO LLM</h1>
        <p className="text-muted-foreground mt-1">Optimisez votre visibilité dans les réponses des intelligences artificielles</p>
      </div>

      <Tabs defaultValue="seo-audit">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 h-auto gap-1 bg-secondary p-1">
          {TOOLS.map(tool => (
            <TabsTrigger key={tool.id} value={tool.id} className="text-xs py-2 px-2 data-[state=active]:bg-background">
              <tool.icon className="h-3.5 w-3.5 mr-1.5 shrink-0" />
              {tool.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {TOOLS.map(tool => (
          <TabsContent key={tool.id} value={tool.id} className="mt-4">
            <Card className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <tool.icon className="h-5 w-5 text-primary" />
                    {tool.label}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-0.5">{tool.description}</p>
                </div>
                <Badge className="bg-primary/10 text-primary border-primary/20 shrink-0">{tool.credits} crédits</Badge>
              </div>
              <div className="border-t border-border pt-4">
                <tool.component />
              </div>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
