import type { ScanResultData } from './index'
import { parseResponse } from './parser'
import { queryOpenRouter } from './openrouter'

export async function scanPerplexity(
  brandName: string,
  query: string
): Promise<ScanResultData> {
  const prompt = `${query}. Liste les meilleures options avec leurs avantages et inconvénients.`
  const rawResponse = await queryOpenRouter('perplexity/sonar', prompt)
  return parseResponse(rawResponse, brandName, 'PERPLEXITY')
}
