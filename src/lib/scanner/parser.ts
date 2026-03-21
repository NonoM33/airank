import type { ScanResultData } from './index'

export function parseResponse(
  rawResponse: string,
  brandName: string,
  llm: ScanResultData['llm']
): ScanResultData {
  const mentioned = rawResponse.toLowerCase().includes(brandName.toLowerCase())
  const position = mentioned ? extractPosition(rawResponse, brandName) : null
  const context = mentioned ? extractContext(rawResponse, brandName) : null
  const sentiment = mentioned ? analyzeSentiment(rawResponse, brandName) : null
  const competitors = extractCompetitors(rawResponse, brandName)

  return { llm, mentioned, position, context, sentiment, competitors, rawResponse }
}

function extractPosition(text: string, brandName: string): number | null {
  const brandLower = brandName.toLowerCase()

  // Try numbered list items (1. or 1))
  const numberedLines = text.match(/^\s*\d+[.)]\s+.+$/gm) ?? []
  if (numberedLines.length > 1) {
    const pos = numberedLines.findIndex((line) =>
      line.toLowerCase().includes(brandLower)
    )
    if (pos !== -1) return pos + 1
  }

  // Try bullet list items (- or * or •)
  const bulletLines = text.match(/^\s*[-*•]\s+.+$/gm) ?? []
  if (bulletLines.length > 1) {
    const pos = bulletLines.findIndex((line) =>
      line.toLowerCase().includes(brandLower)
    )
    if (pos !== -1) return pos + 1
  }

  // Fallback: count bold items (**Name**) appearing before the brand
  const boldItems = [...text.matchAll(/\*\*([^*]+)\*\*/g)]
  if (boldItems.length > 0) {
    let count = 0
    for (const match of boldItems) {
      count++
      if (match[1].toLowerCase().includes(brandLower)) return count
    }
  }

  // Paragraph order fallback
  const paragraphs = text.split(/\n\n+/)
  for (let i = 0; i < paragraphs.length; i++) {
    if (paragraphs[i].toLowerCase().includes(brandLower)) return i + 1
  }

  return 1
}

function extractContext(text: string, brandName: string): string {
  const brandLower = brandName.toLowerCase()

  // Find the sentence or line containing the brand
  const lines = text.split('\n')
  for (const line of lines) {
    if (line.toLowerCase().includes(brandLower) && line.trim().length > 5) {
      return line.trim().slice(0, 400)
    }
  }

  // Fallback: extract ±150 chars around first mention
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

  // Extract from numbered list items: "1. **BrandName** ..."
  const numberedPattern = /^\s*\d+[.)]\s+\*?\*?([A-ZÀÂÄÉÈÊËÎÏÔÙÛÜ][a-zA-ZÀ-ÿ0-9\s\-\.]{1,30})\*?\*?/gm
  for (const match of text.matchAll(numberedPattern)) {
    const name = match[1].trim().split(/\s+/).slice(0, 3).join(' ')
    if (name.length > 1 && name.toLowerCase() !== excludeLower && isLikelyBrand(name)) {
      competitors.add(name)
    }
  }

  // Extract bold items: **BrandName**
  for (const match of text.matchAll(/\*\*([A-ZÀÂÄÉÈÊËÎÏÔÙÛÜ][a-zA-ZÀ-ÿ0-9\s\-\.]{1,30})\*\*/g)) {
    const name = match[1].trim()
    if (name.length > 1 && name.toLowerCase() !== excludeLower && isLikelyBrand(name)) {
      competitors.add(name)
    }
  }

  // Extract from bullet lists: "- **Name** ..." or "- Name:"
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
