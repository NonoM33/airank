// Shared OpenRouter API client for all LLM scanners
export async function queryOpenRouter(
  model: string,
  prompt: string,
  options?: { maxTokens?: number; temperature?: number }
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured')

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://airank.fr',
      'X-Title': 'AIRank',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: options?.maxTokens ?? 1024,
      // Deterministic by default: the same brand+query must return the same
      // visibility verdict on every run, otherwise the score looks "random"
      // and customers lose trust. Callers can still opt into creativity.
      temperature: options?.temperature ?? 0,
    }),
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`OpenRouter API error ${res.status} (${model}): ${error}`)
  }

  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>
  }
  return data.choices?.[0]?.message?.content ?? ''
}
