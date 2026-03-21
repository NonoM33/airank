// Scanner orchestrator — implemented in Phase 2
export type ScanResultData = {
  llm: 'CHATGPT' | 'CLAUDE' | 'PERPLEXITY' | 'GEMINI'
  mentioned: boolean
  position: number | null
  context: string | null
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | null
  competitors: string[]
  rawResponse: string
}

export async function scanBrand(
  _brandName: string,
  _query: string
): Promise<ScanResultData[]> {
  throw new Error('Scanner not implemented yet — Phase 2')
}
