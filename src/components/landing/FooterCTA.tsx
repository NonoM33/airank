'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { ArrowRight, Zap } from 'lucide-react'
import Link from 'next/link'

export function FooterCTA() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-50px' })

  return (
    <section className="py-24 px-4 bg-card/30">
      <div className="mx-auto max-w-4xl">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="relative rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-violet-500/5 to-indigo-500/10 p-12 sm:p-16 text-center overflow-hidden"
        >
          {/* Ambient glow */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-primary/10 blur-[100px]" />
            <div className="absolute right-0 bottom-0 h-[200px] w-[200px] rounded-full bg-indigo-500/10 blur-[60px]" />
          </div>

          <div className="relative z-10">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 0.1 }}
              className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary"
            >
              <Zap className="h-3.5 w-3.5" />
              20 crédits gratuits · Sans carte bancaire
            </motion.div>

            {/* Headline */}
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.15, duration: 0.5 }}
              className="text-3xl sm:text-5xl font-bold tracking-tight mb-4 leading-tight"
            >
              Vos concurrents vous devancent déjà.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-primary to-indigo-400">
                Découvrez pourquoi.
              </span>
            </motion.h2>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-muted-foreground text-lg max-w-xl mx-auto mb-10"
            >
              Scannez votre marque gratuitement et obtenez votre score de visibilité IA
              en 30 secondes.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.25, duration: 0.5 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link
                href="/signup"
                className="flex items-center gap-2 rounded-xl bg-primary px-8 py-4 text-base font-semibold text-white hover:bg-primary/90 transition-all active:scale-95 shadow-xl shadow-primary/30"
              >
                Scanner ma marque gratuitement
                <ArrowRight className="h-5 w-5" />
              </Link>
              <a
                href="#pricing"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Voir les tarifs →
              </a>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
