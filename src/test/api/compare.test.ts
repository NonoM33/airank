import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mock modules ────────────────────────────────────────────────────────────

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    scan: {
      findUnique: vi.fn(),
    },
  },
}))

// ─── Imports after mocks ─────────────────────────────────────────────────────

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { GET } from '@/app/api/compare/route'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(params: Record<string, string>) {
  const url = new URL('http://localhost/api/compare')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return new Request(url.toString())
}

const USER_ID = 'user-pro-1'
const PRO_SESSION = { user: { id: USER_ID, plan: 'PRO' } }

const SCAN_1 = {
  id: 'scan-1',
  query: 'Quel est le meilleur CRM ?',
  globalScore: 72,
  createdAt: new Date('2026-01-15'),
  results: [
    { llm: 'CHATGPT', mentioned: true, score: 80, sentiment: 'POSITIVE', position: 1, context: '…', competitors: '[]', rawResponse: '' },
    { llm: 'CLAUDE', mentioned: true, score: 70, sentiment: 'POSITIVE', position: 2, context: '…', competitors: '[]', rawResponse: '' },
    { llm: 'PERPLEXITY', mentioned: false, score: 0, sentiment: null, position: null, context: null, competitors: '[]', rawResponse: '' },
    // GEMINI missing intentionally
  ],
  brand: { userId: USER_ID },
}

