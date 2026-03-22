import Link from 'next/link'
import { Sparkles } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <Link href="/" className="inline-flex items-center gap-2 mb-8">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="font-bold text-xl">AIRank</span>
        </Link>
        <p className="text-8xl font-bold font-mono text-primary mb-4">404</p>
        <h1 className="text-2xl font-bold mb-2">Page introuvable</h1>
        <p className="text-muted-foreground mb-8">
          Cette page n&apos;existe pas ou a été déplacée.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-medium px-4 py-2 transition-colors hover:bg-primary/90"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  )
}
