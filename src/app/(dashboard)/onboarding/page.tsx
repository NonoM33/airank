'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Check, ArrowRight } from 'lucide-react'

const SECTORS = [
  'SaaS',
  'E-commerce',
  'Services B2B',
  'Conseil',
  'Marketing / Agence',
  'Finance',
  'Santé',
  'Education',
  'Media',
  'Autre',
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [sector, setSector] = useState('')
  const [brandName, setBrandName] = useState('')
  const [brandDomain, setBrandDomain] = useState('')
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/onboarding')
      .then((r) => r.json())
      .then((d) => {
        if (d?.onboardingCompleted) {
          router.replace('/dashboard')
          return
        }
        setStep(d?.onboardingStep ?? 0)
        setSector(d?.sector ?? '')
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [router])

  const persist = async (newStep: number, completed = false, extra?: Record<string, unknown>) => {
    await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        completed,
        step: newStep,
        ...(sector ? { sector } : {}),
        ...extra,
      }),
    })
  }

  const next = async () => {
    setSaving(true)
    if (step === 0 && sector) {
      await persist(1)
      setStep(1)
    } else if (step === 1 && brandName.trim()) {
      // Create the first brand
      await fetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: brandName.trim(),
          domain: brandDomain.trim() || undefined,
          sector: sector || undefined,
          keywords: [],
        }),
      })
      await persist(2)
      setStep(2)
    } else if (step === 2) {
      await persist(3, true)
      router.push('/dashboard')
    }
    setSaving(false)
  }

  const skip = async () => {
    await persist(3, true)
    router.push('/dashboard')
  }

  if (!loaded) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center text-sm text-muted-foreground">
        Chargement…
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Bienvenue sur AIRank</h1>
          <p className="text-sm text-muted-foreground">3 étapes pour lancer votre premier scan</p>
        </div>
        <button onClick={skip} className="ml-auto text-xs text-muted-foreground hover:text-foreground">
          Passer
        </button>
      </div>

      <div className="flex items-center gap-2 mb-6">
        {[0, 1, 2].map((s) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full ${s <= step ? 'bg-primary' : 'bg-muted'}`}
          />
        ))}
      </div>

      {step === 0 && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-semibold mb-1">Quel est votre secteur ?</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Cela nous aide à suggérer les bonnes requêtes pour vos scans.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {SECTORS.map((s) => (
              <button
                key={s}
                onClick={() => setSector(s)}
                className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                  sector === s
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:bg-accent'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-semibold mb-1">Votre première marque</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Le nom que les IA doivent reconnaître dans leurs réponses.
          </p>
          <label className="block text-xs text-muted-foreground mb-1">Nom de la marque</label>
          <input
            type="text"
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            placeholder="Ex: Airbnb, Klarna, Stripe…"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm mb-3"
          />
          <label className="block text-xs text-muted-foreground mb-1">Domaine (optionnel)</label>
          <input
            type="text"
            value={brandDomain}
            onChange={(e) => setBrandDomain(e.target.value)}
            placeholder="exemple.com"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
      )}

      {step === 2 && (
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
            <Check className="h-6 w-6 text-green-500" />
          </div>
          <h2 className="font-semibold mb-1">Tout est prêt !</h2>
          <p className="text-sm text-muted-foreground">
            Lancez votre premier scan depuis le tableau de bord pour voir comment les IA parlent de votre marque.
          </p>
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <button
          onClick={next}
          disabled={saving || (step === 0 && !sector) || (step === 1 && !brandName.trim())}
          className="rounded-lg bg-primary text-primary-foreground px-5 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
        >
          {step === 2 ? 'Aller au dashboard' : 'Continuer'}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
