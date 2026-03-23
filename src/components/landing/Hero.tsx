'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Loader2, ArrowRight, Sparkles, Zap, Shield, TrendingUp } from 'lucide-react'
import { ScanResultCards } from './ScanResultCards'
import Link from 'next/link'

type FreeScanResult = {
  brand: string
  globalScore: number
  results: Array<{
    llm: string
    mentioned: boolean
    position: number | null
    context: string | null
    sentiment: string | null
    score: number
  }>
  lockedLlms: string[]
  isPartial: boolean
  message: string
}

const LLM_BADGES = [
  { name: 'ChatGPT', color: '#10A37F', initial: 'G' },
  { name: 'Claude', color: '#D97706', initial: 'C' },
  { name: 'Perplexity', color: '#6366f1', initial: 'P' },
  { name: 'Gemini', color: '#4285F4', initial: 'G' },
]

export function Hero() {
  const [brand, setBrand] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<FreeScanResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleScan(e: React.FormEvent) {
    e.preventDefault()
    if (!brand.trim() || loading) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/scan/free', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand: brand.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Erreur lors du scan. Réessayez.')
        return
      }

      setResult(data)
    } catch {
      setError('Erreur réseau. Vérifiez votre connexion.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-24 pb-16 overflow-hidden">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 h-[800px] w-[800px] rounded-full bg-primary/8 blur-[130px]" />
        <div className="absolute left-1/5 top-2/3 h-[400px] w-[400px] rounded-full bg-indigo-500/6 blur-[100px]" />
        <div className="absolute right-1/5 top-1/4 h-[300px] w-[300px] rounded-full bg-violet-500/5 blur-[90px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff06_1px,transparent_1px),linear-gradient(to_bottom,#ffffff06_1px,transparent_1px)] bg-[size:72px_72px]" />
      </div>

      <div className="relative z-10 w-full max-w-4xl mx-auto text-center">
        {/* Top badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Nouveau&nbsp;: Outils SEO IA + Génération de contenu
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.1 }}
          className="text-4xl sm:text-5xl lg:text-[4.25rem] font-bold tracking-tight leading-[1.06] mb-6"
        >
          Vos concurrents sont{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-primary to-indigo-400">
            recommandés par l&apos;IA.
          </span>
          <br />Pas vous.
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed"
        >
          AIRank scanne ChatGPT, Claude, Perplexity et Gemini en simultané,
          mesure votre score de visibilité IA, et vous donne un plan d&apos;action
          personnalisé pour dépasser vos concurrents.
        </motion.p>

        {/* LLM badges */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="flex flex-wrap items-center justify-center gap-2 mb-10"
        >
          {LLM_BADGES.map((llm) => (
            <div
              key={llm.name}
              className="flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur"
            >
              <span
                className="h-4 w-4 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                style={{ backgroundColor: llm.color }}
              >
                {llm.initial}
              </span>
              {llm.name}
            </div>
          ))}
        </motion.div>

        {/* Scan form */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          onSubmit={handleScan}
          className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto mb-5"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="Entrez le nom de votre marque..."
              className="w-full rounded-xl border border-border bg-card/80 pl-10 pr-4 py-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all backdrop-blur"
              disabled={loading}
              maxLength={100}
            />
          </div>
          <button
            type="submit"
            disabled={!brand.trim() || loading}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary px-7 py-4 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-xl shadow-primary/30 whitespace-nowrap"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyse...
              </>
            ) : (
              <>
                Scanner gratuitement
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </motion.form>

        {/* Trust signals */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground mb-14"
        >
          <span className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-primary" />
            Résultats en 30 secondes
          </span>
          <span className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-[#10A37F]" />
            Sans carte bancaire
          </span>
          <span className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-[#4285F4]" />
            2&nbsp;847 marques scannées
          </span>
        </motion.div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scan results */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="text-left"
            >
              <ScanResultCards
                brand={result.brand}
                globalScore={result.globalScore}
                results={result.results}
                lockedLlms={result.lockedLlms}
                isDemo
              />

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-6 flex flex-col sm:flex-row items-center gap-4 justify-center"
              >
                <p className="text-sm text-muted-foreground">{result.message}</p>
                <Link
                  href="/signup"
                  className="flex-shrink-0 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25"
                >
                  Voir le rapport complet →
                </Link>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-6 animate-pulse h-28" />
            <div className="grid grid-cols-2 gap-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-4 animate-pulse h-32" />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
