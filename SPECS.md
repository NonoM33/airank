# 🔍 AIRank.fr — Spécifications Complètes

> **"Votre entreprise est-elle visible pour l'IA ?"**

## 📋 Résumé Exécutif

AIRank est un outil SaaS qui analyse la visibilité d'une marque/entreprise dans les réponses des LLMs (ChatGPT, Claude, Perplexity, Gemini). Il répond à LA question que toutes les entreprises se posent en 2026 : "Est-ce que l'IA me recommande ?"

---

## 🌐 Domaines Disponibles (confirmés)

| Domaine | Prix estimé | Verdict |
|---------|-------------|---------|
| **airank.fr** ⭐ | ~8€/an OVH | **RECOMMANDÉ** — court, mémorable, parfait |
| aipresence.fr | ~8€/an | Bon backup, plus descriptif |
| amivisible.fr | ~8€/an | Concept marketing FR fort ("Am I Visible?") |
| eclairai.fr | ~8€/an | Jeu de mot sympa (éclairé + AI) |
| suisjevisible.fr | ~8€/an | Trop long |

**👉 Recommandation : airank.fr** — universel, brandable, fonctionne en FR et EN.

---

## 🎯 Proposition de Valeur

### Le problème
- Les entreprises investissent dans le SEO Google mais ignorent leur visibilité IA
- ChatGPT, Perplexity, Claude recommandent des produits/services à des millions d'utilisateurs
- Personne ne sait si son entreprise est mentionnée ou pas
- Pas d'outil en français pour tracker ça

### La solution
AIRank scanne les principaux LLMs avec des requêtes liées à votre secteur et vous montre :
- ✅ Si vous êtes mentionné (et comment)
- ❌ Si vous êtes absent (et qui est mentionné à la place)
- 📊 Un score de visibilité IA global
- 💡 Des recommandations concrètes pour améliorer votre présence

---

## 👥 Personas Cibles

### 1. Agences SEO/Marketing (PRIMARY — $$$)
- Veulent proposer ce service à leurs clients
- Paient 50-200€/mois facilement
- Besoin : rapports white-label, multi-clients

### 2. PME / E-commerce (SECONDARY)
- "Mon concurrent apparaît dans ChatGPT et pas moi"
- Paient 19-49€/mois
- Besoin : dashboard simple, alertes

### 3. Freelances Marketing/Consultants (TERTIARY)
- Veulent se différencier avec un nouvel outil
- Paient 19-29€/mois
- Besoin : rapports clients, insights

---

## 💰 Pricing

### Gratuit (Lead Gen)
- 1 scan unique de votre marque
- Score de visibilité basique
- "Débloquez le rapport complet pour 19€/mois"

### Starter — 19€/mois
- 1 marque
- 10 requêtes analysées / jour
- 3 LLMs (ChatGPT, Perplexity, Gemini)
- Dashboard + historique 30 jours
- Alertes email

