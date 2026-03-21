import type { ScanResultData } from './index'
import { parseResponse } from './parser'

export async function scanGemini(
  brandName: string,
  query: string
): Promise<ScanResultData> {
  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey) throw new Error('GOOGLE_AI_API_KEY not configured')

  const prompt = `${query}. Liste les meilleures options avec leurs avantages et inconvénients.`

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
      }),
    }
  )

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Gemini API error ${res.status}: ${error}`)
  }

  const data = await res.json() as {
    candidates: Array<{ content: { parts: Array<{ text: string }> } }>
  }
  const rawResponse = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

  return parseResponse(rawResponse, brandName, 'GEMINI')
}
