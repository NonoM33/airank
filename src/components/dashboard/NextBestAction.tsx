'use client'

import { Lightbulb, Zap, TrendingUp, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

interface ScanSummary {
  globalScore: number
  createdAt: string | Date
  results?: Array<{ llm: string; mentioned: boolean }>
}

interface NextBestActionProps {
  scans: ScanSummary[]
  brandName: string
  plan: string
}

interface Action {
  icon: React.ReactNode
  title: string
  description: string
  cta: string
  href?: string
  variant?: 'default' | 'outline'
}

function resolveAction(scans: ScanSummary[], brandName: string): Action {
  if (scans.length === 0) {
    return {
      icon: <Zap className="h-5 w-5 text-primary" />,
      title: 'Lancez votre premier scan',
      description: `Analysez la visibilité de ${brandName} sur ChatGPT, Claude, Perplexity et Gemini en quelques secondes.`,
      cta: 'Lancer un scan',
      href: '/scans',
      variant: 'default',
    }
  }

  const latestScan = scans[0]
  const score = latestScan.globalScore

  if (score < 25) {
    return {
      icon: <AlertTriangle className="h-5 w-5 text-red-400" />,
      title: 'Votre marque est invisible pour l\'IA',
      description:
        `${brandName} n'est presque jamais mentionné. Créez une page FAQ optimisée avec les questions fréquentes de votre secteur pour améliorer votre visibilité.`,
      cta: 'Générer du contenu',
      href: '/content',
      variant: 'default',
    }
  }

  if (score < 50) {
    return {
      icon: <TrendingUp className="h-5 w-5 text-amber-400" />,
      title: 'Améliorez votre visibilité IA',
      description:
        `${brandName} est peu visible (score ${score}/100). Rédigez un article comparatif incluant votre marque pour apparaître dans les recommandations IA.`,
      cta: 'Créer un article',
      href: '/content',
      variant: 'default',
    }
  }

  // Check if a competitor appeared on a specific LLM in the previous scan
  if (scans.length >= 2) {
    const prev = scans[1]
    if (prev.results && latestScan.results) {
      const newCompetitorLLM = latestScan.results.find(
        (r) => !r.mentioned && prev.results!.find((pr) => pr.llm === r.llm)?.mentioned
      )
      if (newCompetitorLLM) {
        return {
          icon: <AlertTriangle className="h-5 w-5 text-amber-400" />,
          title: 'Un concurrent est apparu sur l\'IA',
          description: `Un concurrent a été détecté sur ${newCompetitorLLM.llm}. Analysez sa stratégie de contenu pour rester compétitif.`,
          cta: 'Analyser les concurrents',
          href: '/competitors',
          variant: 'default',
        }
      }
    }
  }

  // Default good score action
  return {
    icon: <Lightbulb className="h-5 w-5 text-green-400" />,
    title: 'Maintenez votre visibilité',
    description: `${brandName} est bien visible (score ${score}/100). Continuez à publier du contenu optimisé et planifiez des scans réguliers pour suivre votre évolution.`,
    cta: 'Voir les analyses',
    href: '/scans',
    variant: 'outline',
  }
}

export function NextBestAction({ scans, brandName, plan }: NextBestActionProps) {
  const action = resolveAction(scans, brandName)

  return (
    <div
      className="card-glow rounded-xl bg-card border border-primary/20 p-5 flex items-start gap-4"
      data-testid="next-best-action"
    >
      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        {action.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-primary uppercase tracking-wide mb-1">
          Action recommandée
        </p>
        <h3 className="font-semibold text-sm mb-1">{action.title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{action.description}</p>
      </div>
      {action.href && (
        <div className="shrink-0">
          <Link
            href={action.href}
            className={`inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${
              (action.variant ?? 'default') === 'default'
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'border border-border bg-transparent text-foreground hover:bg-secondary'
            }`}
          >
            {action.cta}
          </Link>
        </div>
      )}
    </div>
  )
}