### Pro — 49€/mois ⭐ (objectif principal)
- 3 marques
- 50 requêtes / jour
- 4 LLMs (+ Claude)
- Historique 90 jours
- Rapports PDF export
- Analyse concurrents (jusqu'à 5)
- Recommandations IA personnalisées

### Agency — 99€/mois
- 10 marques
- 200 requêtes / jour
- Tous les LLMs
- Historique illimité
- Rapports white-label (logo client)
- API access
- Support prioritaire

### Lifetime Deal (AppSumo launch)
- Plan Pro à vie pour 59€ one-shot
- Objectif : 500 ventes = 29 500€ de cash immédiat

---

## 🏗️ Architecture Technique

### Stack
- **Frontend :** Next.js 14 (App Router) + Tailwind CSS + shadcn/ui
- **Backend :** Next.js API Routes + Prisma ORM
- **Base de données :** PostgreSQL (sur Coolify)
- **Auth :** NextAuth.js (Google + email magic link)
- **Paiements :** Stripe (subscriptions + checkout)
- **Emails :** Resend (transactionnel + alertes)
- **Queue/Cron :** BullMQ + Redis (scans programmés)
- **Hébergement :** Coolify (VPS 157.180.43.90)
- **Analytics :** Plausible self-hosted ou PostHog

### APIs LLMs utilisées
| LLM | API | Coût estimé/requête |
|-----|-----|---------------------|
| ChatGPT | OpenAI API (GPT-4o-mini) | ~0.01€ |
| Claude | Anthropic API (Haiku) | ~0.005€ |
| Perplexity | Perplexity API (sonar-small) | ~0.005€ |
| Gemini | Google AI (Flash) | ~0.002€ |

**Coût moyen par scan complet (4 LLMs, 10 requêtes) : ~0.50€**
**Marge sur plan Starter (19€/mois) : ~95%** 🤑

### Architecture simplifiée
```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Frontend   │────▶│  API Routes  │────▶│  PostgreSQL  │
│   Next.js    │     │  + BullMQ    │     │  (Prisma)    │
└─────────────┘     └──────┬───────┘     └─────────────┘
                           │
                    ┌──────▼───────┐
                    │  LLM Scanner │
                    │  (Workers)   │
                    ├──────────────┤
                    │ • OpenAI     │
                    │ • Anthropic  │
                    │ • Perplexity │
                    │ • Google AI  │
                    └──────────────┘
```

---

## 📱 UI/UX — Design System

### Style
- **Vibe :** Dark mode par défaut, premium, data-driven (style Linear/Vercel)
- **Palette :**
  - Background : `#0A0A0B` (near black)
  - Surface : `#141416` (cards)
  - Border : `#27272A` (zinc-800)
  - Primary : `#6366F1` (indigo-500, accent principal)
  - Success : `#22C55E` (green-500, "visible")
  - Warning : `#F59E0B` (amber-500, "partiellement visible")
  - Danger : `#EF4444` (red-500, "invisible")
  - Text : `#FAFAFA` (zinc-50)
  - Muted : `#A1A1AA` (zinc-400)
- **Font :** Inter (body) + JetBrains Mono (scores/data)
- **Radius :** 8px (cards), 6px (buttons)
- **Shadows :** subtiles, inset glow sur les cards

### Pages

#### 1. Landing Page (`/`)
```
┌────────────────────────────────────────────────┐
│  [Logo AIRank]          Features Pricing  [CTA]│
├────────────────────────────────────────────────┤
│                                                │
│  Votre entreprise est-elle                     │
│  visible pour l'IA ?                           │
│                                                │
│  Découvrez si ChatGPT, Perplexity et Gemini    │
│  recommandent votre marque — ou vos concurrents│
│                                                │
│  ┌──────────────────────────────────┐          │
│  │ 🔍 Entrez votre marque...    [Scanner] │    │
│  └──────────────────────────────────┘          │
│                                                │
│  ✨ 2,847 marques déjà scannées               │
│                                                │
├────────────────────────────────────────────────┤
│  RÉSULTAT DEMO (animation)                     │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐         │
│  │GPT-4 │ │Claude│ │Perpl.│ │Gemini│         │
│  │ ✅ 8 │ │ ❌ 0 │ │ ✅ 3 │ │ ⚠️ 1 │         │
│  │ /10  │ │ /10  │ │ /10  │ │ /10  │         │
│  └──────┘ └──────┘ └──────┘ └──────┘         │
│                                                │
│  Score Global : 42/100 ⚠️                     │
│  "Votre marque est partiellement visible"      │
│                                                │
├────────────────────────────────────────────────┤
│  SOCIAL PROOF                                  │
│  "On ne savait pas que nos concurrents         │
│   étaient recommandés par ChatGPT"             │
│   — Marie D., Agence WebFlow Paris             │
│                                                │
├────────────────────────────────────────────────┤
│  PRICING (3 plans)                             │
├────────────────────────────────────────────────┤
│  FAQ                                           │
├────────────────────────────────────────────────┤
│  Footer                                        │
└────────────────────────────────────────────────┘
```

#### 2. Dashboard (`/dashboard`)
```
┌────────────────────────────────────────────────┐
│  [Sidebar]          Dashboard Principal        │
│  ├ Dashboard        ┌────────────────────────┐ │
│  ├ Scans            │ Score Global    72/100  │ │
│  ├ Concurrents      │ ████████████░░░  ↑+12  │ │
│  ├ Rapports         └────────────────────────┘ │
│  ├ Paramètres                                  │
│  └ Billing          ┌──────┐┌──────┐┌──────┐  │
│                     │ChatGPT││Claude││Perpl.│  │
│                     │ 85%  ✅││ 23% ❌││ 67% ⚠️││
│                     └──────┘└──────┘└──────┘  │
│                                                │
│  📈 Évolution (graphe 30 jours)               │
│  ┌────────────────────────────────────────┐    │
│  │    ╱‾‾╲    ╱‾‾‾‾‾╲                   │    │
│  │   ╱    ╲──╱       ╲──────────         │    │
│  │──╱                                     │    │
│  └────────────────────────────────────────┘    │
│                                                │
│  📋 Dernières requêtes analysées              │
│  ┌────────────────────────────────────────┐    │
│  │ "meilleur restaurant italien Paris"    │    │
│  │ ✅ GPT: Mentionné #2 │ ❌ Claude: Absent│   │
│  ├────────────────────────────────────────┤    │
│  │ "restaurant italien livraison 75011"   │    │
│  │ ❌ GPT: Absent │ ✅ Perplexity: #1     │    │
│  └────────────────────────────────────────┘    │
│                                                │
│  🏆 Vos concurrents dans l'IA                 │
│  ┌────────────────────────────────────────┐    │
│  │ 1. Concurrent A — Score 89 ████████▉  │    │
│  │ 2. VOUS — Score 72 ███████▏            │    │
│  │ 3. Concurrent B — Score 45 ████▌       │    │
│  └────────────────────────────────────────┘    │
└────────────────────────────────────────────────┘
```

#### 3. Scan Detail (`/scans/[id]`)
```
┌────────────────────────────────────────────────┐
│  Requête : "meilleur CRM pour PME"             │
│  Scannée le 21/03/2026 à 14:30                 │
│                                                │
│  ┌─ ChatGPT ────────────────────────────────┐  │
│  │ ✅ MENTIONNÉ — Position #3               │  │
│  │                                           │  │
│  │ "...parmi les meilleurs CRM pour PME,    │  │
│  │  on trouve Salesforce, HubSpot, et       │  │
│  │  **[VOTRE MARQUE]** qui se distingue     │  │
│  │  par sa simplicité..."                    │  │
│  │                                           │  │
│  │ Contexte : Recommandation positive        │  │
│  │ Sentiment : 😊 Positif                   │  │
│  └───────────────────────────────────────────┘  │
│                                                │
│  ┌─ Claude ──────────────────────────────────┐  │
│  │ ❌ NON MENTIONNÉ                         │  │
│  │                                           │  │
│  │ Marques citées à la place :               │  │
│  │ • Salesforce (position #1)                │  │
│  │ • HubSpot (position #2)                   │  │
│  │ • Pipedrive (position #3)                 │  │
│  │                                           │  │
│  │ 💡 Reco : Augmentez vos mentions sur     │  │
│  │ les sites que Claude utilise comme source │  │
│  └───────────────────────────────────────────┘  │
└────────────────────────────────────────────────┘
```

#### 4. Rapport PDF (export)
- Header avec logo client (white-label Agency)
- Score global + breakdown par LLM
- Top requêtes où la marque apparaît
- Top requêtes où elle est absente
- Analyse concurrentielle
- Recommandations actionnables
- Branding AIRank en footer (ou masqué si Agency)

---

## 🔧 Backend — Détail Technique

### Base de données (Prisma Schema)

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  image         String?
  plan          Plan      @default(FREE)
  stripeId      String?   @unique
  brands        Brand[]
  createdAt     DateTime  @default(now())
}

