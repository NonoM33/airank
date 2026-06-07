import Stripe from 'stripe'

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-02-25.clover',
    })
  : (null as unknown as Stripe)

export const CREDIT_PACKS = {
  PACK_50: { credits: 50, price: 9, label: '50 crédits' },
  PACK_200: { credits: 200, price: 29, label: '200 crédits' },
  PACK_500: { credits: 500, price: 59, label: '500 crédits' },
  PACK_2000: { credits: 2000, price: 199, label: '2000 crédits (Enterprise)' },
} as const

export type CreditPackId = keyof typeof CREDIT_PACKS

// Annual billing = 2 months free (~17% discount)
export const ANNUAL_DISCOUNT = 0.17

export const PLANS = {
  STARTER: {
    name: 'Starter',
    price: 19,
    priceYearly: 190,
    priceId: process.env.STRIPE_STARTER_PRICE_ID ?? '',
    priceIdYearly: process.env.STRIPE_STARTER_YEARLY_PRICE_ID ?? '',
  },
  PRO: {
    name: 'Pro',
    price: 49,
    priceYearly: 490,
    priceId: process.env.STRIPE_PRO_PRICE_ID ?? '',
    priceIdYearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID ?? '',
  },
  AGENCY: {
    name: 'Agency',
    price: 99,
    priceYearly: 990,
    priceId: process.env.STRIPE_AGENCY_PRICE_ID ?? '',
    priceIdYearly: process.env.STRIPE_AGENCY_YEARLY_PRICE_ID ?? '',
  },
}

// AppSumo Lifetime Deal tiers (stackable)
export const LIFETIME_TIERS = {
  tier1: {
    name: 'Lifetime Tier 1',
    price: 59,
    credits: 500,
    brands: 3,
    llms: 3,
    equivalent: 'STARTER',
    priceId: process.env.STRIPE_LTD_TIER1_PRICE_ID ?? '',
  },
  tier2: {
    name: 'Lifetime Tier 2',
    price: 119,
    credits: 2000,
    brands: 10,
    llms: 4,
    equivalent: 'PRO',
    priceId: process.env.STRIPE_LTD_TIER2_PRICE_ID ?? '',
  },
  tier3: {
    name: 'Lifetime Tier 3',
    price: 249,
    credits: 10000,
    brands: 50,
    llms: 4,
    equivalent: 'AGENCY',
    priceId: process.env.STRIPE_LTD_TIER3_PRICE_ID ?? '',
  },
} as const

export type LifetimeTierId = keyof typeof LIFETIME_TIERS

export const TRIAL_DAYS = 14

/**
 * Resolve a subscription plan from a Stripe price id, covering BOTH monthly and
 * yearly price ids. Returns null for unknown/empty prices (never guesses a plan).
 * Empty env vars are ignored so an unset price id can't match an empty input.
 */
export function planFromPriceId(
  priceId: string | null | undefined
): 'STARTER' | 'PRO' | 'AGENCY' | null {
  if (!priceId) return null
  const entries: Array<[string | undefined, 'STARTER' | 'PRO' | 'AGENCY']> = [
    [process.env.STRIPE_STARTER_PRICE_ID, 'STARTER'],
    [process.env.STRIPE_STARTER_YEARLY_PRICE_ID, 'STARTER'],
    [process.env.STRIPE_PRO_PRICE_ID, 'PRO'],
    [process.env.STRIPE_PRO_YEARLY_PRICE_ID, 'PRO'],
    [process.env.STRIPE_AGENCY_PRICE_ID, 'AGENCY'],
    [process.env.STRIPE_AGENCY_YEARLY_PRICE_ID, 'AGENCY'],
  ]
  for (const [id, plan] of entries) {
    if (id && id === priceId) return plan
  }
  return null
}