const SCAN_2 = {
  id: 'scan-2',
  query: 'Meilleurs logiciels RH',
  globalScore: 55,
  createdAt: new Date('2026-02-20'),
  results: [
    { llm: 'CHATGPT', mentioned: false, score: 0, sentiment: null, position: null, context: null, competitors: '[]', rawResponse: '' },
    { llm: 'CLAUDE', mentioned: true, score: 60, sentiment: 'NEUTRAL', position: 1, context: '…', competitors: '[]', rawResponse: '' },
    { llm: 'PERPLEXITY', mentioned: true, score: 55, sentiment: 'POSITIVE', position: 2, context: '…', competitors: '[]', rawResponse: '' },
    { llm: 'GEMINI', mentioned: true, score: 50, sentiment: 'NEUTRAL', position: 3, context: '…', competitors: '[]', rawResponse: '' },
  ],
  brand: { userId: USER_ID },
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GET /api/compare', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(auth).mockResolvedValue(PRO_SESSION as ReturnType<typeof auth> extends Promise<infer T> ? T : never)
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null as ReturnType<typeof auth> extends Promise<infer T> ? T : never)
    const req = makeRequest({ scanId1: 'scan-1', scanId2: 'scan-2' })
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 403 when plan is FREE', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: USER_ID, plan: 'FREE' } } as ReturnType<typeof auth> extends Promise<infer T> ? T : never)
    const req = makeRequest({ scanId1: 'scan-1', scanId2: 'scan-2' })
    const res = await GET(req)
    expect(res.status).toBe(403)
  })

  it('returns 403 when plan is STARTER', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: USER_ID, plan: 'STARTER' } } as ReturnType<typeof auth> extends Promise<infer T> ? T : never)
    const req = makeRequest({ scanId1: 'scan-1', scanId2: 'scan-2' })
    const res = await GET(req)
    expect(res.status).toBe(403)
  })

  it('returns 400 when scanId1 is missing', async () => {
    const req = makeRequest({ scanId2: 'scan-2' })
    const res = await GET(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/scanId1/)
  })

  it('returns 400 when scanId2 is missing', async () => {
    const req = makeRequest({ scanId1: 'scan-1' })
    const res = await GET(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/scanId2/)
  })

  it('returns 400 when both params are missing', async () => {
    const req = makeRequest({})
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it('returns 404 when scan 1 is not found', async () => {
    vi.mocked(prisma.scan.findUnique).mockResolvedValueOnce(null).mockResolvedValueOnce(SCAN_2 as unknown as ReturnType<typeof prisma.scan.findUnique> extends Promise<infer T> ? T : never)
    const req = makeRequest({ scanId1: 'scan-1', scanId2: 'scan-2' })
    const res = await GET(req)
    expect(res.status).toBe(404)
  })

  it('returns 404 when scan 2 does not belong to user', async () => {
    const otherUserScan = { ...SCAN_2, brand: { userId: 'other-user' } }
    vi.mocked(prisma.scan.findUnique)
      .mockResolvedValueOnce(SCAN_1 as unknown as ReturnType<typeof prisma.scan.findUnique> extends Promise<infer T> ? T : never)
      .mockResolvedValueOnce(otherUserScan as unknown as ReturnType<typeof prisma.scan.findUnique> extends Promise<infer T> ? T : never)
    const req = makeRequest({ scanId1: 'scan-1', scanId2: 'scan-2' })
    const res = await GET(req)
    expect(res.status).toBe(404)
  })

  it('returns 200 with scan1, scan2 and diff for valid PRO request', async () => {
    vi.mocked(prisma.scan.findUnique)
      .mockResolvedValueOnce(SCAN_1 as unknown as ReturnType<typeof prisma.scan.findUnique> extends Promise<infer T> ? T : never)
      .mockResolvedValueOnce(SCAN_2 as unknown as ReturnType<typeof prisma.scan.findUnique> extends Promise<infer T> ? T : never)

    const req = makeRequest({ scanId1: 'scan-1', scanId2: 'scan-2' })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveProperty('scan1')
    expect(json).toHaveProperty('scan2')
    expect(json).toHaveProperty('diff')
    expect(Array.isArray(json.diff)).toBe(true)
  })

  it('returns diff with 4 LLM entries', async () => {
    vi.mocked(prisma.scan.findUnique)
      .mockResolvedValueOnce(SCAN_1 as unknown as ReturnType<typeof prisma.scan.findUnique> extends Promise<infer T> ? T : never)
      .mockResolvedValueOnce(SCAN_2 as unknown as ReturnType<typeof prisma.scan.findUnique> extends Promise<infer T> ? T : never)

    const req = makeRequest({ scanId1: 'scan-1', scanId2: 'scan-2' })
    const res = await GET(req)
    const json = await res.json()
    expect(json.diff).toHaveLength(4)
    const llms = json.diff.map((d: { llm: string }) => d.llm)
    expect(llms).toContain('CHATGPT')
    expect(llms).toContain('CLAUDE')
    expect(llms).toContain('PERPLEXITY')
    expect(llms).toContain('GEMINI')
  })

  it('computes correct delta for CLAUDE (70 → 60 = -10)', async () => {
    vi.mocked(prisma.scan.findUnique)
      .mockResolvedValueOnce(SCAN_1 as unknown as ReturnType<typeof prisma.scan.findUnique> extends Promise<infer T> ? T : never)
      .mockResolvedValueOnce(SCAN_2 as unknown as ReturnType<typeof prisma.scan.findUnique> extends Promise<infer T> ? T : never)

    const req = makeRequest({ scanId1: 'scan-1', scanId2: 'scan-2' })
    const res = await GET(req)
    const json = await res.json()
    const claudeDiff = json.diff.find((d: { llm: string }) => d.llm === 'CLAUDE')
    expect(claudeDiff.scoreA).toBe(70)
    expect(claudeDiff.scoreB).toBe(60)
    expect(claudeDiff.delta).toBe(-10)
  })

  it('sets delta to null when LLM is missing from one scan', async () => {
    // GEMINI is not in SCAN_1 results
    vi.mocked(prisma.scan.findUnique)
      .mockResolvedValueOnce(SCAN_1 as unknown as ReturnType<typeof prisma.scan.findUnique> extends Promise<infer T> ? T : never)
      .mockResolvedValueOnce(SCAN_2 as unknown as ReturnType<typeof prisma.scan.findUnique> extends Promise<infer T> ? T : never)

    const req = makeRequest({ scanId1: 'scan-1', scanId2: 'scan-2' })
    const res = await GET(req)
    const json = await res.json()
    const geminiDiff = json.diff.find((d: { llm: string }) => d.llm === 'GEMINI')
    // scoreA is null (GEMINI not mentioned/not present in scan1), scoreB is 50
    expect(geminiDiff.delta).toBeNull()
  })

  it('sets delta to null when neither scan mentions the brand for a LLM', async () => {
    vi.mocked(prisma.scan.findUnique)
      .mockResolvedValueOnce(SCAN_1 as unknown as ReturnType<typeof prisma.scan.findUnique> extends Promise<infer T> ? T : never)
      .mockResolvedValueOnce(SCAN_2 as unknown as ReturnType<typeof prisma.scan.findUnique> extends Promise<infer T> ? T : never)

    const req = makeRequest({ scanId1: 'scan-1', scanId2: 'scan-2' })
    const res = await GET(req)
    const json = await res.json()
    // CHATGPT: scan1 mentioned=true score=80, scan2 mentioned=false → scoreB=null → delta=null
    const chatgptDiff = json.diff.find((d: { llm: string }) => d.llm === 'CHATGPT')
    expect(chatgptDiff.scoreA).toBe(80)
    expect(chatgptDiff.scoreB).toBeNull()
    expect(chatgptDiff.delta).toBeNull()
  })

  it('works for AGENCY plan too', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: USER_ID, plan: 'AGENCY' } } as ReturnType<typeof auth> extends Promise<infer T> ? T : never)
    vi.mocked(prisma.scan.findUnique)
      .mockResolvedValueOnce(SCAN_1 as unknown as ReturnType<typeof prisma.scan.findUnique> extends Promise<infer T> ? T : never)
      .mockResolvedValueOnce(SCAN_2 as unknown as ReturnType<typeof prisma.scan.findUnique> extends Promise<infer T> ? T : never)

    const req = makeRequest({ scanId1: 'scan-1', scanId2: 'scan-2' })
    const res = await GET(req)
    expect(res.status).toBe(200)
  })
})
