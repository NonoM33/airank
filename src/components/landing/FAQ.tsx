'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { ChevronDown } from 'lucide-react'

const faqs = [
  {
    q: 'Comment fonctionne AIRank ?',
    a: "AIRank envoie vos requêtes sectorielles aux 4 principaux LLMs (ChatGPT, Claude, Perplexity, Gemini) en temps réel. Il analyse les réponses pour détecter si votre marque est mentionnée, à quelle position, avec quel sentiment, et quels concurrents sont cités à la place.",
  },
  {
    q: 'Quels LLMs sont analysés ?',
    a: "Les 4 principaux : OpenAI ChatGPT (GPT-4o-mini), Anthropic Claude (Haiku), Perplexity AI (Sonar), et Google Gemini (Flash). Les plans Starter et Pro incluent 3 à 4 LLMs selon le niveau souscrit.",
  },
  {
    q: 'À quelle fréquence les analyses sont-elles effectuées ?',
    a: "Sur le plan Starter, vous pouvez lancer jusqu'à 10 requêtes par jour. Sur le plan Pro, jusqu'à 50. Les scans programmés tournent automatiquement chaque matin à 6h pour tous vos mots-clés configurés.",
  },
  {
    q: 'Comment améliorer mon score de visibilité IA ?',
    a: "Les LLMs puisent dans les données du web. Pour y apparaître : publiez du contenu de qualité régulièrement, obtenez des mentions sur des sites reconnus, répondez aux avis en ligne, et assurez-vous d'avoir une présence Wikipedia ou Wikidata. AIRank vous donne des recommandations personnalisées en fonction de votre score.",
  },
  {
    q: 'Puis-je analyser plusieurs marques ou concurrents ?',
    a: "Oui. Le plan Pro permet de suivre 3 marques simultanément avec l'analyse de 5 concurrents. Le plan Agency monte à 10 marques. Vous pouvez aussi comparer votre score à celui de vos concurrents dans le dashboard.",
  },
  {
    q: 'Mes données sont-elles sécurisées ?',
    a: "Vos requêtes sont envoyées directement aux APIs des LLMs et ne sont pas partagées avec des tiers. Les résultats sont stockés chiffrés sur nos serveurs européens (Coolify, France). Vous pouvez supprimer vos données à tout moment.",
  },
  {
    q: "Y a-t-il un engagement ou puis-je annuler à tout moment ?",
    a: "Aucun engagement. Tous les plans mensuels sont résiliables à tout moment depuis votre espace client. Le remboursement est possible dans les 14 jours suivant l'abonnement si vous n'êtes pas satisfait.",
  },
]

function FAQItem({ faq, index }: { faq: typeof faqs[0]; index: number }) {
  const [open, setOpen] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="border-b border-border last:border-0"
    >
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-5 text-left gap-4"
        aria-expanded={open}
      >
        <span className="font-medium text-sm sm:text-base">{faq.q}</span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function FAQ() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-50px' })

  return (
    <section id="faq" className="py-24 px-4 bg-card/30">
      <div className="mx-auto max-w-3xl">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Questions fréquentes
          </h2>
          <p className="text-muted-foreground">
            Tout ce que vous devez savoir sur AIRank.
          </p>
        </motion.div>

        <div className="rounded-2xl border border-border bg-card px-6">
          {faqs.map((faq, i) => (
            <FAQItem key={faq.q} faq={faq} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
