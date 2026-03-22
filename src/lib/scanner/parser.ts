import type { ScanResultData } from './index'

interface AirankData {
  mentioned: boolean
  position: number | null
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | null
  competitors: string[]
}

function parseAirankBlock(text: string): { data: AirankData; cleanText: string } | null {
  const blockMatch = text.match(/---AIRANK_DATA---\n([\s\S]*?)\n?---END_AIRANK_DATA---/)
  if (!blockMatch) return null

  const block = blockMatch[1]
  const cleanText = text.replace(/\n?---AIRANK_DATA---[\s\S]*?---END_AIRANK_DATA---/, '').trim()

  const mentionedMatch = block.match(/mentioned:\s*(true|false)/i)
  const mentioned = mentionedMatch ? mentionedMatch[1].toLowerCase() === 'true' : false

  const positionMatch = block.match(/position:\s*(\d+|null)/i)
  const position =
    positionMatch && positionMatch[1].toLowerCase() !== 'null'
      ? parseInt(positionMatch[1])
      : null

  const sentimentMatch = block.match(/sentiment:\s*(POSITIVE|NEUTRAL|NEGATIVE)/i)
  const sentiment = sentimentMatch
    ? (sentimentMatch[1].toUpperCase() as 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE')
    : null

  // Handle both "[A, B, C]" and "A, B, C" formats
  const competitorsLine = block.match(/competitors:\s*\[?([^\]]*)\]?/)
  let competitors: string[] = []
  if (competitorsLine && competitorsLine[1].trim()) {
    competitors = competitorsLine[1]
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s && s.toLowerCase() !== 'null' && s.toLowerCase() !== 'aucune' && s.length > 1)
      .slice(0, 8)
  }

  return { data: { mentioned, position, sentiment, competitors }, cleanText }
}

export function parseResponse(
  rawResponse: string,
  brandName: string,
  llm: ScanResultData['llm']
): ScanResultData {
  // Try structured block first
  const parsed = parseAirankBlock(rawResponse)
  if (parsed) {
    const { data, cleanText } = parsed
    const context = data.mentioned ? extractContext(cleanText, brandName) : null
    return {
      llm,
      mentioned: data.mentioned,
      position: data.position,
      context,
      sentiment: data.sentiment,
      competitors: data.competitors,
      rawResponse: cleanText,
    }
  }

  // Fall back to regex parsing
  const mentioned = rawResponse.toLowerCase().includes(brandName.toLowerCase())
  const position = mentioned ? extractPosition(rawResponse, brandName) : null
  const context = mentioned ? extractContext(rawResponse, brandName) : null
  const sentiment = mentioned ? analyzeSentiment(rawResponse, brandName) : null
  const competitors = extractCompetitors(rawResponse, brandName)

  return { llm, mentioned, position, context, sentiment, competitors, rawResponse }
}

function extractPosition(text: string, brandName: string): number | null {
  const brandLower = brandName.toLowerCase()

  const numberedLines = text.match(/^\s*\d+[.)]\s+.+$/gm) ?? []
  if (numberedLines.length > 1) {
    const pos = numberedLines.findIndex((line) => line.toLowerCase().includes(brandLower))
    if (pos !== -1) return pos + 1
  }

  const bulletLines = text.match(/^\s*[-*•]\s+.+$/gm) ?? []
  if (bulletLines.length > 1) {
    const pos = bulletLines.findIndex((line) => line.toLowerCase().includes(brandLower))
    if (pos !== -1) return pos + 1
  }

  const boldItems = [...text.matchAll(/\*\*([^*]+)\*\*/g)]
  if (boldItems.length > 0) {
    let count = 0
    for (const match of boldItems) {
      count++
      if (match[1].toLowerCase().includes(brandLower)) return count
    }
  }

  const paragraphs = text.split(/\n\n+/)
  for (let i = 0; i < paragraphs.length; i++) {
    if (paragraphs[i].toLowerCase().includes(brandLower)) return i + 1
  }

  return 1
}

function extractContext(text: string, brandName: string): string {
  const brandLower = brandName.toLowerCase()

  const lines = text.split('\n')
  for (const line of lines) {
    if (line.toLowerCase().includes(brandLower) && line.trim().length > 5) {
      return line.trim().slice(0, 400)
    }
  }

  const idx = text.toLowerCase().indexOf(brandLower)
  const start = Math.max(0, idx - 100)
  const end = Math.min(text.length, idx + 200)
  return text.slice(start, end).trim()
}

