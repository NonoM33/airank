import type { ScanResultData } from './index'
import { parseResponse } from './parser'
import { queryOpenRouter } from './openrouter'

export async function scanGemini(
  brandName: string,
  query: string
): Promise<ScanResultData> {
  const prompt = `${query}. Liste les meilleures options avec leurs avantages et inconvénients.`
  const rawResponse = await queryOpenRouter('google/gemini-2.0-flash-lite-001', prompt)
  return parseResponse(rawResponse, brandName, 'GEMINI')
}
