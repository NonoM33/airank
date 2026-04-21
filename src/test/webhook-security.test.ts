import { describe, it, expect } from 'vitest'

// Replicate the exact predicate used in webhook-dispatcher to ensure the
// denylist keeps sensitive fields out of Zapier-flattened payloads.
const SENSITIVE_FIELD_PATTERNS = [
  'password', 'secret', 'token', 'apikey', 'api_key',
  'authorization', 'cookie', 'session', 'stripe', 'webhook_secret',
  'private_key', 'privatekey',
]

function isSensitiveField(name: string): boolean {
  const lower = name.toLowerCase()
  return SENSITIVE_FIELD_PATTERNS.some((p) => lower.includes(p))
}

function flattenForZapier(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(data)) {
    if (isSensitiveField(k)) continue
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      out[`data_${k}`] = v
    }
  }
  return out
}

describe('webhook flattenForZapier denylist', () => {
  it('includes safe scalar fields', () => {
    const out = flattenForZapier({ brandId: 'b1', score: 80, mentioned: true })
    expect(out).toEqual({ data_brandId: 'b1', data_score: 80, data_mentioned: true })
  })

  it('rejects any field containing "password"', () => {
    const out = flattenForZapier({ email: 'a@b.c', password: 'oops', userPassword: 'x' })
    expect(out.data_email).toBe('a@b.c')
    expect(out.data_password).toBeUndefined()
    expect(out.data_userPassword).toBeUndefined()
  })

  it('rejects token/secret/apiKey variants', () => {
    const out = flattenForZapier({
      id: 1,
      apiKey: 'ak_live_xxx',
      api_key: 'ak_live_yyy',
      accessToken: 'gh_xx',
      refreshToken: 'rf_xx',
      stripeSecret: 'sk_xxx',
      webhookSecret: 'whs_xxx',
    })
    expect(out.data_id).toBe(1)
    expect(Object.keys(out)).toEqual(['data_id'])
  })

  it('rejects fields containing "session" or "cookie"', () => {
    const out = flattenForZapier({ userName: 'x', sessionId: 's1', cookieValue: 'c' })
    expect(out.data_userName).toBe('x')
    expect(out.data_sessionId).toBeUndefined()
    expect(out.data_cookieValue).toBeUndefined()
  })

  it('does not crash on empty or nested values', () => {
    const out = flattenForZapier({ arr: [1, 2], obj: { a: 1 }, scalar: 'ok' })
    expect(out.data_scalar).toBe('ok')
    expect(out.data_arr).toBeUndefined()
    expect(out.data_obj).toBeUndefined()
  })
})
