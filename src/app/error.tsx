'use client'

import Link from 'next/link'
import { Button, buttonVariants } from '@/components/ui/button'
import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-8xl font-bold font-mono text-destructive mb-4">500</p>
        <h1 className="text-2xl font-bold mb-2">Une erreur est survenue</h1>
        <p className="text-muted-foreground mb-8">
          Quelque chose s&apos;est mal passé. Réessayez ou revenez à l&apos;accueil.
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={reset} variant="outline">
            Réessayer
          </Button>
          <Link href="/" className={buttonVariants({ variant: 'default' })}>
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </div>
  )
}
