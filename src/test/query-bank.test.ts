import { describe, it, expect } from 'vitest'
import { getQueriesForSector, getAllSectors, QUERY_TEMPLATES } from '@/lib/query-bank'

describe('getQueriesForSector', () => {
  it('returns a non-empty array for "saas"', () => {
    const queries = getQueriesForSector('saas')
    expect(queries).toBeInstanceOf(Array)
    expect(queries.length).toBeGreaterThan(0)
  })

  it('returns strings for "saas"', () => {
    const queries = getQueriesForSector('saas')
    queries.forEach((q) => expect(typeof q).toBe('string'))
  })

  it('returns expected saas queries', () => {
    const queries = getQueriesForSector('saas')
    expect(queries).toContain('Quel est le meilleur logiciel CRM pour PME ?')
  })

  it('returns empty array for unknown sector', () => {
    expect(getQueriesForSector('inconnu')).toEqual([])
  })

  it('returns empty array for empty string', () => {
    expect(getQueriesForSector('')).toEqual([])
  })

  it('returns queries for "ecommerce"', () => {
    expect(getQueriesForSector('ecommerce').length).toBeGreaterThan(0)
  })

  it('returns queries for "sante"', () => {
    expect(getQueriesForSector('sante').length).toBeGreaterThan(0)
  })

  it('returns queries for "finance"', () => {
    expect(getQueriesForSector('finance').length).toBeGreaterThan(0)
  })
})

describe('getAllSectors', () => {
  it('returns a non-empty array', () => {
    const sectors = getAllSectors()
    expect(sectors).toBeInstanceOf(Array)
    expect(sectors.length).toBeGreaterThan(0)
  })

  it('lists all expected sectors', () => {
    const sectors = getAllSectors()
    const expected = ['saas', 'ecommerce', 'sante', 'finance', 'agences', 'consulting', 'retail', 'education']
    expected.forEach((s) => expect(sectors).toContain(s))
  })

  it('returns the same keys as QUERY_TEMPLATES', () => {
    const sectors = getAllSectors()
    expect(sectors).toEqual(Object.keys(QUERY_TEMPLATES))
  })

  it('has 8 sectors', () => {
    expect(getAllSectors()).toHaveLength(8)
  })
})
