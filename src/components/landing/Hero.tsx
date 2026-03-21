'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Loader2, ArrowRight, Sparkles } from 'lucide-react'
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
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-primary/5 blur-[100px]" />
        <div className="absolute left-1/4 top-2/3 h-[300px] w-[300px] rounded-full bg-indigo-500/5 blur-[80px]" />
      </div>

      <div className="relative z-10 w-full max-w-3xl mx-auto text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary"
        >
          <Sparkles className="h-3.5 w-3.5" />
          ChatGPT · Claude · Perplexity · Gemini
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mb-6"
        >
          Votre entreprise est-elle{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-400">
            visible pour l&apos;IA&nbsp;?
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto"
        >
          Découvrez si ChatGPT, Perplexity, Claude et Gemini recommandent votre marque —
          ou vos concurrents. Analyse en temps réel, résultats en 30 secondes.
        </motion.p>

        {/* Scan form */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          onSubmit={handleScan}
          className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto mb-4"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="Entrez votre marque..."
              className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-3.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              disabled={loading}
              maxLength={100}
            />
          </div>
          <button
            type="submit"
            disabled={!brand.trim() || loading}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyse...
              </>
            ) : (
              <>
                Scanner
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </motion.form>

        {/* Social proof stat */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-sm text-muted-foreground mb-12"
        >
          ✨ <span className="text-foreground font-medium">2&nbsp;847</span> marques déjà scannées
        </motion.p>

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
                  className="flex-shrink-0 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
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
