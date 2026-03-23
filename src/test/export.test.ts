import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mocks ───────────────────────────────────────────────────────────────────
// Note: vi.mock is hoisted, so factory must not reference variables defined
// in module scope. Use vi.fn() and configure in beforeEach instead.

vi.mock('@/lib/db', () => ({
  prisma: {
    brand: {
      findFirst: vi.fn(),
    },
    scan: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/plan-limits', () => ({
  getPlanLimits: vi.fn(),
}))

// ─── Import after mocks ───────────────────────────────────────────────────────

import { GET } from '@/app/api/export/route'
import { auth } from '@/lib/auth'
import { getPlanLimits } from '@/lib/plan-limits'
import { prisma } from '@/lib/db'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockScans = [
  {
    id: 'scan-1',
    brandId: 'brand-1',
    query: 'Meilleur logiciel CRM',
    globalScore: 72,
    createdAt: new Date('2024-03-01T10:00:00Z'),
    brand: { name: 'Acme Corp' },
    results: [
      { id: 'r1', scanId: 'scan-1', llm: 'CHATGPT', mentioned: true, score: 80, competitors: '["Salesforce","HubSpot"]', position: 2, context: 'Acme est bien noté', sentiment: 'POSITIVE', rawResponse: '' },
      { id: 'r2', scanId: 'scan-1', llm: 'CLAUDE', mentioned: false, score: 0, competitors: '[]', position: null, context: null, sentiment: null, rawResponse: '' },
      { id: 'r3', scanId: 'scan-1', llm: 'PERPLEXITY', mentioned: true, score: 65, competitors: '["Salesforce"]', position: 3, context: 'Acme proposé', sentiment: 'NEUTRAL', rawResponse: '' },
      { id: 'r4', scanId: 'scan-1', llm: 'GEMINI', mentioned: true, score: 70, competitors: '["Pipedrive"]', position: 1, context: 'Acme en premier', sentiment: 'POSITIVE', rawResponse: '' },
    ],
  },
  {
    id: 'scan-2',
    brandId: 'brand-1',
    query: 'Outil de gestion de projet',
    globalScore: 45,
    createdAt: new Date('2024-03-15T14:00:00Z'),
    brand: { name: 'Acme Corp' },
    results: [
      { id: 'r5', scanId: 'scan-2', llm: 'CHATGPT', mentioned: false, score: 0, competitors: '["Notion"]', position: null, context: null, sentiment: null, rawResponse: '' },
    ],
  },
  {
    id: 'scan-3',
    brandId: 'brand-1',
    query: 'Solution e-commerce',
    globalScore: 90,
    createdAt: new Date('2024-03-20T09:00:00Z'),
    brand: { name: 'Acme Corp' },
    results: [],
  },
]

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GET /api/export', () => {
  beforeEach(() => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user-1', email: 'test@test.com', plan: 'PRO' },
    } as never)
    vi.mocked(getPlanLimits).mockReturnValue({ csvExport: true } as never)
    vi.mocked(prisma.brand.findFirst).mockResolvedValue({ id: 'brand-1', name: 'Acme Corp', userId: 'user-1' } as never)
    vi.mocked(prisma.scan.findMany).mockResolvedValue(mockScans as never)
  })

  it('returns Content-Type text/csv for PRO user', async () => {
    const req = new Request('http://localhost/api/export?brandId=brand-1&format=csv')
    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/csv')
  })

  it('CSV starts with UTF-8 BOM bytes (EF BB BF)', async () => {
    const req = new Request('http://localhost/api/export?brandId=brand-1&format=csv')
    const res = await GET(req)
    // Clone to read twice (arrayBuffer + text)
    const buf = await res.arrayBuffer()
    const bytes = new Uint8Array(buf)
    // UTF-8 BOM = bytes 0xEF 0xBB 0xBF
    expect(bytes[0]).toBe(0xef)
    expect(bytes[1]).toBe(0xbb)
    expect(bytes[2]).toBe(0xbf)
  })

  it('CSV contains correct header columns', async () => {
    const req = new Request('http://localhost/api/export?brandId=brand-1&format=csv')
    const res = await GET(req)
    const text = await res.text()
    // Remove BOM and get first line
    const firstLine = text.replace(/^\uFEFF/, '').split('\n')[0]
    expect(firstLine).toBe(
      'date,query,globalScore,chatgpt_mentioned,chatgpt_score,claude_mentioned,claude_score,perplexity_mentioned,perplexity_score,gemini_mentioned,gemini_score,competitors'
    )
  })

  it('CSV has correct number of data rows (3 scans → 3 rows + 1 header)', async () => {
    const req = new Request('http://localhost/api/export?brandId=brand-1&format=csv')
    const res = await GET(req)
    const text = await res.text()
    const lines = text.replace(/^\uFEFF/, '').trim().split('\n')
    expect(lines).toHaveLength(1 + mockScans.length) // header + 3 scans
  })

  it('returns 403 for FREE plan (csvExport: false)', async () => {
    vi.mocked(getPlanLimits).mockReturnValue({ csvExport: false } as never)
    const req = new Request('http://localhost/api/export?brandId=brand-1&format=csv')
    const res = await GET(req)
    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.error).toBeTruthy()
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null as never)
    const req = new Request('http://localhost/api/export')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('sets Content-Disposition header with filename', async () => {
    const req = new Request('http://localhost/api/export?brandId=brand-1&format=csv')
    const res = await GET(req)
    const disposition = res.headers.get('content-disposition')
    expect(disposition).toContain('attachment')
    expect(disposition).toContain('airank-export-')
    expect(disposition).toContain('.csv')
  })
})
