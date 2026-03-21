import Link from 'next/link'
import { Zap } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/30 py-12 px-4">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg mb-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
                <Zap className="h-3.5 w-3.5 text-white" />
              </div>
              AIRank
            </Link>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Analysez votre visibilité IA sur ChatGPT, Claude, Perplexity et Gemini.
            </p>
          </div>

          {/* Produit */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Produit
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#features" className="hover:text-foreground transition-colors">Fonctionnalités</a></li>
              <li><a href="#pricing" className="hover:text-foreground transition-colors">Tarifs</a></li>
              <li><a href="#faq" className="hover:text-foreground transition-colors">FAQ</a></li>
              <li><Link href="/signup" className="hover:text-foreground transition-colors">Scan gratuit</Link></li>
            </ul>
          </div>

          {/* Ressources */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Ressources
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/blog" className="hover:text-foreground transition-colors">Blog</Link></li>
              <li><Link href="/docs" className="hover:text-foreground transition-colors">Documentation API</Link></li>
              <li><Link href="/changelog" className="hover:text-foreground transition-colors">Changelog</Link></li>
            </ul>
          </div>

          {/* Légal */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Légal
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/privacy" className="hover:text-foreground transition-colors">Confidentialité</Link></li>
              <li><Link href="/terms" className="hover:text-foreground transition-colors">CGU</Link></li>
              <li><Link href="/mentions-legales" className="hover:text-foreground transition-colors">Mentions légales</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © 2026 AIRank.fr — Fait avec ❤️ en France
          </p>
          <p className="text-xs text-muted-foreground">
            Hébergé sur serveurs européens · RGPD conforme
          </p>
        </div>
      </div>
    </footer>
  )
}
