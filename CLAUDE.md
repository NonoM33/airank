# CLAUDE.md — AIRank Project Guidelines

## UX Principles (MANDATORY)
1. **Apple-level polish** — Every screen must be beautiful, clear, and intuitive. No confusion ever.
2. **Brand context everywhere** — Always show which brand data belongs to. Add brand selectors on ALL pages with data.
3. **Never show raw errors** — "Crédits insuffisants" → CTA to recharge. "Erreur" → helpful guidance. Use `<CreditCTA>` component for 402 errors.
4. **Monetization-first UX** — Every paywall moment is a conversion opportunity. Use `<CreditCTA variant="banner">` for inline upsells. Show prices. Make it easy to buy.
5. **Dark mode premium** — Background #141416, cards #1C1C1E, accent violet/indigo. Consistent everywhere.
6. **Scans = always tied to a brand** — Never show orphaned scans. Always display brand name, date, and query.

## Component Patterns
- **Error handling**: Check `res.status === 402` → show `<CreditCTA>` instead of red text
- **Brand selector**: Use pill-style buttons (see heatmap/HeatmapClient.tsx pattern)
- **Loading states**: Show skeleton/spinner with context ("Chargement des scans pour BK...")
- **Empty states**: Helpful message + CTA to add data

## Architecture
- **Frontend**: Next.js 16 + Tailwind + shadcn/ui (dark mode)
- **Backend**: Being extracted to airank-api (API-only Next.js)
- **DB**: PostgreSQL on Coolify (VPS 157.180.43.90)
- **Auth**: NextAuth v5 (JWT, credentials)
- **Payments**: Stripe (subscriptions + one-time credit packs)
- **LLM Scanning**: OpenRouter (1 key → GPT-4o-mini, Claude Haiku, Sonar, Gemini Flash)

## Credit System
- Free: 20 credits (one-time)
- Starter: 50/month, Pro: 200/month, Agency: 1000/month
- Recharges: 50→9€, 200→29€, 500→59€
- Costs: scan=1, analysis=2, benchmark=3, content=3

## File Structure
- `src/components/ui/credit-cta.tsx` — Reusable CTA component for credit upsells
- `src/lib/credits.ts` — Credit usage tracking
- `src/lib/stripe.ts` — Plans + credit packs config
