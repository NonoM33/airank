'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import {
  Brain,
  BarChart3,
  Wrench,
  Activity,
  PieChart,
  ListChecks,
  Bell,
  FileText,
  TrendingUp,
  Download,
  LayoutGrid,
} from 'lucide-react'

const features = [
  {
    icon: Brain,
    title: 'Scan multi-LLM simultané',
    description:
      'ChatGPT, Claude, Perplexity et Gemini interrogés en parallèle. Vue 360° de votre présence IA, résultats en moins de 30 secondes.',
    color: 'text-primary',
    bg: 'bg-primary/10',
    span: 'lg:col-span-2',
  },
  {
    icon: BarChart3,
    title: 'Score de visibilité IA',
    description:
      'Score 0-100 basé sur taux de mention, position et sentiment. Benchmark sectoriel radar chart inclus.',
    color: 'text-violet-400',
    bg: 'bg-violet-400/10',
    span: '',
  },
  {
    icon: Wrench,
    title: 'Outils SEO IA',
    description:
      'Audit SEO, optimiseur de contenu, générateur FAQ + JSON-LD, analyse des citations. Tout pour dominer le GEO.',
    color: 'text-[#10A37F]',
    bg: 'bg-[#10A37F]/10',
    span: '',
  },
  {
    icon: Activity,
    title: 'Performance Web',
    description:
      'Core Web Vitals, score Lighthouse, opportunités PageSpeed API. Votre vitesse impacte votre visibilité IA.',
    color: 'text-[#4285F4]',
    bg: 'bg-[#4285F4]/10',
    span: '',
  },
  {
    icon: PieChart,
    title: 'Analytics avancées',
    description:
      'Radar chart sectoriel, matrice couverture LLM, score d\'autorité, analyse de sentiment profond.',
    color: 'text-indigo-400',
    bg: 'bg-indigo-400/10',
    span: '',
  },
  {
    icon: ListChecks,
    title: 'Plans d\'action',
    description:
      'Recommandations personnalisées générées par IA. Vérification automatique de leur implémentation.',
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    span: '',
  },
  {
    icon: Bell,
    title: 'Veille & Alertes',
    description:
      'Monitoring continu, alertes baisse de score, suivi concurrents en temps réel. Ne ratez rien.',
    color: 'text-rose-400',
    bg: 'bg-rose-400/10',
    span: '',
  },
  {
    icon: FileText,
    title: 'Génération de contenu',
    description:
      'Articles SEO, FAQ, communiqués de presse optimisés pour l\'indexation IA. Générez en 1 clic.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
    span: '',
  },
  {
    icon: TrendingUp,
    title: 'Comparaison de scans',
    description:
      'Mesurez votre progression dans le temps. Comparez deux périodes et visualisez votre évolution.',
    color: 'text-cyan-400',
    bg: 'bg-cyan-400/10',
    span: '',
  },
  {
    icon: Download,
    title: 'Rapports PDF',
    description:
      'Export professionnel, white-label pour agences. Impressionnez vos clients avec des rapports branded.',
    color: 'text-orange-400',
    bg: 'bg-orange-400/10',
    span: 'lg:col-span-2',
  },
  {
    icon: LayoutGrid,
    title: 'Heatmap LLM',
    description:
      'Visualisez votre présence sur chaque requête × chaque LLM. Spots chauds et zones de progression.',
    color: 'text-pink-400',
    bg: 'bg-pink-400/10',
    span: '',
  },
]

function FeatureCard({
  feature,
  delay,
}: {
  feature: (typeof features)[0]
  delay: number
}) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-50px' })
  const Icon = feature.icon

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay }}
      className={`rounded-2xl border border-border bg-card p-6 hover:border-primary/40 transition-all group hover:shadow-lg hover:shadow-primary/5 ${feature.span}`}
    >
      <div
        className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl ${feature.bg}`}
      >
        <Icon className={`h-5 w-5 ${feature.color}`} />
      </div>
      <h3 className="mb-2 font-semibold tracking-tight">{feature.title}</h3>
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
            11 outils, une seule plateforme
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Tout ce qu&apos;il faut pour{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">
              dominer l&apos;IA
            </span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            De la mesure à l&apos;action, AIRank couvre l&apos;intégralité de votre
            stratégie de visibilité dans les LLMs.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, i) => (
            <FeatureCard key={feature.title} feature={feature} delay={i * 0.06} />
          ))}
        </div>
      </div>
    </section>
  )
}
