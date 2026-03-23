'use client'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MentionHighlightProps {
  text: string
  brandName: string
  competitors: string[]
  maxLength?: number
}

// ─── Negative keyword list ────────────────────────────────────────────────────

const NEGATIVE_KEYWORDS = [
  'mauvais', 'mauvaise', 'problème', 'problèmes', 'déconseille', 'déconseillé',
  'éviter', 'danger', 'dangereux', 'risque', 'risqué', 'arnaque', 'escroquerie',
  'médiocre', 'nul', 'nulle', 'terrible', 'horrible', 'catastrophique',
  'désastreux', 'désastreuse', 'inefficace', 'inutile', 'défaillant', 'défaillante',
]

// ─── Token types ──────────────────────────────────────────────────────────────

type TokenType = 'brand' | 'competitor' | 'negative' | 'text'

interface Token {
  type: TokenType
  value: string
}

// ─── Tokenizer ────────────────────────────────────────────────────────────────

function tokenize(
  text: string,
  brandName: string,
  competitors: string[],
): Token[] {
  if (!text) return []

  // Build an ordered list of patterns to match, longest first to avoid partial overlaps
  const terms: Array<{ pattern: RegExp; type: TokenType }> = []

  if (brandName) {
    terms.push({
      pattern: new RegExp(escapeRegex(brandName), 'gi'),
      type: 'brand',
    })
  }

  for (const comp of competitors) {
    if (comp) {
      terms.push({
        pattern: new RegExp(escapeRegex(comp), 'gi'),
        type: 'competitor',
      })
    }
  }

  for (const kw of NEGATIVE_KEYWORDS) {
    terms.push({
      pattern: new RegExp(`\\b${escapeRegex(kw)}\\b`, 'gi'),
      type: 'negative',
    })
  }

  if (terms.length === 0) return [{ type: 'text', value: text }]

  // Merge all patterns into a single alternation regex
  const combined = new RegExp(
    terms.map((t) => t.pattern.source).join('|'),
    'gi',
  )

  const tokens: Token[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  combined.lastIndex = 0
  while ((match = combined.exec(text)) !== null) {
    const matchedText = match[0]
    const matchStart = match.index

    if (matchStart > lastIndex) {
      tokens.push({ type: 'text', value: text.slice(lastIndex, matchStart) })
    }

    // Determine which pattern produced this match
    const type = getMatchType(matchedText, brandName, competitors)
    tokens.push({ type, value: matchedText })

    lastIndex = matchStart + matchedText.length
    // Prevent infinite loop on zero-length matches (shouldn't happen here)
    if (combined.lastIndex === matchStart) combined.lastIndex++
  }

  if (lastIndex < text.length) {
    tokens.push({ type: 'text', value: text.slice(lastIndex) })
  }

  return tokens
}

function getMatchType(
  matchedText: string,
  brandName: string,
  competitors: string[],
): TokenType {
  if (brandName && matchedText.toLowerCase() === brandName.toLowerCase())
    return 'brand'

  for (const comp of competitors) {
    if (comp && matchedText.toLowerCase() === comp.toLowerCase())
      return 'competitor'
  }

  return 'negative'
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// ─── Span styles ──────────────────────────────────────────────────────────────

const TOKEN_CLASSES: Record<TokenType, string> = {
  brand: 'bg-emerald-500/20 text-emerald-400 rounded px-0.5',
  competitor: 'bg-orange-500/20 text-orange-400 rounded px-0.5',
  negative: 'bg-red-500/20 text-red-400 rounded px-0.5',
  text: '',
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MentionHighlight({
  text,
  brandName,
  competitors,
  maxLength,
}: MentionHighlightProps) {
  const displayText =
    maxLength && text.length > maxLength
      ? text.slice(0, maxLength) + '…'
      : text

  const tokens = tokenize(displayText, brandName, competitors)

  return (
    <span className="text-sm leading-relaxed">
      {tokens.map((token, i) =>
        token.type === 'text' ? (
          token.value
        ) : (
          <span key={i} className={TOKEN_CLASSES[token.type]} data-testid={`highlight-${token.type}`}>
            {token.value}
          </span>
        ),
      )}
    </span>
  )
}
