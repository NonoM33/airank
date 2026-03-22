import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { generateRecommendations } from '@/lib/recommendations'

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
  POSITIVE: 'Positif ✓',
  NEUTRAL: 'Neutre',
  NEGATIVE: 'Négatif ✗',
}

function getLLMScore(r: { mentioned: boolean; position: number | null; sentiment: string | null }) {
  if (!r.mentioned) return 0
  const pos = r.position ? Math.max(20, 100 - (r.position - 1) * 8) : 50
  const mult = r.sentiment === 'POSITIVE' ? 1.0 : r.sentiment === 'NEGATIVE' ? 0.3 : 0.7
  return Math.round(pos * mult)
}

function getScoreVerdict(score: number) {
  if (score >= 90) return 'Leader IA'
  if (score >= 70) return 'Très visible'
  if (score >= 50) return 'Visible'
  if (score >= 30) return 'Peu visible'
  return 'Invisible'
}

function scoreColor(score: number) {
  if (score >= 70) return '#16a34a'
  if (score >= 40) return '#d97706'
  return '#dc2626'
}

const s = StyleSheet.create({
  page: {
    backgroundColor: '#ffffff',
    padding: 48,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1a1a1a',
  },
  // ── Header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderBottom: '3px solid #6366F1',
    paddingBottom: 16,
    marginBottom: 28,
  },
  logoText: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#6366F1' },
  logoSub: { fontSize: 8, color: '#a1a1aa', marginTop: 2 },
  headerMeta: { fontSize: 9, color: '#71717A', textAlign: 'right', lineHeight: 1.6 },
  // ── Section titles ──
  sectionTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#6366F1',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 24,
    marginBottom: 10,
    paddingBottom: 4,
    borderBottom: '1px solid #e4e4e7',
  },
  // ── Executive summary ──
  summaryBox: {
    backgroundColor: '#f8f8ff',
    border: '1px solid #c7d2fe',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 8,
  },
  summaryScoreBig: {
    fontSize: 48,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    lineHeight: 1,
  },
  summaryScoreLabel: { fontSize: 10, color: '#71717A', textAlign: 'center', marginTop: 2 },
  summaryInfo: { flex: 1 },
  summaryBrandName: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#1a1a1a', marginBottom: 4 },
  summaryVerdict: { fontSize: 13, fontFamily: 'Helvetica-Bold', marginBottom: 6 },
  summaryMeta: { fontSize: 9, color: '#71717A', lineHeight: 1.6 },
  // ── LLM table ──
  table: { border: '1px solid #e4e4e7', borderRadius: 6, overflow: 'hidden' },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f4f4f5',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderTop: '1px solid #f0f0f0',
  },
  colLLM:    { width: 80, fontFamily: 'Helvetica-Bold', fontSize: 9, color: '#3f3f46' },
  colStatus: { flex: 1, fontSize: 9, color: '#52525b' },
  colScore:  { width: 50, fontSize: 9, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  colSentiment: { width: 60, fontSize: 9, textAlign: 'center', color: '#52525b' },
  tableHeaderText: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#71717A', textTransform: 'uppercase' },
  // ── Competitors ──
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  chip: {
    backgroundColor: '#f4f4f5',
    border: '1px solid #e4e4e7',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 8,
    color: '#52525b',
  },
  // ── Recommendations ──
  recCard: {
    border: '1px solid #e4e4e7',
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
  },
  recHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 4 },
  recBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
  },
  recTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', flex: 1 },
  recDesc: { fontSize: 8, color: '#52525b', lineHeight: 1.5, marginBottom: 4 },
  recAction: { fontSize: 8, color: '#6366F1', lineHeight: 1.6, marginLeft: 8 },
  // ── Keywords ──
  scanCard: {
    backgroundColor: '#fafafa',
    border: '1px solid #e4e4e7',
    borderRadius: 6,
    padding: 10,
    marginBottom: 6,
  },
  scanQuery: { fontSize: 10, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  scanDate: { fontSize: 8, color: '#71717A', marginBottom: 6 },
  // ── Footer ──
  footer: {
    position: 'absolute',
    bottom: 32,
    left: 48,
    right: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTop: '1px solid #e4e4e7',
    paddingTop: 6,
  },
  footerText: { fontSize: 8, color: '#a1a1aa' },
})

