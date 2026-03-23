'use client'

import { motion, useInView } from 'framer-motion'
import { useRef, useState } from 'react'
import { Check, Zap, Star, Loader2, Info, Plus } from 'lucide-react'
import Link from 'next/link'

const plans = [
  {
    name: 'Gratuit',
    price: 0,
    credits: 20,
    period: null,
    description: 'Pour découvrir AIRank',
    badge: null,
    planKey: null,
    features: [
      '20 crédits offerts (one-time)',
      '4 LLMs complets',
      '~20 scans de marque',
      'Score de visibilité IA',
      'Rapport partiel',
    ],
    cta: 'Commencer gratuitement',
    href: '/signup',
    highlighted: false,
  },
  {
    name: 'Starter',
    price: 19,
    credits: 50,
    period: 'mois',
    description: 'Pour les indépendants',
    badge: null,
    planKey: 'STARTER',
    features: [
      '50 crédits / mois',
      '4 LLMs complets',
      'Score + sentiment + position',
      'Alertes email',
      'Dashboard complet',
      'Historique 30 jours',
    ],
    cta: 'Démarrer Starter',
    href: null,
    highlighted: false,
  },
  {
    name: 'Pro',
    price: 49,
    credits: 200,
    period: 'mois',
    description: 'Pour les équipes marketing',
    badge: 'Plus populaire',
    planKey: 'PRO',
    features: [
      '200 crédits / mois',
      'Outils SEO IA complets',
      'Génération de contenu',
      'Rapports PDF export',
      'Comparaison de scans',
      'Plans d\'action IA',
      'Heatmap LLM',
    ],
    cta: 'Démarrer Pro',
    href: null,
    highlighted: true,
  },
  {
    name: 'Agency',
    price: 99,
    credits: 1000,
    period: 'mois',
    description: 'Pour les agences SEO',
    badge: null,
    planKey: 'AGENCY',
    features: [
      '1 000 crédits / mois',
      'Toutes les features Pro',
      'Rapports white-label',
      'Multi-marques illimité',
      'API access',
      'Support prioritaire',
    ],
    cta: 'Démarrer Agency',
    href: null,
    highlighted: false,
  },
]

const creditCosts = [
  { action: 'Scan de marque', cost: 1, emoji: '⚡' },
  { action: 'Analyse approfondie', cost: 2, emoji: '📊' },
  { action: 'Benchmark sectoriel', cost: 3, emoji: '🎯' },
  { action: 'Génération de contenu', cost: 3, emoji: '✍️' },
]

const creditPacks = [
  { credits: 50, price: 9, perCredit: '0.18€/cr.', popular: false, best: false },
  { credits: 200, price: 29, perCredit: '0.14€/cr.', popular: true, best: false },
  { credits: 500, price: 59, perCredit: '0.12€/cr.', popular: false, best: true },
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
        {/* Header */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-1.5 text-sm text-muted-foreground">
            <Zap className="h-3.5 w-3.5 text-primary" />
            Payez ce que vous utilisez
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Tarifs simples,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">
              sans mauvaise surprise
            </span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Système de crédits flexible. Commencez gratuitement,
            rechargez quand vous voulez.
          </p>
        </motion.div>

        {/* Credit cost reference */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="mb-12 rounded-2xl border border-border bg-card/50 p-5 max-w-2xl mx-auto"
        >
          <div className="flex items-center gap-2 mb-4">
            <Info className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Coût par action</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {creditCosts.map((item) => (
              <div
                key={item.action}
                className="text-center rounded-xl bg-background/60 px-3 py-3 border border-border"
              >
                <div className="text-2xl mb-1">{item.emoji}</div>
                <div className="text-lg font-bold text-primary">
                  {item.cost} crédit{item.cost > 1 ? 's' : ''}
                </div>
                <div className="text-xs text-muted-foreground leading-tight mt-0.5">
                  {item.action}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Plans */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-16">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.15 + i * 0.08, duration: 0.5 }}
              className={`relative rounded-2xl border p-6 flex flex-col ${
                plan.highlighted
                  ? 'border-primary bg-primary/5 shadow-[0_0_50px_-10px_rgba(99,102,241,0.35)]'
                  : 'border-border bg-card'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <div className="flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white shadow-lg shadow-primary/30">
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
                <div className="text-xs font-medium text-primary mb-1">
                  {plan.credits === 20
                    ? `${plan.credits} crédits offerts`
                    : `${plan.credits.toLocaleString('fr-FR')} crédits / mois`}
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
                  className={`block text-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-all active:scale-95 ${
                    plan.highlighted
                      ? 'bg-primary text-white hover:bg-primary/90'
                      : 'border border-border bg-background hover:bg-muted text-foreground'
                  }`}
                >
                  {plan.cta}
                </Link>
              ) : (
                <button
                  onClick={() => plan.planKey && handleCheckout(plan.planKey, setLoadingPlan)}
                  disabled={loadingPlan === plan.planKey}
                  className={`w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all active:scale-95 disabled:opacity-70 ${
                    plan.highlighted
                      ? 'bg-primary text-white hover:bg-primary/90'
                      : 'border border-border bg-background hover:bg-muted text-foreground'
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

        {/* Credit recharges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <div className="text-center mb-8">
            <h3 className="text-xl font-bold mb-2 flex items-center justify-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Recharges de crédits
            </h3>
            <p className="text-sm text-muted-foreground">
              Disponibles sur tous les plans · Aucun abonnement supplémentaire · Valables à vie
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {creditPacks.map((pack, i) => (
              <motion.div
                key={pack.credits}
                initial={{ opacity: 0, y: 16 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.45 + i * 0.08, duration: 0.4 }}
                className={`relative rounded-2xl border p-5 text-center transition-colors ${
                  pack.popular
                    ? 'border-primary/50 bg-primary/5'
                    : pack.best
                    ? 'border-[#10A37F]/50 bg-[#10A37F]/5'
                    : 'border-border bg-card'
                }`}
              >
                {pack.popular && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs font-semibold bg-primary text-white px-3 py-0.5 rounded-full whitespace-nowrap">
                    Populaire
                  </div>
                )}
                {pack.best && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs font-semibold bg-[#10A37F] text-white px-3 py-0.5 rounded-full whitespace-nowrap">
                    Meilleur tarif
                  </div>
                )}
                <div className="text-xl font-bold mb-0.5">{pack.credits} crédits</div>
                <div className="text-3xl font-bold text-primary mb-1">{pack.price}€</div>
                <div className="text-xs text-muted-foreground">{pack.perCredit}</div>
              </motion.div>
            ))}
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Annulation à tout moment · Remboursement sous 14 jours · Serveurs européens · RGPD
          </p>
        </motion.div>
      </div>
    </section>
  )
}
