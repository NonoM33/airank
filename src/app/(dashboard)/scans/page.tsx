import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, Plus } from 'lucide-react'

function getScoreColor(score: number) {
  if (score >= 70) return 'text-green-400'
  if (score >= 40) return 'text-amber-400'
  return 'text-red-400'
}

const LLM_ICONS: Record<string, string> = {
  CHATGPT: 'GPT',
  CLAUDE: 'CLD',
  PERPLEXITY: 'PPX',
  GEMINI: 'GEM',
}

export default async function ScansPage() {
  const session = await auth()
  const userId = session!.user.id

  const brands = await prisma.brand.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    take: 1,
  })

  if (brands.length === 0) {
    return (
      <div className="p-6 lg:p-8">
        <h1 className="text-2xl font-bold mb-2">Scans</h1>
        <p className="text-muted-foreground mb-6">
          <Link href="/settings" className="text-primary hover:underline">Ajoutez une marque</Link>{' '}
          pour commencer à scanner.
        </p>
      </div>
    )
  }

  const brand = brands[0]

  const scans = await prisma.scan.findMany({
    where: { brandId: brand.id },
    orderBy: { createdAt: 'desc' },
    include: {
      results: {
        select: { llm: true, mentioned: true, position: true },
      },
    },
  })

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Scans</h1>
          <p className="text-muted-foreground">
            Historique des analyses pour{' '}
            <span className="text-foreground font-medium">{brand.name}</span>
          </p>
        </div>
        <Link
          href="/settings"
          className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-medium px-3 py-1.5 transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Nouveau scan
        </Link>
      </div>

      {scans.length === 0 ? (
        <div className="card-glow rounded-xl bg-card border border-border p-12 text-center">
          <p className="text-muted-foreground mb-4">Aucun scan pour le moment.</p>
          <p className="text-sm text-muted-foreground">
            Lancez votre premier scan depuis la page{' '}
            <Link href="/settings" className="text-primary hover:underline">Paramètres</Link>.
          </p>
        </div>
      ) : (
        <div className="card-glow rounded-xl bg-card border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Requête
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
                    Date
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                    LLMs
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
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
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium max-w-xs truncate">{scan.query}</p>
                      </td>
                      <td className="px-4 py-4 hidden sm:table-cell">
                        <p className="text-sm text-muted-foreground whitespace-nowrap">
                          {scan.createdAt.toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </td>
                      <td className="px-4 py-4 hidden lg:table-cell">
                        <div className="flex items-center gap-1">
                          {scan.results.map((r) => (
                            <Badge
                              key={r.llm}
                              className={`text-[10px] px-1.5 py-0 ${
                                r.mentioned
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-zinc-800 text-zinc-500'
                              }`}
                            >
                              {LLM_ICONS[r.llm] ?? r.llm}
                            </Badge>
                          ))}
                          <span className="text-xs text-muted-foreground ml-1">
                            {mentionCount}/{scan.results.length}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`font-mono font-bold ${getScoreColor(scan.globalScore)}`}>
                          {scan.globalScore}
                        </span>
                      </td>
                      <td className="px-4 py-4">
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
