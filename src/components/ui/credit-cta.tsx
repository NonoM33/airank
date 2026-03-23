'use client'

import { Zap, ArrowRight, Sparkles } from 'lucide-react'
import Link from 'next/link'

interface CreditCTAProps {
  /** Shown inline in error positions */
  variant?: 'inline' | 'banner' | 'card'
  /** How many credits the action costs */
  cost?: number
  /** Custom message */
  message?: string
}

export function CreditCTA({ variant = 'inline', cost, message }: CreditCTAProps) {
  if (variant === 'banner') {
    return (
      <div className="rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">
              {message || 'Crédits insuffisants pour cette action'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {cost ? `Cette action coûte ${cost} crédits. ` : ''}Rechargez en quelques secondes pour continuer.
            </p>
          </div>
          <Link
            href="/billing"
            className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            Recharger
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    )
  }

  if (variant === 'card') {
    return (
      <div className="rounded-xl border border-primary/20 bg-card p-6 text-center space-y-3">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Zap className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="font-semibold">{message || 'Crédits insuffisants'}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {cost ? `Il vous faut ${cost} crédits. ` : ''}Rechargez pour débloquer cette fonctionnalité.
          </p>
        </div>
        <Link
          href="/billing"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Sparkles className="h-4 w-4" />
          Recharger des crédits
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <div className="flex justify-center gap-4 text-[10px] text-muted-foreground">
          <span>50 crédits → 9€</span>
          <span>200 crédits → 29€</span>
          <span>500 crédits → 59€</span>
        </div>
      </div>
    )
  }

  // inline variant — replaces red error text
  return (
    <Link
      href="/billing"
      className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary hover:bg-primary/20 transition-colors"
    >
      <Zap className="h-3.5 w-3.5" />
      <span>{message || 'Crédits insuffisants'}</span>
      <span className="font-semibold">— Recharger →</span>
    </Link>
  )
}

/**
 * Helper: check if an API error is a credit error (402) and return CTA instead of red text
 */
export function isCreditError(status: number, errorMessage?: string): boolean {
  return status === 402 || (errorMessage?.toLowerCase().includes('crédit') ?? false)
}
