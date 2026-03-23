'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Zap, ChevronRight, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const SECTORS = [
  'SaaS',
  'E-commerce',
  'Santé',
  'Finance',
  'Agences',
  'Consulting',
  'Retail',
  'Éducation',
  'Autre',
]

const SECTOR_QUERIES: Record<string, string[]> = {
  SaaS: [
    'meilleur logiciel SaaS pour la gestion de projet',
    'alternative à Notion pour les équipes',
    'outil de productivité recommandé par l\'IA',
  ],
  'E-commerce': [
    'meilleure plateforme e-commerce pour PME',
    'solution de vente en ligne recommandée',
    'outil de gestion boutique en ligne',
  ],
  Santé: [
    'meilleure application santé recommandée',
    'logiciel médical pour cabinets',
    'solution de télémédecine',
  ],
  Finance: [
    'meilleur logiciel de comptabilité pour entreprises',
    'solution de gestion financière recommandée',
    'outil de facturation pour PME',
  ],
  Agences: [
    'meilleure agence marketing digitale',
    'agence de communication recommandée',
    'agence web pour refonte de site',
  ],
  Consulting: [
    'meilleur cabinet de conseil en stratégie',
    'consultant recommandé pour la transformation digitale',
    'cabinet de conseil RH',
  ],
  Retail: [
    'meilleur logiciel de caisse pour commerces',
    'solution de gestion de stock recommandée',
    'outil retail pour boutiques physiques',
  ],
  Éducation: [
    'meilleure plateforme e-learning',
    'outil de formation en ligne recommandé',
    'logiciel de gestion scolaire',
  ],
  Autre: [
    'meilleure solution dans mon secteur',
    'outil recommandé par les professionnels',
    'alternative aux leaders du marché',
  ],
}

interface OnboardingWizardProps {
  onComplete: () => void
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [brandName, setBrandName] = useState('')
  const [brandDomain, setBrandDomain] = useState('')
  const [sector, setSector] = useState('')
  const [launching, setLaunching] = useState(false)
  const [error, setError] = useState('')

  const suggestedQueries = sector ? SECTOR_QUERIES[sector] ?? SECTOR_QUERIES['Autre'] : []

  async function saveOnboarding(completed: boolean, currentStep: number) {
    await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        completed,
        step: currentStep,
        sector: sector || undefined,
        brandName: brandName.trim() || undefined,
        brandDomain: brandDomain.trim() || undefined,
      }),
    })
  }

  async function handleSkip() {
    await saveOnboarding(true, step)
    onComplete()
  }

  async function handleLaunchScan() {
    if (!brandName.trim() || suggestedQueries.length === 0) return
    setError('')
    setLaunching(true)

    try {
      // Create brand
      const brandRes = await fetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: brandName.trim(),
          domain: brandDomain.trim() || undefined,
          keywords: suggestedQueries,
          sector,
        }),
      })
      const brandData = await brandRes.json()
      if (!brandRes.ok) {
        setError(brandData.error || 'Erreur lors de la création de la marque.')
        setLaunching(false)
        return
      }

      // Run scans in parallel
      await Promise.allSettled(
        suggestedQueries.map((q) =>
          fetch('/api/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ brandId: brandData.id, query: q }),
          })
        )
      )

      await saveOnboarding(true, 3)
      onComplete()
      router.refresh()
    } catch {
      setError('Une erreur est survenue. Veuillez réessayer.')
      setLaunching(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-center justify-center p-4"
      data-testid="onboarding-wizard"
    >
      <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-secondary">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Étape {step}/3</p>
                <h2 className="text-sm font-semibold">
                  {step === 1 && 'Votre marque'}
                  {step === 2 && 'Votre secteur'}
                  {step === 3 && 'Premier scan'}
                </h2>
              </div>
            </div>
            <button
              onClick={handleSkip}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Ignorer l'onboarding"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Step 1 — Brand */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-xl font-bold mb-1">Bienvenue sur AIRank</h3>
                <p className="text-muted-foreground text-sm">
                  Commençons par identifier votre marque pour mesurer sa visibilité IA.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Nom de la marque *</label>
                  <Input
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="Ex: Acme Corp"
                    className="h-11"
                    data-testid="brand-name-input"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">
                    Domaine{' '}
                    <span className="text-muted-foreground font-normal">(optionnel)</span>
                  </label>
                  <Input
                    value={brandDomain}
                    onChange={(e) => setBrandDomain(e.target.value)}
                    placeholder="Ex: monsite.fr"
                    className="h-11"
                    data-testid="brand-domain-input"
                  />
                </div>
              </div>

              <Button
                className="w-full gap-2"
                onClick={() => setStep(2)}
                disabled={!brandName.trim()}
                data-testid="step1-next"
              >
                Suivant <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Step 2 — Sector */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-xl font-bold mb-1">Votre secteur</h3>
                <p className="text-muted-foreground text-sm">
                  Choisissez votre secteur pour des suggestions de requêtes adaptées.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {SECTORS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSector(s)}
                    data-testid={`sector-${s}`}
                    className={`rounded-lg border px-3 py-3 text-sm font-medium transition-all text-center ${
                      sector === s
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-secondary/30 text-muted-foreground hover:border-primary/50 hover:text-foreground'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Retour
                </Button>
                <Button
                  className="flex-1 gap-2"
                  onClick={() => setStep(3)}
                  disabled={!sector}
                  data-testid="step2-next"
                >
                  Suivant <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3 — First scan */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-xl font-bold mb-1">Premier scan</h3>
                <p className="text-muted-foreground text-sm">
                  Nous allons analyser la visibilité de{' '}
                  <span className="text-foreground font-medium">{brandName}</span> sur ces requêtes.
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Requêtes suggérées ({suggestedQueries.length})
                </p>
                {suggestedQueries.map((q) => (
                  <div
                    key={q}
                    className="rounded-lg bg-secondary/50 border border-border px-4 py-2.5 text-sm"
                  >
                    {q}
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  className="w-full gap-2"
                  onClick={handleLaunchScan}
                  disabled={launching}
                  data-testid="launch-scan"
                >
                  {launching ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Lancement du scan...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4" />
                      Lancer le scan
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleSkip}
                  disabled={launching}
                  className="text-muted-foreground"
                  data-testid="skip-button"
                >
                  Ignorer
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
