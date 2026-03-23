'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp } from 'lucide-react'

export function ROISimulator() {
  const [traffic, setTraffic] = useState(10000)
  const [conversion, setConversion] = useState(2)
  const [cart, setCart] = useState(80)
  const [scoreGain, setScoreGain] = useState(20)

  // Each +10 score ≈ +8% AI-driven traffic
  const aiTrafficGain = Math.round(traffic * (scoreGain / 10) * 0.008)
  const extraOrders = Math.round(aiTrafficGain * (conversion / 100))
  const revenueGain = extraOrders * cart

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" /> Simulateur ROI
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Slider label="Trafic mensuel" value={traffic} min={1000} max={500000} step={1000} format={(v) => v.toLocaleString('fr')} onChange={setTraffic} />
          <Slider label="Taux de conversion (%)" value={conversion} min={0.1} max={10} step={0.1} format={(v) => `${v}%`} onChange={setConversion} />
          <Slider label="Panier moyen (€)" value={cart} min={10} max={2000} step={10} format={(v) => `${v}€`} onChange={setCart} />
          <Slider label="Gain de score AIRank" value={scoreGain} min={5} max={60} step={5} format={(v) => `+${v} pts`} onChange={setScoreGain} />
        </div>

        <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border">
          <Stat label="Visiteurs IA gagnés" value={`+${aiTrafficGain.toLocaleString('fr')}`} />
          <Stat label="Commandes supplémentaires" value={`+${extraOrders}`} />
          <Stat label="Revenu additionnel/mois" value={`+${revenueGain.toLocaleString('fr')}€`} highlight />
        </div>

        <p className="text-xs text-muted-foreground">Estimation basée sur une augmentation de 0,8% de trafic IA par +10 points de score AIRank.</p>
      </CardContent>
    </Card>
  )
}

function Slider({ label, value, min, max, step, format, onChange }: {
  label: string; value: number; min: number; max: number; step: number
  format: (v: number) => string; onChange: (v: number) => void
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-bold text-primary">{format(value)}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-indigo-500"
      />
    </div>
  )
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg p-3 text-center ${highlight ? 'bg-primary/10 border border-primary/20' : 'bg-secondary'}`}>
      <p className={`text-lg font-bold font-mono ${highlight ? 'text-primary' : ''}`}>{value}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
    </div>
  )
}
