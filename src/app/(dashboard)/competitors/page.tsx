export const dynamic = "force-dynamic"
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'

export default async function CompetitorsPage() {
  const session = await auth()
  const userId = session!.user.id

  const brands = await prisma.brand.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    take: 1,
  })

  if (brands.length === 0) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Analyse concurrents</h1>
          <p className="text-muted-foreground">Qui l&apos;IA recommande à votre place</p>
        </div>
        <div className="card-glow rounded-xl bg-card border border-border p-12 text-center">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <svg className="h-7 w-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold mb-2">Aucune donnée concurrentielle</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
            Lancez des scans pour découvrir quelles marques l&apos;IA recommande à la place de la vôtre.
          </p>
          <Link
            href="/scans"
            className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-medium px-4 py-2 transition-colors hover:bg-primary/90 gap-2"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Lancer un scan
          </Link>
        </div>
      </div>
    )
  }

  const brand = brands[0]

  const allResults = await prisma.scanResult.findMany({
    where: { scan: { brandId: brand.id } },
    select: { competitors: true, llm: true, scan: { select: { createdAt: true, query: true } } },
    orderBy: { scan: { createdAt: 'desc' } },
  })

  // Build competitor frequency map per LLM
  type LLMType = 'CHATGPT' | 'CLAUDE' | 'PERPLEXITY' | 'GEMINI'
  const byLLM: Record<LLMType, Map<string, number>> = {
    CHATGPT: new Map(),
    CLAUDE: new Map(),
    PERPLEXITY: new Map(),
    GEMINI: new Map(),
  }
  const globalMap = new Map<string, number>()

  for (const row of allResults) {
    try {
      const comps = JSON.parse(row.competitors) as string[]
      for (const c of comps) {
        if (!c.trim()) continue
        const llm = row.llm as LLMType
        if (byLLM[llm]) {
          byLLM[llm].set(c, (byLLM[llm].get(c) ?? 0) + 1)
        }
        globalMap.set(c, (globalMap.get(c) ?? 0) + 1)
      }
    } catch { /* skip */ }
  }

  const topGlobal = Array.from(globalMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10)
  const maxCount = topGlobal[0]?.[1] ?? 1

  const LLM_LABELS: Record<string, string> = {
    CHATGPT: 'ChatGPT',
    CLAUDE: 'Claude',
    PERPLEXITY: 'Perplexity',
    GEMINI: 'Gemini',
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analyse concurrents</h1>
        <p className="text-muted-foreground">
          Concurrents détectés dans les réponses des LLMs pour{' '}
          <span className="text-foreground font-medium">{brand.name}</span>
        </p>
      </div>

      {topGlobal.length === 0 ? (
        <div className="card-glow rounded-xl bg-card border border-border p-12 text-center">
          <p className="text-muted-foreground mb-2">Aucun concurrent détecté pour l&apos;instant.</p>
          <p className="text-sm text-muted-foreground mb-6">
            Lancez des scans pour découvrir qui est mentionné à la place de {brand.name}.
          </p>
          <Link
            href="/scans"
            className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-medium px-4 py-2 transition-colors hover:bg-primary/90"
          >
            Lancer un scan
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Global ranking */}
          <div className="lg:col-span-2 card-glow rounded-xl bg-card border border-border">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="font-semibold">Classement global</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Tous LLMs confondus</p>
            </div>
            <div className="p-6 space-y-4">
              {topGlobal.map(([name, count], idx) => (
                <div key={name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="text-muted-foreground font-mono text-xs w-5 text-right">
                        #{idx + 1}
                      </span>
                      <span className="font-medium">{name}</span>
                    </span>
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {count} mention{count > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary transition-all"
                      style={{ width: `${(count / maxCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Per-LLM breakdown */}
          <div className="space-y-4">
            {(Object.entries(byLLM) as [LLMType, Map<string, number>][]).map(([llm, map]) => {
              const top3 = Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3)
              if (top3.length === 0) return null
              return (
                <div key={llm} className="card-glow rounded-xl bg-card border border-border p-4">
                  <h3 className="text-sm font-semibold mb-3">{LLM_LABELS[llm]}</h3>
                  <div className="space-y-2">
                    {top3.map(([name, count], i) => (
                      <div key={name} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <span className="font-mono">#{i + 1}</span>
                          <span className="text-foreground">{name}</span>
                        </span>
                        <span className="text-muted-foreground">{count}×</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