const POSITIVE_WORDS = [
  'excellent', 'excellente', 'meilleur', 'meilleure', 'recommandé', 'recommandée',
  'idéal', 'idéale', 'parfait', 'parfaite', 'innovant', 'innovante', 'efficace',
  'puissant', 'puissante', 'populaire', 'fiable', 'simple', 'intuitif', 'intuitive',
  'performant', 'performante', 'reconnu', 'reconnue', 'apprécié', 'appréciée',
  'best', 'great', 'excellent', 'recommended', 'popular', 'leading', 'trusted',
  'powerful', 'easy', 'effective', 'top', 'premier', 'première', 'leader',
]

const NEGATIVE_WORDS = [
  'mauvais', 'mauvaise', 'éviter', 'problème', 'problèmes', 'cher', 'chère',
  'limité', 'limitée', 'difficile', 'complexe', 'médiocre', 'décevant', 'décevante',
  'coûteux', 'coûteuse', 'critiqué', 'critiquée', 'bad', 'avoid', 'problem',
  'expensive', 'limited', 'difficult', 'poor', 'disappointing', 'overpriced',
]

function analyzeSentiment(
  text: string,
  brandName: string
): 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' {
  const context = extractContext(text, brandName)
  const lower = context.toLowerCase()

  let score = 0
  for (const word of POSITIVE_WORDS) {
    if (lower.includes(word)) score++
  }
  for (const word of NEGATIVE_WORDS) {
    if (lower.includes(word)) score--
  }

  if (score > 0) return 'POSITIVE'
  if (score < 0) return 'NEGATIVE'
  return 'NEUTRAL'
}

function extractCompetitors(text: string, excludeBrand: string): string[] {
  const competitors = new Set<string>()
  const excludeLower = excludeBrand.toLowerCase()

  const numberedPattern = /^\s*\d+[.)]\s+\*?\*?([A-ZÀÂÄÉÈÊËÎÏÔÙÛÜ][a-zA-ZÀ-ÿ0-9\s\-\.]{1,30})\*?\*?/gm
  for (const match of text.matchAll(numberedPattern)) {
    const name = match[1].trim().split(/\s+/).slice(0, 3).join(' ')
    if (name.length > 1 && name.toLowerCase() !== excludeLower && isLikelyBrand(name)) {
      competitors.add(name)
    }
  }

  for (const match of text.matchAll(/\*\*([A-ZÀÂÄÉÈÊËÎÏÔÙÛÜ][a-zA-ZÀ-ÿ0-9\s\-\.]{1,30})\*\*/g)) {
    const name = match[1].trim()
    if (name.length > 1 && name.toLowerCase() !== excludeLower && isLikelyBrand(name)) {
      competitors.add(name)
    }
  }

  const bulletPattern = /^\s*[-*•]\s+\*?\*?([A-ZÀÂÄÉÈÊËÎÏÔÙÛÜ][a-zA-ZÀ-ÿ0-9\s\-\.]{1,30})\*?\*?[\s:]/gm
  for (const match of text.matchAll(bulletPattern)) {
    const name = match[1].trim()
    if (name.length > 1 && name.toLowerCase() !== excludeLower && isLikelyBrand(name)) {
      competitors.add(name)
    }
  }

  return Array.from(competitors).slice(0, 8)
}

const STOP_WORDS = new Set([
  'le', 'la', 'les', 'un', 'une', 'des', 'the', 'a', 'an', 'and', 'or',
  'pour', 'avec', 'dans', 'sur', 'par', 'que', 'qui', 'si', 'et', 'ou',
  'voici', 'voilà', 'mais', 'donc', 'car', 'however', 'option', 'options',
  'solution', 'solutions', 'outil', 'outils', 'service', 'services',
])

function isLikelyBrand(name: string): boolean {
  const lower = name.toLowerCase().trim()
  if (STOP_WORDS.has(lower)) return false
  if (lower.split(' ').every((w) => STOP_WORDS.has(w))) return false
  if (name.length < 2 || name.length > 40) return false
  return true
}