model Brand {
  id            String    @id @default(cuid())
  name          String
  domain        String?
  keywords      String[]  // requêtes à scanner
  userId        String
  user          User      @relation(fields: [userId], references: [id])
  scans         Scan[]
  competitors   Competitor[]
  createdAt     DateTime  @default(now())
}

model Competitor {
  id            String    @id @default(cuid())
  name          String
  brandId       String
  brand         Brand     @relation(fields: [brandId], references: [id])
}

model Scan {
  id            String    @id @default(cuid())
  brandId       String
  brand         Brand     @relation(fields: [brandId], references: [id])
  query         String    // la requête envoyée aux LLMs
  results       ScanResult[]
  globalScore   Int       // 0-100
  createdAt     DateTime  @default(now())
}

model ScanResult {
  id            String    @id @default(cuid())
  scanId        String
  scan          Scan      @relation(fields: [scanId], references: [id])
  llm           LLM
  mentioned     Boolean
  position      Int?      // position dans la réponse (1 = premier cité)
  context       String?   // extrait de la réponse
  sentiment     Sentiment?
  competitors   String[]  // autres marques citées
  rawResponse   String    @db.Text
}

enum Plan {
  FREE
  STARTER
  PRO
  AGENCY
}

enum LLM {
  CHATGPT
  CLAUDE
  PERPLEXITY
  GEMINI
}

