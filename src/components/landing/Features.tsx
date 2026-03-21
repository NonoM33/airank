'use client'

import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { Brain, BarChart3, Users, Bell, FileText, Globe } from 'lucide-react'

const features = [
  {
    icon: Brain,
    title: 'Scan multi-LLM simultané',
    description:
      'Analysez votre visibilité sur ChatGPT, Claude, Perplexity et Gemini en un seul clic. Résultats en moins de 30 secondes.',
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  {
    icon: BarChart3,
    title: 'Score de visibilité IA',
    description:
      'Un score 0-100 calculé selon votre taux de mention, votre position dans les réponses et le sentiment associé à votre marque.',
    color: 'text-success',
    bg: 'bg-success/10',
  },
  {
    icon: Users,
    title: 'Analyse concurrentielle',
    description:
      'Découvrez quels concurrents sont recommandés à votre place. Visualisez votre positionnement dans l\'écosystème IA.',
    color: 'text-warning',
    bg: 'bg-warning/10',
  },
  {
    icon: Bell,
    title: 'Alertes en temps réel',
    description:
      'Recevez une notification dès que votre marque apparaît ou disparaît d\'une réponse LLM. Ne ratez aucun changement.',
    color: 'text-[#4285F4]',
    bg: 'bg-[#4285F4]/10',
  },
  {
    icon: FileText,
    title: 'Rapports PDF exportables',
    description:
      'Générez des rapports professionnels pour vos clients. Support white-label disponible sur le plan Agency.',
    color: 'text-[#D97706]',
    bg: 'bg-[#D97706]/10',
  },
  {
    icon: Globe,
    title: 'Historique & tendances',
    description:
      'Suivez l\'évolution de votre score dans le temps. Identifiez les requêtes où vous progressez ou régressez.',
    color: 'text-[#10A37F]',
    bg: 'bg-[#10A37F]/10',
  },
]

function FeatureCard({ feature, delay }: { feature: typeof features[0]; delay: number }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-50px' })
  const Icon = feature.icon

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay }}
      className="rounded-2xl border border-border bg-card p-6 hover:border-primary/40 transition-colors group"
    >
      <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl ${feature.bg}`}>
        <Icon className={`h-5 w-5 ${feature.color}`} />
      </div>
      <h3 className="mb-2 font-semibold text-foreground">{feature.title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
    </motion.div>
  )
}

export function Features() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-50px' })

  return (
    <section id="features" className="py-24 px-4">
      <div className="mx-auto max-w-6xl">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-1.5 text-sm text-muted-foreground">
            Tout ce dont vous avez besoin
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            La plateforme complète pour votre{' '}
            <span className="text-primary">visibilité IA</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            AIRank vous donne toutes les données pour comprendre et améliorer comment
            les LLMs perçoivent votre marque.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <FeatureCard key={feature.title} feature={feature} delay={i * 0.08} />
          ))}
        </div>
      </div>
    </section>
  )
}
