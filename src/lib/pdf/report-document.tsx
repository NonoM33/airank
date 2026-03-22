import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

interface ScanResult {
  id: string
  llm: string
  mentioned: boolean
  position: number | null
  sentiment: string | null
  competitors: string
}

interface Scan {
  id: string
  query: string
  globalScore: number
  createdAt: Date
  results: ScanResult[]
}

interface Brand {
  name: string
  domain: string | null
  keywords: string
}

interface Props {
  brand: Brand
  scans: Scan[]
}

const LLM_LABELS: Record<string, string> = {
  CHATGPT: 'ChatGPT',
  CLAUDE: 'Claude',
  PERPLEXITY: 'Perplexity',
  GEMINI: 'Gemini',
}

const SENTIMENT_LABELS: Record<string, string> = {
  POSITIVE: 'Positif',
  NEUTRAL: 'Neutre',
  NEGATIVE: 'Négatif',
}

const s = StyleSheet.create({
  page: {
    backgroundColor: '#ffffff',
    padding: 48,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1a1a1a',
  },
  header: {
    borderBottom: '2px solid #6366F1',
    paddingBottom: 16,
    marginBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  brandName: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#6366F1',
  },
  headerMeta: {
    fontSize: 9,
    color: '#71717A',
    textAlign: 'right',
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#3f3f46',
    marginBottom: 10,
    marginTop: 20,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scoreRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  scoreCard: {
    flex: 1,
    backgroundColor: '#f4f4f5',
    borderRadius: 6,
    padding: 12,
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 8,
    color: '#71717A',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  scoreValue: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
  },
  scoreGreen: { color: '#16a34a' },
  scoreAmber: { color: '#d97706' },
  scoreRed: { color: '#dc2626' },
  scanCard: {
    backgroundColor: '#fafafa',
    border: '1px solid #e4e4e7',
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
  },
  scanQuery: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 6,
  },
  scanMeta: {
    fontSize: 8,
    color: '#71717A',
    marginBottom: 8,
  },
  llmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottom: '1px solid #f0f0f0',
  },
  llmName: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#3f3f46',
    width: 80,
  },
  llmStatus: {
    fontSize: 9,
    flex: 1,
    color: '#52525b',
  },
  llmScore: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    width: 40,
    textAlign: 'right',
  },
  competitorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  competitorBadge: {
    backgroundColor: '#f4f4f5',
    border: '1px solid #e4e4e7',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontSize: 8,
    color: '#52525b',
  },
  footer: {
    position: 'absolute',
    bottom: 32,
    left: 48,
    right: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTop: '1px solid #e4e4e7',
    paddingTop: 8,
  },
  footerText: {
    fontSize: 8,
    color: '#a1a1aa',
  },
})

function getScoreColor(score: number) {
  if (score >= 70) return s.scoreGreen
  if (score >= 40) return s.scoreAmber
  return s.scoreRed
}

function getLLMScore(result: { mentioned: boolean; position: number | null; sentiment: string | null }) {
  if (!result.mentioned) return 0
  const posScore = result.position ? Math.max(20, 100 - (result.position - 1) * 8) : 50
  const mult = result.sentiment === 'POSITIVE' ? 1.0 : result.sentiment === 'NEGATIVE' ? 0.3 : 0.7
  return Math.round(posScore * mult)
}