export function ReportDocument({ brand, scans }: Props) {
  const keywords = (() => {
    try { return JSON.parse(brand.keywords) as string[] }
    catch { return [] }
  })()

  const latestScan = scans[0]
  const generatedAt = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  const llmScores = latestScan
    ? ['CHATGPT', 'CLAUDE', 'PERPLEXITY', 'GEMINI'].map((llm) => {
        const r = latestScan.results.find((x) => x.llm === llm)
        return { llm, result: r ?? null, score: r ? getLLMScore(r) : 0 }
      })
    : []

  // Aggregate competitors across all scans
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
  const topCompetitors = Array.from(competitorMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  // Generate recommendations from latest scan
  const recommendations = latestScan
    ? generateRecommendations(
        latestScan.results.map((r) => ({
          llm: r.llm,
          mentioned: r.mentioned,
          position: r.position,
          sentiment: r.sentiment,
        })),
        brand.name
      )
    : []

  const globalScore = latestScan?.globalScore ?? 0

  return (
    <Document title={`Rapport AIRank — ${brand.name}`}>
      <Page size="A4" style={s.page}>

        {/* ── Header ── */}
        <View style={s.header}>
          <View>
            <Text style={s.logoText}>AIRank</Text>
            <Text style={s.logoSub}>Analyse de visibilité IA</Text>
          </View>
          <View>
            <Text style={s.headerMeta}>Rapport de visibilité</Text>
            <Text style={s.headerMeta}>Généré le {generatedAt}</Text>
            <Text style={s.headerMeta}>{scans.length} scan{scans.length > 1 ? 's' : ''} analysé{scans.length > 1 ? 's' : ''}</Text>
          </View>
        </View>

        {/* ── Executive Summary ── */}
        <Text style={s.sectionTitle}>Résumé exécutif</Text>
        <View style={s.summaryBox}>
          <View>
            <Text style={[s.summaryScoreBig, { color: scoreColor(globalScore) }]}>
              {globalScore}
            </Text>
            <Text style={s.summaryScoreLabel}>/ 100</Text>
          </View>
          <View style={s.summaryInfo}>
            <Text style={s.summaryBrandName}>{brand.name}</Text>
            <Text style={[s.summaryVerdict, { color: scoreColor(globalScore) }]}>
              {getScoreVerdict(globalScore)}
            </Text>
            {brand.domain && (
              <Text style={s.summaryMeta}>{brand.domain}</Text>
            )}
            <Text style={s.summaryMeta}>
              Analyse du {new Date().toLocaleDateString('fr-FR')}
              {latestScan ? ` — "${latestScan.query}"` : ''}
            </Text>
          </View>
        </View>

        {/* ── LLM Breakdown ── */}
        {latestScan && (
          <>
            <Text style={s.sectionTitle}>Résultats par IA</Text>
            <View style={s.table}>
              <View style={s.tableHeader}>
                <Text style={[s.tableHeaderText, { width: 80 }]}>IA</Text>
                <Text style={[s.tableHeaderText, { flex: 1 }]}>Statut</Text>
                <Text style={[s.tableHeaderText, { width: 60, textAlign: 'center' }]}>Sentiment</Text>
                <Text style={[s.tableHeaderText, { width: 50, textAlign: 'right' }]}>Score</Text>
              </View>
              {llmScores.map(({ llm, result, score }) => (
                <View key={llm} style={s.tableRow}>
                  <Text style={s.colLLM}>{LLM_LABELS[llm] ?? llm}</Text>
                  <Text style={s.colStatus}>
                    {result?.mentioned
                      ? `Mentionné${result.position ? ` en position #${result.position}` : ''}`
                      : 'Non mentionné'}
                  </Text>
                  <Text style={[s.colSentiment, {
                    color: result?.sentiment === 'POSITIVE' ? '#16a34a'
                      : result?.sentiment === 'NEGATIVE' ? '#dc2626' : '#71717A'
                  }]}>
                    {result?.sentiment ? SENTIMENT_LABELS[result.sentiment] : '—'}
                  </Text>
                  <Text style={[s.colScore, { color: scoreColor(score) }]}>{score}/100</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── Competitors ── */}
        {topCompetitors.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Concurrents détectés</Text>
            <View style={s.chipRow}>
              {topCompetitors.map(([name, count]) => (
                <Text key={name} style={s.chip}>
                  {name} ({count}×)
                </Text>
              ))}
            </View>
          </>
        )}

        {/* ── Recommendations ── */}
        {recommendations.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Recommandations</Text>
            {recommendations.slice(0, 4).map((rec, i) => {
              const badgeColor = rec.priority === 'critical'
                ? { bg: '#fee2e2', text: '#dc2626' }
                : rec.priority === 'important'
                ? { bg: '#fef3c7', text: '#d97706' }
                : { bg: '#dcfce7', text: '#16a34a' }
              return (
                <View key={i} style={s.recCard}>
                  <View style={s.recHeader}>
                    <View style={[s.recBadge, { backgroundColor: badgeColor.bg }]}>
                      <Text style={{ color: badgeColor.text }}>{rec.priorityLabel.toUpperCase()}</Text>
                    </View>
                    <Text style={s.recTitle}>{rec.title}</Text>
                  </View>
                  <Text style={s.recDesc}>{rec.description}</Text>
                  {rec.actions.slice(0, 3).map((action, j) => (
                    <Text key={j} style={s.recAction}>→ {action}</Text>
                  ))}
                </View>
              )
            })}
          </>
        )}

        {/* ── Recent scans ── */}
        {keywords.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Requêtes analysées</Text>
            <View style={s.chipRow}>
              {keywords.map((kw, i) => (
                <Text key={i} style={s.chip}>{kw}</Text>
              ))}
            </View>
          </>
        )}

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Rapport généré par AIRank.fr — {generatedAt}</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>

      </Page>
    </Document>
  )
}
