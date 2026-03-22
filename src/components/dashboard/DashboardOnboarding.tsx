'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Zap } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function DashboardOnboarding() {
  const router = useRouter()
  const [brandName, setBrandName] = useState('')
  const [query, setQuery] = useState('')
  const [step, setStep] = useState<'idle' | 'creating' | 'scanning'>('idle')
  const [error, setError] = useState('')

  const loading = step !== 'idle'

  async function handleScan(e: React.FormEvent) {
    e.preventDefault()
    if (!brandName.trim() || !query.trim()) return
    setError('')
    setStep('creating')

    try {
      const brandRes = await fetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: brandName.trim(), keywords: [query.trim()] }),
      })
      const brandData = await brandRes.json()
      if (!brandRes.ok) {
        setError(brandData.error || 'Erreur lors de la création de la marque.')
        setStep('idle')
        return
      }

      setStep('scanning')

      const scanRes = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId: brandData.id, query: query.trim() }),
      })
      const scanData = await scanRes.json()
      if (!scanRes.ok) {
        setError(scanData.error || 'Erreur lors du scan.')
        setStep('idle')
        return
      }

      router.push(`/scans/${scanData.scan.id}`)
    } catch {
      setError('Une erreur est survenue.')
      setStep('idle')
    }
  }

  return (
    <form onSubmit={handleScan} className="space-y-5">
      {error && (
        <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Nom de votre marque</label>
          <Input
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            placeholder="Ex: Acme Corp"
            required
            disabled={loading}
            className="h-11"
          />
          <p className="text-xs text-muted-foreground">
            Le nom que l&apos;IA doit mentionner
          </p>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Requête à analyser</label>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ex: meilleur logiciel CRM pour PME"
            required
            disabled={loading}
            className="h-11"
          />
          <p className="text-xs text-muted-foreground">
            Ce que vos clients demandent aux LLMs
          </p>
        </div>
      </div>

      <Button
        type="submit"
        disabled={loading || !brandName.trim() || !query.trim()}
        size="lg"
        className="gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {step === 'creating' ? 'Création de la marque...' : 'Interrogation des LLMs (20s)...'}
          </>
        ) : (
          <>
            <Zap className="h-4 w-4" />
            Lancer l&apos;analyse
          </>
        )}
      </Button>
    </form>
  )
}
