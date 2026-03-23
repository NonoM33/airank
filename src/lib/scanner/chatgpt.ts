import type { ScanResultData } from './index'
import { parseResponse } from './parser'
import { queryOpenRouter } from './openrouter'

export async function scanChatGPT(
  brandName: string,
  query: string
): Promise<ScanResultData> {
  const prompt = `${query}

Réponds de manière détaillée. À la fin de ta réponse, ajoute une section séparée avec ce format exact:
---AIRANK_DATA---
mentioned: [true/false si tu as mentionné ${brandName}]
position: [numéro de position si mentionné, sinon null]
sentiment: [POSITIVE/NEUTRAL/NEGATIVE]
competitors: [noms propres d'entreprises/marques UNIQUEMENT cités dans ta réponse, ex: "OuiCare, Domidom, Amplitude". INTERDIT: descriptions, thèmes, services, adjectifs, phrases. Max 6 entrées. null si aucune entreprise concurrente citée.]
---END_AIRANK_DATA---`
  const rawResponse = await queryOpenRouter('openai/gpt-4o-mini', prompt)
  return parseResponse(rawResponse, brandName, 'CHATGPT')
}
