'use client'

import { motion, useInView } from 'framer-motion'
import { useRef, useState } from 'react'
import { Check, Zap, Star, Loader2 } from 'lucide-react'
import Link from 'next/link'

const plans = [
  {
    name: 'Gratuit',
    price: 0,
    period: null,
    description: 'Pour découvrir AIRank',
    badge: null,
    planKey: null,
    features: [
      '1 scan de marque',
      'Score de visibilité basique',
      '2 LLMs (ChatGPT, Gemini)',
      'Résultats partiels',
    ],
    cta: 'Commencer gratuitement',
    href: '/signup',
    highlighted: false,
  },
  {
    name: 'Starter',
    price: 19,
    period: 'mois',
    description: 'Pour les indépendants',
    badge: null,
    planKey: 'STARTER',
    features: [
      '1 marque suivie',
      '10 requêtes analysées / jour',
      '3 LLMs (ChatGPT, Perplexity, Gemini)',
      'Historique 30 jours',
      'Alertes email',
      'Dashboard complet',
    ],
    cta: 'Démarrer Starter',
    href: null,
    highlighted: false,
  },
  {
    name: 'Pro',
    price: 49,
    period: 'mois',
    description: 'Pour les équipes marketing',
    badge: 'Plus populaire',
    planKey: 'PRO',
    features: [
      '3 marques suivies',
      '50 requêtes / jour',
      '4 LLMs (+ Claude)',
      'Historique 90 jours',
      'Rapports PDF export',
      "Analyse concurrents (jusqu'à 5)",
      'Recommandations IA personnalisées',
    ],
    cta: 'Démarrer Pro',
    href: null,
    highlighted: true,
  },
  {
    name: 'Agency',
    price: 99,
    period: 'mois',
    description: 'Pour les agences SEO',
    badge: null,
    planKey: 'AGENCY',
    features: [
      '10 marques',
      '200 requêtes / jour',
      'Tous les LLMs',
      'Historique illimité',
      'Rapports white-label',
      'API access',
      'Support prioritaire',
      'Multi-clients',
    ],
    cta: 'Démarrer Agency',
    href: null,
    highlighted: false,
  },
]

async function handleCheckout(planKey: string, setLoading: (k: string | null) => void) {
  setLoading(planKey)
  try {
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: planKey }),
    })
    const data = await res.json()
    if (data.url) {
      window.location.href = data.url
    } else if (res.status === 401) {
      window.location.href = `/signup?plan=${planKey.toLowerCase()}`
    } else {
      window.location.href = `/signup?plan=${planKey.toLowerCase()}`
    }
  } catch {
    window.location.href = `/signup?plan=${planKey.toLowerCase()}`
  }
  setLoading(null)
}

export function Pricing() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-50px' })
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)

  return (
    <section id="pricing" className="py-24 px-4">
      <div className="mx-auto max-w-6xl">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-1.5 text-sm text-muted-foreground">
            <Zap className="h-3.5 w-3.5 text-primary" />
            Tarifs simples, sans surprise
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Choisissez votre plan
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Commencez gratuitement, passez au plan payant quand vous êtes prêt.
            Annulation à tout moment.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.1 + i * 0.08, duration: 0.5 }}
              className={`relative rounded-2xl border p-6 flex flex-col ${
                plan.highlighted
                  ? 'border-primary bg-primary/5 shadow-[0_0_40px_-10px_rgba(99,102,241,0.3)]'
                  : 'border-border bg-card'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <div className="flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white shadow-lg">
                    <Star className="h-3 w-3" />
                    {plan.badge}
                  </div>
                </div>
              )}

              <div className="mb-6">
                <div className="text-sm font-medium text-muted-foreground mb-1">{plan.name}</div>
                <div className="flex items-end gap-1 mb-1">
                  {plan.price === 0 ? (
                    <span className="text-3xl font-bold">Gratuit</span>
                  ) : (
                    <>
                      <span className="text-3xl font-bold">{plan.price}€</span>
                      <span className="text-muted-foreground text-sm mb-1">/{plan.period}</span>
                    </>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{plan.description}</p>
              </div>

              <ul className="space-y-2.5 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm">
                    <Check className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              {plan.href ? (
                <Link
                  href={plan.href}
                  className={`block text-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                    plan.highlighted
                      ? 'bg-primary text-white hover:bg-primary/90 active:scale-95'
                      : 'border border-border bg-background hover:bg-muted text-foreground active:scale-95'
                  }`}
                >
                  {plan.cta}
                </Link>
              ) : (
                <button
                  onClick={() => plan.planKey && handleCheckout(plan.planKey, setLoadingPlan)}
                  disabled={loadingPlan === plan.planKey}
                  className={`w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all disabled:opacity-70 ${
                    plan.highlighted
                      ? 'bg-primary text-white hover:bg-primary/90 active:scale-95'
                      : 'border border-border bg-background hover:bg-muted text-foreground active:scale-95'
                  }`}
                >
                  {loadingPlan === plan.planKey && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {plan.cta}
                </button>
              )}
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.6 }}
          className="text-center text-sm text-muted-foreground mt-8"
        >
          💡 Lifetime Deal disponible à 59€ — Accès à vie au plan Pro.{' '}
          <Link href="/signup" className="text-primary hover:underline">
            En savoir plus →
          </Link>
        </motion.p>
      </div>
    </section>
  )
}
