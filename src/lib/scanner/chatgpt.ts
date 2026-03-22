import type { ScanResultData } from './index'
import { parseResponse } from './parser'
import { queryOpenRouter } from './openrouter'

export async function scanChatGPT(
  brandName: string,
  query: string
): Promise<ScanResultData> {
  const prompt = `${query}. Liste les meilleures options avec leurs avantages et inconvénients.`
  const rawResponse = await queryOpenRouter('openai/gpt-4o-mini', prompt)
  return parseResponse(rawResponse, brandName, 'CHATGPT')
}