export function ReportDocument({ brand, scans }: Props) {
  const keywords = (() => { try { return JSON.parse(brand.keywords) as string[] } catch { return [] } })()
  const latestScan = scans[0]
  const generatedAt = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  // Global competitor map across all scans
  const competitorMap = new Map<string, number>()
  for (const scan of scans) {
    for (const r of scan.results) {
      try {
        const comps = JSON.parse(r.competitors) as string[]
        for (const c of comps) {
          if (c.trim()) competitorMap.set(c, (competitorMap.get(c) ?? 0) + 1)
        }
      } catch { /* skip */ }
    }
  }
  const topCompetitors = Array.from(competitorMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8)

  const llmScores = latestScan
    ? ['CHATGPT', 'CLAUDE', 'PERPLEXITY', 'GEMINI'].map((llm) => {
        const r = latestScan.results.find((x) => x.llm === llm)
        return { llm, score: r ? getLLMScore(r) : null, mentioned: r?.mentioned ?? false }
      })
    : []

  return (
    <Document title={`Rapport AIRank — ${brand.name}`}>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.brandName}>{brand.name}</Text>
            {brand.domain && <Text style={{ fontSize: 9, color: '#71717A', marginTop: 2 }}>{brand.domain}</Text>}
          </View>
          <View>
            <Text style={s.headerMeta}>Rapport AIRank</Text>
            <Text style={s.headerMeta}>Généré le {generatedAt}</Text>
            <Text style={s.headerMeta}>{scans.length} scan{scans.length > 1 ? 's' : ''} analysé{scans.length > 1 ? 's' : ''}</Text>
          </View>
        </View>

        {/* Score Overview */}
        {latestScan && (
          <>
            <Text style={s.sectionTitle}>Score de visibilité — Dernier scan</Text>
            <View style={s.scoreRow}>
              <View style={s.scoreCard}>
                <Text style={s.scoreLabel}>Score global</Text>
                <Text style={[s.scoreValue, getScoreColor(latestScan.globalScore)]}>
                  {latestScan.globalScore}
                </Text>
                <Text style={{ fontSize: 8, color: '#a1a1aa' }}>/ 100</Text>
              </View>
              {llmScores.map(({ llm, score }) => (
                <View key={llm} style={s.scoreCard}>
                  <Text style={s.scoreLabel}>{LLM_LABELS[llm]}</Text>
                  <Text style={[s.scoreValue, getScoreColor(score ?? 0)]}>
                    {score ?? '—'}
                  </Text>
                  <Text style={{ fontSize: 8, color: '#a1a1aa' }}>/ 100</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Keywords */}
        {keywords.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Requêtes analysées</Text>
            <View style={s.competitorRow}>
              {keywords.map((kw, i) => (
                <Text key={i} style={s.competitorBadge}>{kw}</Text>
              ))}
            </View>
          </>
        )}

        {/* Recent scans */}
        <Text style={s.sectionTitle}>Analyses récentes</Text>
        {scans.slice(0, 5).map((scan) => (
          <View key={scan.id} style={s.scanCard}>
            <Text style={s.scanQuery}>&quot;{scan.query}&quot;</Text>
            <Text style={s.scanMeta}>
              {scan.createdAt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              {' '}— Score global: {scan.globalScore}/100
            </Text>
            {scan.results.map((r) => {
              const score = getLLMScore(r)
              const comps = (() => { try { return JSON.parse(r.competitors) as string[] } catch { return [] } })()
              return (
                <View key={r.id} style={s.llmRow}>
                  <Text style={s.llmName}>{LLM_LABELS[r.llm] ?? r.llm}</Text>
                  <Text style={s.llmStatus}>
                    {r.mentioned
                      ? `Mentionné${r.position ? ` #${r.position}` : ''} — ${r.sentiment ? SENTIMENT_LABELS[r.sentiment] : ''}`
                      : `Non mentionné${comps.length > 0 ? ` (${comps.slice(0, 3).join(', ')})` : ''}`
                    }
                  </Text>
                  <Text style={[s.llmScore, getScoreColor(score)]}>{score}/100</Text>
                </View>
              )
            })}
          </View>
        ))}

        {/* Competitors */}
        {topCompetitors.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Concurrents détectés par les LLMs</Text>
            <View style={s.competitorRow}>
              {topCompetitors.map(([name, count]) => (
                <Text key={name} style={s.competitorBadge}>
                  {name} ({count}×)
                </Text>
              ))}
            </View>
          </>
        )}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>AIRank.fr — Analyse de visibilité IA</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
