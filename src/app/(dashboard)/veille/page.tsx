'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Bell, TrendingUp, Globe, CheckCheck, Trash2, Plus, Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AlertItem {
  id: string
  type: string
  brandId: string | null
  threshold: number | null
  message: string
  read: boolean
  createdAt: string
  brand?: { id: string; name: string } | null
}

interface ChartPoint {
  date: string
  CHATGPT?: number
  CLAUDE?: number
  PERPLEXITY?: number
  GEMINI?: number
  global?: number
}

interface Brand {
  id: string
  name: string
  sector?: string | null
}

interface SectorTrend {
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  direction: 'up' | 'down' | 'stable'
}

interface SectorAnalysis {
  trends: SectorTrend[]
  topKeywords: string[]
  opportunities: string[]
  threats: string[]
  summary: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LLM_COLORS: Record<string, string> = {
  CHATGPT: '#10B981',
  CLAUDE: '#F59E0B',
  PERPLEXITY: '#6366F1',
  GEMINI: '#3B82F6',
  global: '#A855F7',
}

const LLM_LABELS: Record<string, string> = {
  CHATGPT: 'ChatGPT',
  CLAUDE: 'Claude',
  PERPLEXITY: 'Perplexity',
  GEMINI: 'Gemini',
  global: 'Global',
}

const ALERT_TYPE_LABELS: Record<string, string> = {
  score_below: 'Score bas',
  score_above: 'Score élevé',
  no_mention: 'Non mentionné',
  competitor_spike: 'Pic concurrent',
}

const IMPACT_BADGE: Record<string, string> = {
  high: 'bg-red-500/20 text-red-400 border-red-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-green-500/20 text-green-400 border-green-500/30',
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AlertCard({
  alert,
  onMarkRead,
  onDelete,
}: {
  alert: AlertItem
  onMarkRead: (id: string) => void
  onDelete: (id: string) => void
}) {
  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
        alert.read
          ? 'border-border bg-card/50 opacity-60'
          : 'border-primary/30 bg-primary/5'
      }`}
    >
      <Bell
        className={`h-4 w-4 mt-0.5 shrink-0 ${alert.read ? 'text-muted-foreground' : 'text-primary'}`}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <Badge className="text-[10px] px-1.5 py-0 bg-secondary border-0">
            {ALERT_TYPE_LABELS[alert.type] ?? alert.type}
          </Badge>
          {alert.brand && (
            <span className="text-xs text-muted-foreground">{alert.brand.name}</span>
          )}
          <span className="text-xs text-muted-foreground ml-auto">
            {new Date(alert.createdAt).toLocaleDateString('fr-FR')}
          </span>
        </div>
        <p className="text-sm text-foreground">{alert.message}</p>
      </div>
      <div className="flex gap-1 shrink-0">
        {!alert.read && (
          <button
            onClick={() => onMarkRead(alert.id)}
            title="Marquer comme lu"
            className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
          >
            <CheckCheck className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={() => onDelete(alert.id)}
          title="Supprimer"
          className="p-1 rounded text-muted-foreground hover:text-red-400 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

function TrendItem({ trend }: { trend: SectorTrend }) {
  const arrow = trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
      <span className="text-lg leading-none mt-0.5">{arrow}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium">{trend.title}</span>
          <Badge className={`text-[10px] px-1.5 py-0 border ${IMPACT_BADGE[trend.impact]}`}>
            {trend.impact}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{trend.description}</p>
      </div>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function VeillePage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [selectedBrand, setSelectedBrand] = useState<string>('')
  const [chartData, setChartData] = useState<ChartPoint[]>([])
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [sector, setSector] = useState('')
  const [sectorAnalysis, setSectorAnalysis] = useState<SectorAnalysis | null>(null)
  const [loadingChart, setLoadingChart] = useState(false)
  const [loadingAlerts, setLoadingAlerts] = useState(false)
  const [loadingSector, setLoadingSector] = useState(false)
  const [days, setDays] = useState(30)

  // Load brands
  useEffect(() => {
    fetch('/api/brands')
      .then((r) => r.json())
      .then((data) => {
        const mainBrands = (data.brands ?? []).filter((b: Brand & { isCompetitor?: boolean }) => !b.isCompetitor)
        setBrands(mainBrands)
        if (mainBrands.length > 0) {
          setSelectedBrand(mainBrands[0].id)
          if (mainBrands[0].sector) setSector(mainBrands[0].sector)
        }
      })
      .catch(() => {})
  }, [])

  // Load position history
  const loadHistory = useCallback(async () => {
    if (!selectedBrand) return
    setLoadingChart(true)
    try {
      const res = await fetch(
        `/api/position-tracking?brandId=${selectedBrand}&days=${days}`
      )
      const data = await res.json()
      setChartData(data.chartData ?? [])
    } finally {
      setLoadingChart(false)
    }
  }, [selectedBrand, days])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  // Load alerts
  const loadAlerts = useCallback(async () => {
    setLoadingAlerts(true)
    try {
      const res = await fetch(`/api/alerts?source=alert&unread=false`)
      const data = await res.json()
      setAlerts(data.alerts ?? [])
    } finally {
      setLoadingAlerts(false)
    }
  }, [])

  useEffect(() => {
    loadAlerts()
  }, [loadAlerts])

  // Mark alert as read
  async function handleMarkRead(id: string) {
    await fetch(`/api/alerts/${id}`, { method: 'PATCH' })
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, read: true } : a))
    )
  }

  // Delete alert
  async function handleDelete(id: string) {
    await fetch(`/api/alerts/${id}?source=alert`, { method: 'DELETE' })
    setAlerts((prev) => prev.filter((a) => a.id !== id))
  }

  // Mark all as read
  async function handleMarkAllRead() {
    const unread = alerts.filter((a) => !a.read)
    await Promise.all(unread.map((a) => fetch(`/api/alerts/${a.id}`, { method: 'PATCH' })))
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })))
  }

  // Sector watch
  async function handleSectorWatch() {
    if (!sector.trim()) return
    setLoadingSector(true)
    setSectorAnalysis(null)
    try {
      const currentBrand = brands.find((b) => b.id === selectedBrand)
      const res = await fetch('/api/sector-watch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sector,
          brandName: currentBrand?.name,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setSectorAnalysis(data.analysis)
      }
    } finally {
      setLoadingSector(false)
    }
  }

  const unreadCount = alerts.filter((a) => !a.read).length
  const activeLLMs = chartData.length > 0
    ? Object.keys(LLM_COLORS).filter((llm) => chartData.some((d) => d[llm as keyof ChartPoint] !== undefined))
    : Object.keys(LLM_COLORS)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            Veille & Monitoring
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Suivez l&apos;évolution de vos scores et les tendances de votre secteur
          </p>
        </div>
      </div>

      {/* Top row: Chart + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Score evolution chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-primary" />
                Évolution des scores
              </CardTitle>
              <div className="flex items-center gap-2">
                {/* Brand selector */}
                {brands.length > 1 && (
                  <select
                    value={selectedBrand}
                    onChange={(e) => setSelectedBrand(e.target.value)}
                    className="text-xs bg-secondary border border-border rounded px-2 py-1 text-foreground"
                  >
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                )}
                {/* Period selector */}
                <select
                  value={days}
                  onChange={(e) => setDays(parseInt(e.target.value))}
                  className="text-xs bg-secondary border border-border rounded px-2 py-1 text-foreground"
                >
                  <option value={7}>7 jours</option>
                  <option value={30}>30 jours</option>
                  <option value={60}>60 jours</option>
                  <option value={90}>90 jours</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingChart ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                Chargement…
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
                <TrendingUp className="h-8 w-8 opacity-30" />
                <span>Pas encore de données pour cette période</span>
                <span className="text-xs">Lancez des scans pour voir l&apos;évolution</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: '#71717A' }}
                    tickFormatter={(v: string) => {
                      const d = new Date(v)
                      return `${d.getDate()}/${d.getMonth() + 1}`
                    }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: '#71717A' }}
                    width={30}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#141416',
                      border: '1px solid #27272A',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    labelFormatter={(v) => new Date(String(v)).toLocaleDateString('fr-FR')}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }}
                    formatter={(value: string) => LLM_LABELS[value] ?? value}
                  />
                  {activeLLMs.map((llm) => (
                    <Line
                      key={llm}
                      type="monotone"
                      dataKey={llm}
                      stroke={LLM_COLORS[llm]}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                      connectNulls
                      name={llm}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Alerts panel */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="h-4 w-4 text-primary" />
                Alertes
                {unreadCount > 0 && (
                  <Badge className="text-[10px] px-1.5 py-0 bg-primary text-white border-0">
                    {unreadCount}
                  </Badge>
                )}
              </CardTitle>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Tout lire
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loadingAlerts ? (
              <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                Chargement…
              </div>
            ) : alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm gap-2">
                <Bell className="h-8 w-8 opacity-30" />
                <span>Aucune alerte</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {alerts.map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    onMarkRead={handleMarkRead}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sector watch */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4 text-primary" />
            Veille sectorielle
            <Badge className="text-[10px] px-1.5 py-0 bg-indigo-500/20 text-indigo-400 border-indigo-500/30 border ml-1">
              2 crédits
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 mb-4">
            <input
              type="text"
              placeholder="Ex: logiciel RH, e-commerce, fintech, santé…"
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSectorWatch()}
              className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary"
            />
            <Button
              onClick={handleSectorWatch}
              disabled={loadingSector || !sector.trim()}
              size="sm"
              className="gap-2 shrink-0"
            >
              <Plus className="h-4 w-4" />
              {loadingSector ? 'Analyse…' : 'Analyser'}
            </Button>
          </div>

          {sectorAnalysis ? (
            <div className="space-y-4">
              {/* Summary */}
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm text-foreground">
                {sectorAnalysis.summary}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Trends */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Tendances
                  </h3>
                  <div className="space-y-2">
                    {sectorAnalysis.trends.map((t, i) => (
                      <TrendItem key={i} trend={t} />
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Keywords */}
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Mots-clés tendance
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {sectorAnalysis.topKeywords.map((kw, i) => (
                        <Badge
                          key={i}
                          className="text-xs bg-secondary border-border text-foreground"
                        >
                          {kw}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Opportunities */}
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Opportunités
                    </h3>
                    <ul className="space-y-1">
                      {sectorAnalysis.opportunities.map((opp, i) => (
                        <li key={i} className="text-xs text-green-400 flex items-start gap-1.5">
                          <span className="mt-0.5">✓</span>
                          {opp}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Threats */}
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Menaces
                    </h3>
                    <ul className="space-y-1">
                      {sectorAnalysis.threats.map((threat, i) => (
                        <li key={i} className="text-xs text-red-400 flex items-start gap-1.5">
                          <span className="mt-0.5">⚠</span>
                          {threat}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-24 text-muted-foreground text-sm gap-1">
              <Globe className="h-6 w-6 opacity-30" />
              <span>Entrez un secteur pour analyser les tendances IA</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
