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
} as const

export type CreditPackId = keyof typeof CREDIT_PACKS

export const PLANS = {
  STARTER: {
    name: 'Starter',
    price: 19,
    priceId: process.env.STRIPE_STARTER_PRICE_ID ?? '',
  },
  PRO: {
    name: 'Pro',
    price: 49,
    priceId: process.env.STRIPE_PRO_PRICE_ID ?? '',
  },
  AGENCY: {
    name: 'Agency',
    price: 99,
    priceId: process.env.STRIPE_AGENCY_PRICE_ID ?? '',
  },
}
