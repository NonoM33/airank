'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Search, Zap, CheckCircle } from 'lucide-react'

const steps = [
  {
    icon: Search,
    title: 'Entrez votre marque',
    description:
      'Tapez le nom de votre entreprise. AIRank identifie automatiquement votre secteur et génère les requêtes pertinentes pour votre industrie.',
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary/30',
    glow: 'shadow-primary/20',
  },
  {
    icon: Zap,
    title: 'On scanne 4 LLMs en simultané',
    description:
      "Nos robots interrogent ChatGPT, Claude, Perplexity et Gemini avec vos requêtes. Analyse de sentiment, position et couverture inclus — en 30 secondes.",
    color: 'text-violet-400',
    bg: 'bg-violet-400/10',
    border: 'border-violet-400/30',
    glow: 'shadow-violet-400/20',
  },
  {
    icon: CheckCircle,
    title: 'Recevez votre plan d\'action',
    description:
      "Score 0-100, analyse concurrentielle, heatmap LLM et recommandations personnalisées. Chaque action est vérifiée automatiquement après implémentation.",
    color: 'text-[#10A37F]',
    bg: 'bg-[#10A37F]/10',
    border: 'border-[#10A37F]/30',
    glow: 'shadow-[#10A37F]/20',
  },
]

export function HowItWorks() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-50px' })

  return (
    <section className="py-24 px-4 bg-card/20">
      <div className="mx-auto max-w-6xl">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-1.5 text-sm text-muted-foreground">
            Simple comme bonjour
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            De zéro à votre plan d&apos;action{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">
              en 30 secondes
            </span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Pas de configuration, pas d&apos;intégration complexe. Juste votre nom de marque.
          </p>
        </motion.div>

        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6">
          {/* Connector line on desktop */}
          <div
            className="hidden md:block absolute top-14 left-[calc(33%+2rem)] right-[calc(33%+2rem)] h-px"
            style={{
              background:
                'linear-gradient(to right, rgba(99,102,241,0.4), rgba(139,92,246,0.6), rgba(16,163,127,0.4))',
            }}
          />

          {steps.map((step, i) => {
            const Icon = step.icon
            return (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 28 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.55, delay: i * 0.15 }}
                className="relative flex flex-col items-center text-center px-4"
              >
                {/* Icon circle */}
                <div
                  className={`relative mb-6 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl border ${step.border} ${step.bg} shadow-xl ${step.glow}`}
                >
                  <Icon className={`h-7 w-7 ${step.color}`} />
                  {/* Step number badge */}
                  <span
                    className={`absolute -top-3 -right-3 flex h-6 w-6 items-center justify-center rounded-full bg-background border-2 ${step.border} text-xs font-bold ${step.color}`}
                  >
                    {i + 1}
                  </span>
                </div>

                <h3 className="text-lg font-semibold mb-3 tracking-tight">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                  {step.description}
                </p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
