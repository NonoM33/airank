import { queryOpenRouter } from './openrouter'

const FALLBACK_QUERY =
  'Quelles entreprises ou marques recommandes-tu en priorité dans ce secteur ? Donne un classement des meilleures.'

/** Strip an accidental brand mention so the discovery query stays neutral. */
function stripBrand(text: string, brand: string): string {
  const escaped = brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.replace(new RegExp(escaped, 'ig'), '').replace(/\s{2,}/g, ' ').trim()
}

/**
 * Build a brand-NEUTRAL discovery query for the free scan.
 *
 * The whole point of an AI-visibility check is to ask the model a question a
 * real buyer would ask — WITHOUT naming the brand — and then see whether the
 * brand shows up spontaneously. The previous free scan embedded the brand name
 * directly in the prompt ("alternatives to {brand}"), which all but guaranteed a
 * mention and inflated the headline score. Here we first infer the brand's
 * sector (cheap call), then return a neutral buyer question for that sector.
 *
 * Falls back to a generic neutral question if inference fails — it NEVER returns
 * a query containing the brand name.
 */
export async function buildDiscoveryQuery(brand: string): Promise<string> {
  try {
    const sectorPrompt = `Quelle est la catégorie de produit ou le secteur d'activité de l'entreprise/marque « ${brand} » ? Réponds en 2 à 5 mots maximum, uniquement la catégorie, sans phrase, sans citer « ${brand} ».`
    const raw = await queryOpenRouter('openai/gpt-4o-mini', sectorPrompt, { maxTokens: 32 })
    const sector = stripBrand(raw, brand)
      .replace(/^[\s:"'.\-]+|[\s:"'.\-]+$/g, '')
      .split('\n')[0]
      .slice(0, 60)
      .trim()

    if (!sector || sector.length < 2) return FALLBACK_QUERY

    return `Quelles sont les meilleures entreprises, marques ou solutions en ${sector} ? Donne un classement des références incontournables du secteur.`
  } catch {
    return FALLBACK_QUERY
  }
}
