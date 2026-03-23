# CLAUDE.md — AIRank Project Guidelines

## ⚠️ TESTING (MANDATORY — READ THIS FIRST)
**Every feature MUST be tested before committing.** No exceptions.

### Testing Checklist (run for EVERY feature):
1. **Build test**: `pnpm build` must pass with zero errors
2. **API routes**: `curl` test every new/modified API route with valid AND invalid inputs:
   - ✅ Valid request → correct response
   - ✅ Missing auth → 401
   - ✅ Invalid input → 400 with helpful message
   - ✅ No credits → 402 with credit CTA
   - ✅ Edge cases: empty strings, missing fields, extra long inputs
3. **URL inputs**: ALWAYS test with AND without `https://` prefix. Auto-add `https://` in the API route.
4. **UI components**: Check the dev server renders without console errors
5. **State management**: Test loading, error, success, and empty states
6. **Multi-brand**: Test with 0, 1, and 3+ brands
7. **Credits**: Test with 0 credits (should show CTA, not red text)

### Results Persistence (CRITICAL — NO DATA LOSS)
- **EVERY analysis/tool result MUST be saved to DB** — users pay credits for results, they must be able to re-consult them anytime
- Use the `AnalysisResult` model to store results (type, userId, brandId, input, result JSON, createdAt)
- Before running an analysis, check if a recent cached result exists (< 24h) — if so, return it for free
- Show analysis history: users can browse all their past results
- **NEVER make users pay twice to see the same result**

### Common Pitfalls (DON'T repeat these):
- ❌ `z.string().url()` rejects URLs without protocol → always auto-prefix `https://`
- ❌ Server imports (prisma, db) in 'use client' components → use fetch() instead
- ❌ `loading` state not defined in scope → use local component state
- ❌ `--accept-data-loss` in prisma → use `migrate deploy`
- ❌ Hardcoded `brands[0]` → always add brand selector
- ❌ Analysis results not saved → ALWAYS persist to AnalysisResult table
- ❌ Credits charged on re-view → cache results, return cached for free

### Brand Selector (MANDATORY ON EVERY PAGE WITH DATA)
- **EVERY page** that shows brand-specific data MUST have a brand selector if user has 2+ brands
- Pattern: pill-style buttons or dropdown (see heatmap/HeatmapClient.tsx)
- Default: first brand, but user can switch
- **GLOBAL VERIFICATION**: search for `brands[0]` in ALL files — if found without a selector, it's a bug
- Pages to verify: Dashboard, Scans, Heatmap, Compare, Analytics, Growth, Veille, SEO Tools, Reports

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
- **URL inputs**: Placeholder should NOT include `https://`. Auto-prefix in API route.

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

## Stripe Configuration
- Mode: Test (sk_test_...)
- Checkout recharge: POST /api/stripe/recharge
- Webhook: POST /api/stripe/webhook (handles credit_recharge + subscriptions)
- Credit packs: PACK_50 (9€), PACK_200 (29€), PACK_500 (59€)

## File Structure
- `src/components/ui/credit-cta.tsx` — Reusable CTA component for credit upsells
- `src/lib/credits.ts` — Credit usage tracking
- `src/lib/stripe.ts` — Plans + credit packs config
- `src/lib/plan-data.ts` — Client-safe plan limits (no DB imports)
