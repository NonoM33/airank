'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Users, Check, X } from 'lucide-react'

function AcceptContent() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get('token')
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Token manquant')
      return
    }
    fetch('/api/teams/accept-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (r) => {
        if (r.ok) {
          setStatus('ok')
          setTimeout(() => router.push('/team'), 1800)
        } else {
          const d = await r.json()
          setStatus('error')
          setMessage(d.error ?? 'Erreur')
        }
      })
      .catch(() => {
        setStatus('error')
        setMessage('Erreur réseau')
      })
  }, [token, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full rounded-xl border border-border bg-card p-8 text-center">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          {status === 'ok' ? (
            <Check className="h-6 w-6 text-green-500" />
          ) : status === 'error' ? (
            <X className="h-6 w-6 text-destructive" />
          ) : (
            <Users className="h-6 w-6 text-primary animate-pulse" />
          )}
        </div>
        <h1 className="text-lg font-bold mb-2">
          {status === 'loading' && 'Acceptation en cours…'}
          {status === 'ok' && 'Invitation acceptée'}
          {status === 'error' && 'Erreur'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {status === 'ok' && 'Redirection vers votre équipe…'}
          {status === 'error' && message}
        </p>
      </div>
    </div>
  )
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Chargement…</div>}>
      <AcceptContent />
    </Suspense>
  )
}
