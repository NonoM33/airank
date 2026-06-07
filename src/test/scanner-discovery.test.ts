import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/scanner/openrouter', () => ({ queryOpenRouter: vi.fn() }))

import { queryOpenRouter } from '@/lib/scanner/openrouter'
import { buildDiscoveryQuery } from '@/lib/scanner/discovery'

type AnyMock = ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
})

describe('buildDiscoveryQuery — brand-neutral free scan query', () => {
  it('builds a sector query that does NOT contain the brand name', async () => {
    ;(queryOpenRouter as AnyMock).mockResolvedValue('logiciel CRM')
    const q = await buildDiscoveryQuery('Salesforce')
    expect(q.toLowerCase()).not.toContain('salesforce')
    expect(q.toLowerCase()).toContain('crm')
  })

  it('strips an accidental brand mention from the inferred sector', async () => {
    ;(queryOpenRouter as AnyMock).mockResolvedValue('le CRM de Salesforce')
    const q = await buildDiscoveryQuery('Salesforce')
    expect(q.toLowerCase()).not.toContain('salesforce')
  })

  it('falls back to a neutral query (no brand) when inference throws', async () => {
    ;(queryOpenRouter as AnyMock).mockRejectedValue(new Error('llm down'))
    const q = await buildDiscoveryQuery('Acme')
    expect(q.toLowerCase()).not.toContain('acme')
    expect(q.length).toBeGreaterThan(0)
  })

  it('falls back when the inferred sector is empty', async () => {
    ;(queryOpenRouter as AnyMock).mockResolvedValue('   ')
    const q = await buildDiscoveryQuery('Acme')
    expect(q.toLowerCase()).not.toContain('acme')
  })
})