enum Sentiment {
  POSITIVE
  NEUTRAL
  NEGATIVE
}
```

### API Routes

```
POST /api/auth/[...nextauth]     → Auth (Google + magic link)
GET  /api/brands                 → Liste des marques
POST /api/brands                 → Créer une marque
GET  /api/brands/[id]/scans      → Historique scans
POST /api/scan                   → Lancer un scan
GET  /api/scan/[id]              → Détail scan
GET  /api/dashboard              → Stats dashboard
GET  /api/competitors/[brandId]  → Analyse concurrents
GET  /api/reports/[brandId]      → Générer rapport PDF
POST /api/stripe/checkout        → Créer session Stripe
POST /api/stripe/webhook         → Webhook Stripe
POST /api/stripe/portal          → Portail client Stripe
GET  /api/scan/free              → Scan gratuit (landing page)
```

### Scanner Engine (le cœur du produit)

```typescript
// Pseudo-code du scanner
async function scanBrand(brand: Brand, query: string): Promise<ScanResult[]> {
  const results = await Promise.all([
    scanChatGPT(brand.name, query),
    scanClaude(brand.name, query),
    scanPerplexity(brand.name, query),
    scanGemini(brand.name, query),
  ]);
  
  return results.map(r => ({
    llm: r.llm,
    mentioned: r.response.toLowerCase().includes(brand.name.toLowerCase()),
    position: extractPosition(r.response, brand.name),
    context: extractContext(r.response, brand.name),
    sentiment: analyzeSentiment(r.response, brand.name),
    competitors: extractCompetitors(r.response, brand.competitors),
    rawResponse: r.response,
  }));
}

// Prompts envoyés aux LLMs
function buildPrompt(query: string): string {
  return `${query}. Liste les meilleures options avec leurs avantages et inconvénients.`;
}
```

### Cron Jobs (BullMQ)
- **Scan quotidien** : à 6h, scan toutes les marques actives avec leurs keywords
- **Alertes** : si un changement significatif (apparition/disparition), email au user
- **Nettoyage** : purge des scans > 90 jours pour plan Starter

---

## 📊 Métriques & Analytics

### KPIs à tracker
- Nombre de scans gratuits (conversion funnel top)
- Taux de conversion free → paid
- MRR / ARR
- Churn rate
- Coût par scan (marge)
- NPS

### Funnel de conversion
```
Landing Page (100%)
    ↓ Scan gratuit
Résultat partiel (60%)
    ↓ "Voir le rapport complet"
Signup (25%)
    ↓ Trial / checkout
