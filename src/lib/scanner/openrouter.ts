// Shared OpenRouter API client for all LLM scanners
export async function queryOpenRouter(
  model: string,
  prompt: string
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
      max_tokens: 1024,
      temperature: 0.7,
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
