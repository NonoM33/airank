'use client'

import { useState } from 'react'
import { Loader2, Target, CheckCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface Objective {
  targetScore: number
  targetDate: string
  achieved: boolean
}

interface ScoreObjectiveProps {
  brandId: string
  currentScore: number
  objective?: Objective | null
}

export function ScoreObjective({ brandId, currentScore, objective: initialObjective }: ScoreObjectiveProps) {
  const [objective, setObjective] = useState<Objective | null>(initialObjective ?? null)
  const [targetScore, setTargetScore] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isAchieved = objective && (objective.achieved || currentScore >= objective.targetScore)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const score = parseInt(targetScore, 10)
    if (!targetScore || !targetDate || isNaN(score) || score < 1 || score > 100) {
      setError('Veuillez renseigner un score cible (1-100) et une date.')
      return
    }
    setError('')
    setSaving(true)
    try {
      const res = await fetch('/api/objective', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId, targetScore: score, targetDate }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erreur lors de la sauvegarde.')
        setSaving(false)
        return
      }
      setObjective({
        targetScore: data.targetScore,
        targetDate: data.targetDate,
        achieved: data.achieved,
      })
    } catch {
      setError('Une erreur est survenue.')
    }
    setSaving(false)
  }

  if (isAchieved && objective) {
    return (
      <div
        className="card-glow rounded-xl bg-card border border-green-500/30 p-4"
        data-testid="score-objective"
      >
        <div className="flex items-center gap-2 mb-2">
          <Target className="h-4 w-4 text-green-400" />
          <p className="text-sm font-semibold">Objectif de score</p>
        </div>
        <div
          className="flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-2"
          data-testid="objective-achieved"
        >
          <CheckCircle className="h-4 w-4 text-green-400 shrink-0" />
          <p className="text-sm text-green-400 font-medium">Objectif atteint !</p>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Score cible : {objective.targetScore}/100
        </p>
      </div>
    )
  }

  if (objective) {
    const progress = Math.min(100, Math.round((currentScore / objective.targetScore) * 100))
    const remaining = objective.targetScore - currentScore
    const formattedDate = new Date(objective.targetDate).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })

    return (
      <div
        className="card-glow rounded-xl bg-card border border-border p-4"
        data-testid="score-objective"
      >
        <div className="flex items-center gap-2 mb-3">
          <Target className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold">Objectif de score</p>
        </div>

        <div className="space-y-2" data-testid="objective-progress">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Actuel</span>
            <span className="font-mono font-bold">
              {currentScore} / {objective.targetScore}
            </span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Échéance : {formattedDate}</span>
            <span>
              {remaining > 0 ? `+${remaining} pts restants` : 'Objectif atteint'}
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="card-glow rounded-xl bg-card border border-border p-4"
      data-testid="score-objective"
    >
      <div className="flex items-center gap-2 mb-3">
        <Target className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold">Objectif de score</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3" data-testid="objective-form">
        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Score cible (%)</label>
          <Input
            type="number"
            min={1}
            max={100}
            value={targetScore}
            onChange={(e) => setTargetScore(e.target.value)}
            placeholder="Ex: 70"
            className="h-9 text-sm"
            data-testid="target-score-input"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Date cible</label>
          <Input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="h-9 text-sm"
            data-testid="target-date-input"
          />
        </div>
        <Button type="submit" size="sm" className="w-full gap-2" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Sauvegarde...
            </>
          ) : (
            'Définir un objectif'
          )}
        </Button>
      </form>
    </div>
  )
}
