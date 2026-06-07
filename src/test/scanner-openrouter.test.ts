import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { queryOpenRouter } from '@/lib/scanner/openrouter'

const okResponse = {
  ok: true,
  json: async () => ({ choices: [{ message: { content: 'ok' } }] }),
}

beforeEach(() => {
  process.env.OPENROUTER_API_KEY = 'test-key'
  vi.stubGlobal('fetch', vi.fn(async () => okResponse as unknown as Response))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function lastBody(): Record<string, unknown> {
  const mock = fetch as unknown as ReturnType<typeof vi.fn>
  const init = mock.mock.calls[0][1] as RequestInit
  return JSON.parse(init.body as string)
}

describe('queryOpenRouter determinism', () => {
  it('REGRESSION: defaults to temperature 0 (deterministic scans)', async () => {
    await queryOpenRouter('openai/gpt-4o-mini', 'hello')
    expect(lastBody().temperature).toBe(0)
  })

  it('still honors an explicit temperature override', async () => {
    await queryOpenRouter('openai/gpt-4o-mini', 'hello', { temperature: 0.9 })
    expect(lastBody().temperature).toBe(0.9)
  })
})
