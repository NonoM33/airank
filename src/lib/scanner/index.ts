import { scanChatGPT } from './chatgpt'
import { scanClaude } from './claude'
import { scanPerplexity } from './perplexity'
import { scanGemini } from './gemini'

export type ScanResultData = {
  llm: 'CHATGPT' | 'CLAUDE' | 'PERPLEXITY' | 'GEMINI'
  mentioned: boolean
  position: number | null
  context: string | null
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | null
  competitors: string[]
  rawResponse: string
}

/** Run all 4 LLMs in parallel. Failed scanners are silently excluded. */
export async function scanBrand(
  brandName: string,
  query: string
): Promise<ScanResultData[]> {
  const results = await Promise.allSettled([
    scanChatGPT(brandName, query),
    scanClaude(brandName, query),
    scanPerplexity(brandName, query),
    scanGemini(brandName, query),
  ])

  const successful: ScanResultData[] = []
  for (const result of results) {
    if (result.status === 'fulfilled') {
      successful.push(result.value)
    } else {
      console.error('[scanner] LLM error:', result.reason)
    }
  }

  return successful
}

/** Partial scan for unauthenticated free users — 2 LLMs, others shown as locked. */
export async function scanBrandFree(
  brandName: string,
  query: string
): Promise<ScanResultData[]> {
  const results = await Promise.allSettled([
    scanChatGPT(brandName, query),
    scanGemini(brandName, query),
  ])

  const successful: ScanResultData[] = []
  for (const result of results) {
    if (result.status === 'fulfilled') {
      successful.push(result.value)
    } else {
      console.error('[scanner:free] LLM error:', result.reason)
    }
  }

  return successful
}
