import { auth } from '@/lib/auth'
import { getPlanLimits } from '@/lib/plan-data'
import { Palette, Lock } from 'lucide-react'
import WhiteLabelClient from './WhiteLabelClient'
import Link from 'next/link'

export default async function WhiteLabelPage() {
  const session = await auth()
  const plan = (session?.user as { plan?: string } | undefined)?.plan ?? 'FREE'
  const limits = getPlanLimits(plan)

  // Server-side guard (#35): FREE/STARTER/PRO see a teaser, not the editor.
  if (!limits.whiteLabel) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Palette className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Marque blanche</h1>
            <p className="text-sm text-muted-foreground">
              Personnalisez l&apos;apparence pour vos clients
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Lock className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-lg font-semibold mb-2">Fonctionnalité Agency</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            Logo, couleurs, domaine personnalisé, rapports clients shareables — tout ce qu&apos;il faut pour une expérience vraiment agence, sans branding AIRank visible.
          </p>
          <ul className="text-left text-sm text-muted-foreground max-w-md mx-auto mb-6 space-y-2">
            <li>✓ Logo + favicon personnalisés</li>
            <li>✓ Couleurs primaire &amp; accent</li>
            <li>✓ Domaine sur-mesure (CNAME)</li>
            <li>✓ Rapports clients shareables via lien</li>
            <li>✓ Masquage du branding AIRank</li>
          </ul>
          <Link
            href="/billing?target=AGENCY"
            className="inline-block px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90"
          >
            Passer en Agency →
          </Link>
        </div>
      </div>
    )
  }

  return <WhiteLabelClient />
}
