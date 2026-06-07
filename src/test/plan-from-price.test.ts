import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { planFromPriceId } from '@/lib/stripe'

const ENV_KEYS = [
  'STRIPE_STARTER_PRICE_ID',
  'STRIPE_STARTER_YEARLY_PRICE_ID',
  'STRIPE_PRO_PRICE_ID',
  'STRIPE_PRO_YEARLY_PRICE_ID',
  'STRIPE_AGENCY_PRICE_ID',
  'STRIPE_AGENCY_YEARLY_PRICE_ID',
] as const

const original: Record<string, string | undefined> = {}

beforeEach(() => {
  for (const k of ENV_KEYS) original[k] = process.env[k]
  process.env.STRIPE_PRO_PRICE_ID = 'price_pro_m'
  process.env.STRIPE_PRO_YEARLY_PRICE_ID = 'price_pro_y'
  process.env.STRIPE_AGENCY_PRICE_ID = 'price_agency_m'
})

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (original[k] === undefined) delete process.env[k]
    else process.env[k] = original[k]
  }
})

describe('planFromPriceId', () => {
  it('maps a monthly price id to its plan', () => {
    expect(planFromPriceId('price_pro_m')).toBe('PRO')
  })

  it('REGRESSION: maps a YEARLY price id to its plan (previously fell through to FREE)', () => {
    expect(planFromPriceId('price_pro_y')).toBe('PRO')
  })

  it('returns null for an unknown price id', () => {
    expect(planFromPriceId('price_unknown')).toBeNull()
  })

  it('returns null for empty / nullish input', () => {
    expect(planFromPriceId('')).toBeNull()
    expect(planFromPriceId(null)).toBeNull()
    expect(planFromPriceId(undefined)).toBeNull()
  })

  it('does not match empty input even when a price env var is unset', () => {
    delete process.env.STRIPE_STARTER_PRICE_ID
    expect(planFromPriceId('')).toBeNull()
  })
})
