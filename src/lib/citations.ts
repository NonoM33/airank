// Citation extraction: parse raw LLM responses to extract source URLs
// This is critical for actionable SEO recommendations.

export interface ExtractedCitation {
  sourceUrl: string
  sourceDomain: string
  sourceTitle?: string
  quote?: string
  position?: number
}

const URL_REGEX = /https?:\/\/[^\s\]\)\}"'<>]+/gi

// Markdown link pattern: [title](url)
const MD_LINK_REGEX = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi

// Numbered citation pattern: [1] https://...
const NUMBERED_CITATION_REGEX = /\[(\d+)\]\s*:?\s*(https?:\/\/[^\s\]]+)/gi

export function extractCitations(rawResponse: string): ExtractedCitation[] {
  if (!rawResponse) return []

  const citations: ExtractedCitation[] = []
  const seen = new Set<string>()
  let position = 1

  // 1. Markdown links
  let mdMatch: RegExpExecArray | null
  const mdRegex = new RegExp(MD_LINK_REGEX)
  while ((mdMatch = mdRegex.exec(rawResponse)) !== null) {
    const url = mdMatch[2].replace(/[.,;]$/, '')
    if (seen.has(url)) continue
    seen.add(url)
    const domain = safeDomain(url)
    if (!domain) continue
    citations.push({
      sourceUrl: url,
      sourceDomain: domain,
      sourceTitle: mdMatch[1],
      position: position++,
    })
  }

  // 2. Numbered citations
  let numMatch: RegExpExecArray | null
  const numRegex = new RegExp(NUMBERED_CITATION_REGEX)
  while ((numMatch = numRegex.exec(rawResponse)) !== null) {
    const url = numMatch[2].replace(/[.,;]$/, '')
    if (seen.has(url)) continue
    seen.add(url)
    const domain = safeDomain(url)
    if (!domain) continue
    citations.push({
      sourceUrl: url,
      sourceDomain: domain,
      position: position++,
    })
  }

  // 3. Bare URLs
  let urlMatch: RegExpExecArray | null
  const urlRegex = new RegExp(URL_REGEX)
  while ((urlMatch = urlRegex.exec(rawResponse)) !== null) {
    const url = urlMatch[0].replace(/[.,;]$/, '')
    if (seen.has(url)) continue
    seen.add(url)
    const domain = safeDomain(url)
    if (!domain) continue
    citations.push({
      sourceUrl: url,
      sourceDomain: domain,
      position: position++,
    })
  }

  return citations
}

function safeDomain(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

// Group citations by domain with counts
export function aggregateByDomain(
  citations: { sourceDomain: string; sourceUrl: string }[]
): { domain: string; count: number; urls: string[] }[] {
  const map = new Map<string, { count: number; urls: Set<string> }>()
  for (const c of citations) {
    if (!map.has(c.sourceDomain)) {
      map.set(c.sourceDomain, { count: 0, urls: new Set() })
    }
    const entry = map.get(c.sourceDomain)!
    entry.count++
    entry.urls.add(c.sourceUrl)
  }
  return Array.from(map.entries())
    .map(([domain, { count, urls }]) => ({ domain, count, urls: Array.from(urls) }))
    .sort((a, b) => b.count - a.count)
}