Paid (8-12%)
```

---

## 🚀 Stratégie de Lancement

### Semaine 1 : Build
- J1 : Setup projet, DB, auth, Stripe
- J2 : Scanner engine (4 LLMs)
- J3 : Dashboard + résultats
- J4 : Landing page + scan gratuit
- J5 : Deploy Coolify + domaine OVH
- J6 : Tests end-to-end, polish UI
- J7 : Soft launch

### Semaine 2 : Launch
- J8 : Post LinkedIn FR viral + vidéo démo
- J9 : Product Hunt launch
- J10 : Email 100 agences SEO françaises
- J11 : Post Reddit r/SEO, r/marketing, r/SaaS
- J12 : Soumettre sur AppSumo
- J13-14 : Itérer sur le feedback

### Acquisition premiers clients
1. **LinkedIn organique** — Post "J'ai scanné 100 marques françaises, voici les résultats" (données réelles = viralité)
2. **Cold email agences SEO** — "Proposez l'audit IA à vos clients, outil white-label"
3. **Product Hunt** — Launch day coordonné
4. **AppSumo** — Lifetime deal 59€ pour le cash immédiat
5. **SEO** — Blog articles "Comment apparaître dans ChatGPT", "ChatGPT recommande-t-il votre entreprise"
6. **Twitter/X** — Thread avec screenshots de résultats choquants

---

## 📁 Structure du Projet

```
airank/
├── src/
│   ├── app/
│   │   ├── page.tsx                 # Landing page
│   │   ├── layout.tsx               # Root layout (dark theme)
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── signup/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx           # Dashboard layout (sidebar)
│   │   │   ├── dashboard/page.tsx   # Vue principale
│   │   │   ├── scans/page.tsx       # Historique scans
│   │   │   ├── scans/[id]/page.tsx  # Détail scan
│   │   │   ├── competitors/page.tsx # Analyse concurrents
│   │   │   ├── reports/page.tsx     # Rapports
│   │   │   ├── settings/page.tsx    # Paramètres
│   │   │   └── billing/page.tsx     # Stripe billing
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts
│   │       ├── brands/route.ts
│   │       ├── scan/route.ts
│   │       ├── scan/free/route.ts
│   │       ├── dashboard/route.ts
│   │       ├── reports/route.ts
│   │       └── stripe/
│   │           ├── checkout/route.ts
│   │           ├── webhook/route.ts
│   │           └── portal/route.ts
│   ├── components/
│   │   ├── ui/                      # shadcn components
│   │   ├── landing/                 # Landing page sections
│   │   ├── dashboard/               # Dashboard widgets
│   │   ├── scan/                    # Scan result cards
│   │   └── charts/                  # Graphiques (recharts)
│   ├── lib/
│   │   ├── db.ts                    # Prisma client
│   │   ├── auth.ts                  # NextAuth config
│   │   ├── stripe.ts                # Stripe helpers
│   │   ├── scanner/
│   │   │   ├── index.ts             # Scanner orchestrator
│   │   │   ├── chatgpt.ts           # OpenAI scanner
│   │   │   ├── claude.ts            # Anthropic scanner
│   │   │   ├── perplexity.ts        # Perplexity scanner
│   │   │   └── gemini.ts            # Google AI scanner
│   │   ├── analysis.ts             # Score calculation
│   │   └── pdf.ts                  # PDF report generator
│   └── styles/
│       └── globals.css              # Tailwind + custom
├── prisma/
│   └── schema.prisma
├── public/
│   └── images/
├── .env.example
├── Dockerfile
├── docker-compose.yml              # App + Postgres + Redis
├── package.json
└── README.md
```

---

## ⚙️ Variables d'Environnement

```env
# Database
DATABASE_URL=postgresql://airank:xxx@db:5432/airank

# Auth
NEXTAUTH_SECRET=xxx
NEXTAUTH_URL=https://airank.fr
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_STARTER_PRICE_ID=price_xxx
STRIPE_PRO_PRICE_ID=price_xxx
STRIPE_AGENCY_PRICE_ID=price_xxx

# LLM APIs
OPENAI_API_KEY=sk-xxx
ANTHROPIC_API_KEY=sk-ant-xxx
PERPLEXITY_API_KEY=pplx-xxx
GOOGLE_AI_API_KEY=xxx

# Email
RESEND_API_KEY=re_xxx
EMAIL_FROM=hello@airank.fr

# Redis (pour BullMQ)
REDIS_URL=redis://redis:6379
```

---

## 🎯 Objectifs Financiers

| Période | Objectif MRR | Comment |
|---------|-------------|---------|
| Mois 1 | 500€ | 25 clients Starter + scan gratuit viral |
| Mois 2 | 1 500€ | AppSumo launch + 30 Pro |
| Mois 3 | 3 000€ | Agences SEO + bouche-à-oreille |
| Mois 6 | 8 000€ | SEO organique + content marketing |
| Mois 12 | 15 000€+ | Référence FR du marché |

**Break-even :** ~10 clients Starter (190€/mois) couvrent les coûts API.
**Cash immédiat :** AppSumo LTD à 59€ × 500 = **29 500€** 💰

---

## ✅ Checklist Pré-Launch

- [ ] Acheter airank.fr sur OVH
- [ ] Créer compte Stripe + configurer les plans
- [ ] Obtenir API keys (OpenAI, Anthropic, Perplexity, Google AI)
- [ ] Setup projet Next.js + deploy Coolify
- [ ] Configurer DNS OVH → Coolify
- [ ] Créer compte Resend + vérifier domaine
- [ ] Landing page live
- [ ] Scanner fonctionnel
- [ ] Dashboard complet
- [ ] Stripe checkout fonctionnel
- [ ] Tests complets
- [ ] Soumettre AppSumo
- [ ] Préparer post LinkedIn + Product Hunt

---

*Specs rédigées par Maurice 🎩 — 21/03/2026*
*Prêt à coder. Dis le mot.*
