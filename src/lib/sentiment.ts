// Lexicon-based nuanced sentiment analysis (FR + EN).
// Returns a score [-1, +1] and classifies into 5 buckets.
// Also detects tone: authoritative, casual, critical, enthusiastic, neutral.

const POSITIVE_WORDS_FR = [
  'excellent', 'excellente', 'parfait', 'parfaite', 'remarquable', 'exceptionnel', 'exceptionnelle',
  'incontournable', 'leader', 'référence', 'innovant', 'innovante', 'pionnier', 'performant',
  'performante', 'efficace', 'fiable', 'qualité', 'recommandé', 'recommandée', 'apprécié',
  'appréciée', 'populaire', 'réputé', 'réputée', 'prestigieux', 'prestigieuse', 'meilleur',
  'meilleure', 'supérieur', 'supérieure', 'remarqué', 'remarquée', 'favorable', 'avantageux',
  'avantageuse', 'puissant', 'puissante', 'robuste', 'solide',
]
const POSITIVE_WORDS_EN = [
  'excellent', 'outstanding', 'perfect', 'remarkable', 'exceptional', 'leader', 'leading',
  'innovative', 'pioneering', 'efficient', 'reliable', 'quality', 'recommended', 'popular',
  'trusted', 'prestigious', 'best', 'superior', 'favorable', 'powerful', 'robust', 'solid',
  'top-notch', 'industry-leading',
]
const NEGATIVE_WORDS_FR = [
  'mauvais', 'mauvaise', 'médiocre', 'décevant', 'décevante', 'insuffisant', 'insuffisante',
  'obsolète', 'dépassé', 'dépassée', 'problématique', 'controversé', 'controversée', 'critique',
  'défaut', 'défauts', 'lacune', 'lacunes', 'faille', 'failles', 'peu fiable', 'inefficace',
  'cher', 'chère', 'coûteux', 'coûteuse', 'complexe', 'limité', 'limitée',
]
const NEGATIVE_WORDS_EN = [
  'bad', 'poor', 'mediocre', 'disappointing', 'insufficient', 'outdated', 'obsolete',
  'problematic', 'controversial', 'flaw', 'flaws', 'weakness', 'unreliable', 'inefficient',
  'expensive', 'costly', 'complex', 'limited', 'subpar', 'lacking',
]
const ENTHUSIASTIC_MARKERS = ['!', '!!', '!!!', 'fantastique', 'génial', 'amazing', 'wow', 'incroyable']
const AUTHORITATIVE_MARKERS = ['selon', 'd\'après', 'according to', 'research shows', 'études montrent']
const CRITICAL_MARKERS = ['cependant', 'néanmoins', 'toutefois', 'however', 'but', 'mais']
const CASUAL_MARKERS = ['vous savez', 'comme ça', 'you know', 'like', 'pretty much']

export interface SentimentAnalysis {
  bucket: 'VERY_NEGATIVE' | 'NEGATIVE' | 'NEUTRAL' | 'POSITIVE' | 'VERY_POSITIVE'
  score: number // -1 to +1
  tone: 'authoritative' | 'casual' | 'critical' | 'enthusiastic' | 'neutral'
  positiveHits: number
  negativeHits: number
}

export function analyzeSentiment(text: string): SentimentAnalysis {
  if (!text) {
    return { bucket: 'NEUTRAL', score: 0, tone: 'neutral', positiveHits: 0, negativeHits: 0 }
  }
  const lower = text.toLowerCase()

  let pos = 0
  let neg = 0
  for (const w of POSITIVE_WORDS_FR) if (lower.includes(w)) pos++
  for (const w of POSITIVE_WORDS_EN) if (lower.includes(w)) pos++
  for (const w of NEGATIVE_WORDS_FR) if (lower.includes(w)) neg++
  for (const w of NEGATIVE_WORDS_EN) if (lower.includes(w)) neg++

  const total = pos + neg
  const score = total === 0 ? 0 : (pos - neg) / total

  let bucket: SentimentAnalysis['bucket']
  if (score >= 0.6) bucket = 'VERY_POSITIVE'
  else if (score >= 0.2) bucket = 'POSITIVE'
  else if (score > -0.2) bucket = 'NEUTRAL'
  else if (score > -0.6) bucket = 'NEGATIVE'
  else bucket = 'VERY_NEGATIVE'

  // Tone detection
  let tone: SentimentAnalysis['tone'] = 'neutral'
  if (ENTHUSIASTIC_MARKERS.some((m) => lower.includes(m))) tone = 'enthusiastic'
  else if (AUTHORITATIVE_MARKERS.some((m) => lower.includes(m))) tone = 'authoritative'
  else if (CRITICAL_MARKERS.some((m) => lower.includes(m)) && neg > 0) tone = 'critical'
  else if (CASUAL_MARKERS.some((m) => lower.includes(m))) tone = 'casual'

  return { bucket, score: Number(score.toFixed(3)), tone, positiveHits: pos, negativeHits: neg }
}
