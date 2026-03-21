# AIRank.fr — Project Instructions

Read SPECS.md for the full specifications.

## Phase 1: Project Setup (DO THIS FIRST)

1. **Create Next.js 14 project** (App Router, TypeScript, Tailwind, ESLint)
   - `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --use-pnpm`
   - If project already exists, skip this step

2. **Install dependencies:**
   ```
   pnpm add prisma @prisma/client next-auth @auth/prisma-adapter
   pnpm add stripe @stripe/stripe-js
   pnpm add resend
   pnpm add bullmq ioredis
   pnpm add recharts
   pnpm add @react-pdf/renderer
   pnpm add zod
   pnpm add lucide-react
   pnpm add class-variance-authority clsx tailwind-merge
   ```

3. **Setup shadcn/ui:**
   ```
   pnpm dlx shadcn@latest init
   ```
   Then add components: button, card, input, badge, dialog, dropdown-menu, tabs, separator, skeleton, toast, avatar, progress

4. **Setup Prisma** with the schema from SPECS.md
   - Create `prisma/schema.prisma` with the exact schema from specs
   - Use SQLite for dev (easy, no Docker needed): `provider = "sqlite"`, `url = "file:./dev.db"`
   - Run `pnpm prisma db push`

5. **Setup NextAuth** with credentials provider (email magic link later)
   - For now: simple email/password auth
   - Create auth config in `src/lib/auth.ts`

6. **Create the dark theme layout** as described in SPECS.md
   - Colors: bg #0A0A0B, surface #141416, border #27272A, primary #6366F1
   - Font: Inter + JetBrains Mono for data
   - Root layout with dark mode

7. **Create basic folder structure** as in SPECS.md

Commit after phase 1 with message "feat: project setup with Next.js, Prisma, auth, dark theme"

## Phase 2: Scanner Engine

1. **Create scanner module** in `src/lib/scanner/`
   - `index.ts` — orchestrator that calls all LLMs in parallel
   - `chatgpt.ts` — OpenAI API (gpt-4o-mini)
   - `claude.ts` — Anthropic API (claude-3-haiku)
   - `perplexity.ts` — Perplexity API (sonar-small)
   - `gemini.ts` — Google AI API (gemini-flash)

2. **Each scanner:**
   - Takes a brand name + query string
   - Sends a prompt like: "{query}. Liste les meilleures options avec leurs avantages."
   - Parses the response to detect:
     - Is the brand mentioned? (case-insensitive search)
     - Position in the response (1st mentioned, 2nd, etc.)
     - Context (extract the sentence mentioning the brand)
     - Sentiment (positive/neutral/negative based on surrounding words)
     - Competitors mentioned (other brand names in the response)
   - Returns a structured ScanResult

3. **Score calculation** in `src/lib/analysis.ts`
   - Global score 0-100 based on: mention rate × position × sentiment
   - Per-LLM breakdown

4. **API route** `POST /api/scan` — authenticated, creates scan + results in DB
5. **API route** `POST /api/scan/free` — unauthenticated, limited (1 scan, partial results)

Commit: "feat: scanner engine with 4 LLMs + scoring"

## Phase 3: Landing Page

1. **Landing page** (`src/app/page.tsx`) — as wireframed in SPECS.md
   - Hero with headline "Votre entreprise est-elle visible pour l'IA ?"
   - Free scan input (brand name → calls /api/scan/free)
   - Animated result display (score cards per LLM)
   - Social proof section
   - Features section (3 columns)
   - Pricing section (3 plans + CTA)
   - FAQ accordion
   - Footer

2. **Use Framer Motion** for animations (install it)
   - Score reveal animation
   - Card entrance animations
   - Counter animation for stats

3. **Mobile responsive** — must look great on phone

Commit: "feat: landing page with free scan + pricing"

## Phase 4: Dashboard

1. **Dashboard layout** (`src/app/(dashboard)/layout.tsx`)
   - Sidebar navigation (Dashboard, Scans, Competitors, Reports, Settings, Billing)
   - Collapsible on mobile

2. **Dashboard main** (`src/app/(dashboard)/dashboard/page.tsx`)
   - Global score card (big number + trend)
   - Per-LLM score cards (4 cards)
   - Evolution chart (recharts, line chart, 30 days)
   - Recent scans table
   - Competitor ranking

3. **Scan detail** (`src/app/(dashboard)/scans/[id]/page.tsx`)
   - Query info
   - Per-LLM result cards with response context
   - Highlighted brand mentions
   - Competitor list per LLM
   - Recommendations

4. **Settings page** — brand management (add/edit/delete brands, keywords)
5. **Billing page** — Stripe customer portal link

Commit: "feat: dashboard with charts, scan detail, settings"

## Phase 5: Stripe Integration

1. **Stripe checkout** — `POST /api/stripe/checkout`
2. **Stripe webhook** — `POST /api/stripe/webhook` (handle subscription events)
3. **Stripe portal** — `POST /api/stripe/portal`
4. **Plan enforcement** — middleware that checks user plan limits
5. **Pricing component** with Stripe checkout buttons

Commit: "feat: stripe subscription + plan enforcement"

## Phase 6: Polish & Deploy

1. **Dockerfile** + **docker-compose.yml** (app + postgres + redis)
2. **SEO** — meta tags, OG images, sitemap
3. **.env.example** with all required vars
4. **README.md** with setup instructions
5. **Error handling** — proper error pages, toast notifications
6. **Loading states** — skeletons everywhere
7. **Rate limiting** on free scan endpoint

Commit: "feat: docker deploy, SEO, polish"

## Code Style Rules
- TypeScript strict mode
- Server components by default, 'use client' only when needed
- API routes with proper error handling + zod validation
- Prisma queries in server components or API routes (never client)
- Reusable components in src/components/
- Keep files small (<200 lines), split when bigger
- French UI text, English code/comments
