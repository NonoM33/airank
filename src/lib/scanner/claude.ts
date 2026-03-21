import type { ScanResultData } from './index'
import { parseResponse } from './parser'

export async function scanClaude(
  brandName: string,
  query: string
): Promise<ScanResultData> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured')

  const prompt = `${query}. Liste les meilleures options avec leurs avantages et inconvénients.`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Anthropic API error ${res.status}: ${error}`)
  }

  const data = await res.json() as {
    content: Array<{ text: string }>
  }
  const rawResponse = data.content?.[0]?.text ?? ''

  return parseResponse(rawResponse, brandName, 'CLAUDE')
}
