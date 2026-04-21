# CLAUDE.md — AIRank Project Guidelines

## 🤖 AUTONOMOUS AUDIT-FIX-SHIP PROTOCOL

Quand l'utilisateur demande « fais tous les tests E2E + remonte tous les soucis + gère toutes les issues » (ou équivalent), suis ce protocole exact :

### 0. Setup (une seule fois au début de la session)
- Vérifier `gh auth status` et git remote
- Vérifier que le staging Coolify est accessible et fonctionnel
- Si une branche de travail n'existe pas, repartir de `main` à jour

### 1. Phase AUDIT (1x par session)
- **Spawn un agent `general-purpose` en background** pour E2E testing contre le staging
- L'agent doit : probe HTTP toutes les pages, teste toutes les API critiques avec cookies session, teste les 2 tiers (FREE / AGENCY), vérifie les paywalls, code-review des fichiers clés
- Output attendu : ≥ 20 issues structurées (title, severity, category, reproduction, fix_hint, files)

### 2. Phase CREATE ISSUES (batch)
- Pour chaque issue remontée, créer une GitHub issue via `gh issue create` avec :
  - Title clair, actionnable
  - Body : description + reproduction steps + fix hint + files
  - Labels : `severity/{critical|high|medium|low}`, `category/{security|bug|ux|perf|consistency|missing|tech-debt}`, `auto-audit`
- Ranger par priorité : critical > high > medium > low

### 3. Phase LOOP — par issue (itératif)

Pour CHAQUE issue, dans l'ordre de priorité :

1. **Branch** : créer `fix/issue-<number>` depuis la dernière `stg`
2. **Fix** : coder la correction dans le repo
3. **Tests** :
   - Si test unitaire/intégration pertinent → `src/__tests__/` ou adjacent au code
   - Run `pnpm test:run` — doit passer
4. **Local validation** : `pnpm build` — zéro erreur TS
5. **Commit** : message `fix: <titre issue> (#<num>)` avec `Closes #<num>` dans le body
6. **Push** : sur `stg` (ou PR si c'est critique)
7. **Deploy staging** : trigger Coolify API → attendre `finished` via Monitor
8. **E2E verify staging** : curl les endpoints impactés + check logs runtime
9. **Merge vers main** : `git push origin stg:main` (si staging OK)
10. **Deploy production** : trigger l'app prod Coolify → attendre `finished`
11. **E2E verify prod** : même check sur URL prod
12. **Close l'issue** : `gh issue close <num> --comment "Fixed in <sha>. Deployed to staging + prod. E2E verified."`
13. **Passer à l'issue suivante**

### 4. Règles d'arrêt
- Si build fail → fix avant de passer à la suite
- Si deploy staging fail → rollback (git revert) + investiguer + re-fix
- Si E2E staging fail → ne PAS merger vers main, rouvrir l'issue
- Si deploy prod fail → rollback prod immédiat
- Si l'issue est ambiguë → commenter sur l'issue et skip (ne pas merger une fix douteuse)

### 5. Documentation continue
- Après chaque fix, si un pattern revient 2+ fois → l'ajouter dans "Common Pitfalls" de ce CLAUDE.md
- Ne jamais ignorer un warning lint/TS — toujours fixer

### 6. Coolify resources (staging + prod)
```
Staging app   : airank-frontend-stg (j44sko4080swo4scwww4k0ww)
Staging URL   : https://stg-app.airank.157.180.43.90.sslip.io
Staging DB    : airank-db-stg (ow804k84s8os0g408o4wws84)
Prod app      : AIRank (n8s0408cowgkgcw8gk00skko)
Prod URL      : https://airank.fr
Coolify Perso : http://157.180.43.90:8000
Branches      : main = prod, stg = staging
```

### 7. Test accounts (staging uniquement)
```
AGENCY : test@airank.fr / AirankStg2026!
FREE   : demo@airank.fr / Demo2026!
```

---

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

**Source de vérité unique** : `src/lib/credits.ts` (exporté comme `PLAN_CREDITS` + `CREDIT_COSTS`). Toute la UI (sidebar, billing, pricing) DOIT lire ces consts — ne jamais redéfinir ailleurs.

Allotments par plan :
- FREE: 20 credits (one-time, seed au signup)
- STARTER: 500 credits / mois
- PRO: 2000 credits / mois
- AGENCY: 10000 credits / mois

Coûts par action (aligné sur CREDIT_COSTS) :
- scan / auto_scan : 10
- competitor_analysis : 20
- content_faq / content_press : 20
- content_article : 30
- sector_watch : 2

Credit packs (one-time Stripe) :
- PACK_50 → 9€
- PACK_200 → 29€
- PACK_500 → 59€
- PACK_2000 → 199€ (Enterprise)

**Seeding** : sur upgrade de plan (sync-plan ou Stripe webhook), les crédits montent à `PLAN_CREDITS[nouveau plan]` sans jamais réduire la balance existante (on ne punit pas un downgrade mid-cycle).

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
