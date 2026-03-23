'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Star } from 'lucide-react'

const testimonials = [
  {
    quote:
      "On ne savait pas que nos concurrents étaient recommandés par ChatGPT et pas nous. AIRank nous l'a révélé en 30 secondes. C'est devenu un outil indispensable pour nos audits clients.",
    name: 'Marie Dubois',
    role: 'Directrice SEO',
    company: 'Agence WebFlow Paris',
    initials: 'MD',
    color: 'bg-primary',
    stars: 5,
  },
  {
    quote:
      "J'ai scanné 12 de mes clients avec AIRank. 9 étaient invisibles pour les LLMs sans le savoir. C'est devenu un argument de vente massif pour proposer un nouveau service d'optimisation IA.",
    name: 'Thomas Laurent',
    role: 'Consultant Marketing Digital',
    company: 'Lyon',
    initials: 'TL',
    color: 'bg-[#10A37F]',
    stars: 5,
  },
  {
    quote:
      "Notre score est passé de 23 à 71 en 6 semaines grâce aux recommandations d'AIRank. On voit maintenant notre marque citée dans les réponses Perplexity sur nos requêtes clés.",
    name: 'Sophie Martin',
    role: 'CEO',
    company: 'TechStartup Bordeaux',
    initials: 'SM',
    color: 'bg-[#D97706]',
    stars: 5,
  },
]

const stats = [
  { value: '2 847+', label: 'Marques scannées' },
  { value: '+47%', label: 'Score moyen en 6 semaines' },
  { value: '94%', label: 'Clients satisfaits' },
  { value: '4 LLMs', label: 'En simultané' },
]

export function Testimonials() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-50px' })

  return (
    <section className="py-24 px-4 bg-card/30">
      <div className="mx-auto max-w-6xl">
        {/* Stats bar */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-20 p-8 rounded-3xl border border-border bg-card/60 backdrop-blur"
        >
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="text-center"
            >
              <div className="font-mono text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400 mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Section header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Ils ont transformé leur visibilité IA
          </h2>
          <p className="text-muted-foreground text-lg">
            Des agences SEO aux startups, ils ont tous commencé par un scan gratuit.
          </p>
        </div>

        {/* Testimonial cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.2 + i * 0.1, duration: 0.5 }}
              className="rounded-2xl border border-border bg-card p-6 flex flex-col gap-4 hover:border-primary/30 transition-colors"
            >
              {/* Stars */}
              <div className="flex gap-0.5">
                {Array.from({ length: t.stars }).map((_, j) => (
                  <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed flex-1 italic">
                &ldquo;{t.quote}&rdquo;
              </p>

              <div className="flex items-center gap-3 pt-2 border-t border-border">
                <div
                  className={`h-9 w-9 rounded-full ${t.color} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}
                >
                  {t.initials}
                </div>
                <div>
                  <div className="text-sm font-semibold">{t.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {t.role} · {t.company}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
