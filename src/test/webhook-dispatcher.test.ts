import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ─── Mock prisma ──────────────────────────────────────────────────────────────
// vi.mock is hoisted — do NOT reference module-scope variables in the factory.

vi.mock('@/lib/db', () => ({
  prisma: {
    webhookConfig: {
      findMany: vi.fn(),
    },
  },
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockWebhooks = [
  {
    url: 'https://example.com/webhook1',
    secret: 'secret-abc-123',
    events: '["scan.completed","alert.created"]',
  },
  {
    url: 'https://example.com/webhook2',
    secret: 'secret-xyz-456',
    events: '["scan.completed"]',
  },
]

// ─── Imports after mocks ──────────────────────────────────────────────────────

import { dispatchWebhook } from '@/lib/webhook-dispatcher'
import { prisma } from '@/lib/db'

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('dispatchWebhook', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.mocked(prisma.webhookConfig.findMany).mockResolvedValue(mockWebhooks as never)
    fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('calls fetch for each active webhook matching the event', async () => {
    await dispatchWebhook('user-1', 'scan.completed', { scanId: 'scan-123' })
    // Both webhooks subscribe to 'scan.completed'
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('sends POST to the correct webhook URLs', async () => {
    await dispatchWebhook('user-1', 'scan.completed', { scanId: 'scan-123' })
    const urls = fetchMock.mock.calls.map((c: unknown[]) => (c as [string])[0])
    expect(urls).toContain('https://example.com/webhook1')
    expect(urls).toContain('https://example.com/webhook2')
  })

  it('includes X-AIRank-Signature header in each request', async () => {
    await dispatchWebhook('user-1', 'scan.completed', { scanId: 'scan-123' })
    for (const call of fetchMock.mock.calls) {
      const options = call[1] as RequestInit
      const headers = options.headers as Record<string, string>
      expect(headers['X-AIRank-Signature']).toBeTruthy()
      expect(typeof headers['X-AIRank-Signature']).toBe('string')
      expect(headers['X-AIRank-Signature']).toMatch(/^[a-f0-9]{64}$/) // 64 hex chars (SHA-256)
    }
  })

  it('only dispatches to webhooks matching the event', async () => {
    // Only webhook1 subscribes to 'alert.created'
    await dispatchWebhook('user-1', 'alert.created', { alertId: 'alert-456' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('https://example.com/webhook1')
  })

  it('does not throw when fetch fails (fire-and-forget)', async () => {
    fetchMock.mockRejectedValue(new Error('Network error'))
    await expect(
      dispatchWebhook('user-1', 'scan.completed', { scanId: 'test' })
    ).resolves.not.toThrow()
  })

  it('does not throw when prisma fails', async () => {
    const { prisma } = await import('@/lib/db')
    vi.mocked(prisma.webhookConfig.findMany).mockRejectedValueOnce(new Error('DB error'))
    await expect(
      dispatchWebhook('user-1', 'scan.completed', { scanId: 'test' })
    ).resolves.not.toThrow()
  })

  it('sends JSON body with event, data, and timestamp', async () => {
    const data = { scanId: 'scan-789', score: 85 }
    await dispatchWebhook('user-1', 'scan.completed', data)
    const call = fetchMock.mock.calls[0]
    const options = call[1] as RequestInit
    const body = JSON.parse(options.body as string)
    expect(body.event).toBe('scan.completed')
    expect(body.data).toEqual(data)
    expect(body.timestamp).toBeTruthy()
  })
})
