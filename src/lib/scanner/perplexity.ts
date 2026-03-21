import type { ScanResultData } from './index'
import { parseResponse } from './parser'

export async function scanPerplexity(
  brandName: string,
  query: string
): Promise<ScanResultData> {
  const apiKey = process.env.PERPLEXITY_API_KEY
  if (!apiKey) throw new Error('PERPLEXITY_API_KEY not configured')

  const prompt = `${query}. Liste les meilleures options avec leurs avantages et inconvénients.`

  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1024,
    }),
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Perplexity API error ${res.status}: ${error}`)
  }

  const data = await res.json() as {
    choices: Array<{ message: { content: string } }>
  }
  const rawResponse = data.choices?.[0]?.message?.content ?? ''

  return parseResponse(rawResponse, brandName, 'PERPLEXITY')
}
