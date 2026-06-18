# RESEARCH: Multi-Channel Analytics SaaS for Non-Technical Business Owners
Generated: 4 June 2026
Stack: Next.js 16 (App Router) + TypeScript 6 + PostgreSQL + Redis

## Overview
A SaaS product that connects to a business's Google Analytics (GA4) and delivers plain-English website traffic reports via Website/PWA, WhatsApp, Email, SMS, ChatGPT (GPT Actions), Claude (MCP Server), and Slack. One API, many front doors.

## Current State
The `analytics/` directory contains:
- `ga4-key.json` — Google Cloud service account for GA4 property 537938382
- `deep-dive-june-2026.html` — Generated deep-dive report (24.7K)
- `monthly-brief-june-2026.html` — Generated monthly brief (14.5K)
- `.claude/skills/terence-london-stats/` — Python script + HTML template for report generation

Parent `Terence/` is a Next.js 16 + React 19 + Tailwind v4 salon website. No project infrastructure exists in `analytics/` — this is a greenfield build.

---

## INSTALL
```bash
# Install pnpm if not present
corepack enable && corepack prepare pnpm@latest --activate

# Create project
pnpm create next-app@latest analytics-saas --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --turbopack

cd analytics-saas

# Core dependencies
pnpm add drizzle-orm@0.45.2 pg@8.16.0 ioredis@5.10.1 bullmq@5.78.0 \
  better-auth@1.6.13 stripe@22.2.0 zod@4.4.3 \
  @google-analytics/data@6.0.0 resend@6.12.4 \
  @great-detail/whatsapp@8.4.0 twilio@6.0.2 \
  web-push@3.6.7 recharts@3.8.1 date-fns@4.4.0 @date-fns/tz@1.5.0 \
  @t3-oss/env-nextjs@0.13.11 @modelcontextprotocol/sdk@latest

# Dev dependencies
pnpm add -D drizzle-kit@0.45.2 @biomejs/biome@2.4.15 \
  vitest@4.1.8 @playwright/test@1.60.0 \
  husky@9.1.7 lint-staged@17.0.7 tsx@4.19.4 \
  @types/pg@8.15.4 @types/web-push@3.6.4

# Init Biome
pnpm biome init

# Init shadcn/ui
pnpm dlx shadcn@latest init

# Init Husky
pnpm exec husky init

# Init Playwright
pnpm exec playwright install
```

---

## DEPENDENCIES
| Package | Version | Purpose |
|---------|---------|---------|
| `next` | `16.2.7` | React framework + API routes |
| `react` | `19.1.0` | UI library |
| `react-dom` | `19.1.0` | React DOM renderer |
| `drizzle-orm` | `0.45.2` | Typesafe SQL query builder |
| `pg` | `8.16.0` | PostgreSQL driver |
| `ioredis` | `5.10.1` | Redis client (BullMQ peer) |
| `bullmq` | `5.78.0` | Redis-based background jobs |
| `better-auth` | `1.6.13` | OAuth + session management |
| `stripe` | `22.2.0` | Subscription billing |
| `zod` | `4.4.3` | Schema validation + inference |
| `@google-analytics/data` | `6.0.0` | GA4 Data API client |
| `resend` | `6.12.4` | Transactional email sending |
| `@great-detail/whatsapp` | `8.4.0` | WhatsApp Cloud API SDK |
| `twilio` | `6.0.2` | SMS sending |
| `web-push` | `3.6.7` | VAPID web push notifications |
| `recharts` | `3.8.1` | React chart components |
| `date-fns` | `4.4.0` | Date manipulation |
| `@date-fns/tz` | `1.5.0` | Timezone-aware dates |
| `@t3-oss/env-nextjs` | `0.13.11` | Type-safe env validation |
| `@modelcontextprotocol/sdk` | `latest` | MCP server for Claude |
| `tailwindcss` | `4.3.0` | Utility-first CSS |

## DEV DEPENDENCIES
| Package | Version | Purpose |
|---------|---------|---------|
| `drizzle-kit` | `0.45.2` | DB migrations + studio |
| `@biomejs/biome` | `2.4.15` | Linter + formatter (replaces ESLint+Prettier) |
| `vitest` | `4.1.8` | Unit + integration tests |
| `@playwright/test` | `1.60.0` | E2E browser testing |
| `husky` | `9.1.7` | Git hooks management |
| `lint-staged` | `17.0.7` | Run tasks on staged files |
| `tsx` | `4.19.4` | Run TypeScript (workers, scripts) |
| `@types/pg` | `8.15.4` | PostgreSQL type defs |
| `@types/web-push` | `3.6.4` | Web Push type defs |
| `typescript` | `6.0.3` | Type checking |

---

## CONFIG FILES TO CREATE

### `next.config.ts`
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  output: "standalone", // Required for Railway/Docker deployment

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ];
  },
};

export default nextConfig;
```

### `tsconfig.json`
```json
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", ".next/types/**/*.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

### `biome.json`
```json
{
  "$schema": "https://biomejs.dev/schemas/2.0.0/schema.json",
  "organizeImports": { "enabled": true },
  "linter": {
    "enabled": true,
    "rules": { "recommended": true }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "double",
      "semicolons": "always",
      "trailingCommas": "all"
    }
  },
  "files": {
    "ignore": [".next", "drizzle", "node_modules", "*.gen.ts"]
  }
}
```

### `app/globals.css` (Tailwind v4 — CSS-first config)
```css
@import "tailwindcss";

@theme {
  --color-brand: oklch(62% 0.19 264);
  --color-brand-light: oklch(75% 0.15 264);
  --color-brand-dark: oklch(45% 0.22 264);
  --color-surface: oklch(98% 0.005 264);
  --color-success: oklch(72% 0.19 155);
  --color-warning: oklch(80% 0.18 85);
  --color-danger: oklch(63% 0.24 29);
  --color-chart-1: oklch(62% 0.19 264);
  --color-chart-2: oklch(72% 0.19 155);
  --color-chart-3: oklch(80% 0.18 85);
  --color-chart-4: oklch(63% 0.24 29);
  --color-chart-5: oklch(70% 0.15 330);
  --font-sans: "Inter", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
}
```

### `drizzle.config.ts`
```typescript
import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "./lib/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  strict: true,
  verbose: true,
});
```

### `docker-compose.yml`
```yaml
services:
  postgres:
    image: postgres:17-alpine
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: analytics_saas
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
```

### `.env.example`
```bash
# ─── App ───────────────────────────────────────────
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ─── Database (PostgreSQL) ─────────────────────────
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/analytics_saas

# ─── Redis ─────────────────────────────────────────
REDIS_URL=redis://localhost:6379

# ─── Auth (Google OAuth) ──────────────────────────
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
AUTH_SECRET=  # openssl rand -base64 32

# ─── Google Analytics (GA4) ────────────────────────
GA4_PROPERTY_ID=
GOOGLE_ANALYTICS_CREDENTIALS_JSON=  # base64-encoded service account JSON

# ─── Stripe ────────────────────────────────────────
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# ─── WhatsApp Business API ─────────────────────────
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_BUSINESS_ACCOUNT_ID=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_VERIFY_TOKEN=

# ─── Twilio (SMS) ─────────────────────────────────
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# ─── Resend (Email) ───────────────────────────────
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@yourdomain.com

# ─── Web Push (VAPID) ─────────────────────────────
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
# Generate: npx web-push generate-vapid-keys
```

---

## PROJECT STRUCTURE
```
analytics-saas/
├── app/
│   ├── (marketing)/              # Public pages (landing, pricing)
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Landing page
│   │   └── pricing/page.tsx
│   │
│   ├── (auth)/                   # Auth flow
│   │   ├── layout.tsx
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   │
│   ├── (dashboard)/              # Authenticated app
│   │   ├── layout.tsx            # Sidebar + auth guard
│   │   ├── page.tsx              # Dashboard overview
│   │   ├── reports/
│   │   │   ├── page.tsx
│   │   │   └── [reportId]/page.tsx
│   │   ├── properties/
│   │   │   └── page.tsx
│   │   └── settings/
│   │       ├── page.tsx
│   │       └── billing/page.tsx
│   │
│   ├── api/
│   │   ├── webhooks/
│   │   │   ├── stripe/route.ts
│   │   │   └── whatsapp/route.ts
│   │   ├── reports/
│   │   │   ├── route.ts
│   │   │   └── [reportId]/route.ts
│   │   ├── analytics/
│   │   │   └── query/route.ts
│   │   └── cron/
│   │       └── daily-reports/route.ts
│   │
│   ├── manifest.ts               # PWA manifest
│   ├── layout.tsx                # Root layout
│   ├── globals.css               # Tailwind v4 theme
│   └── not-found.tsx
│
├── components/
│   ├── ui/                       # shadcn/ui components
│   ├── dashboard/                # Dashboard-specific components
│   ├── onboarding/               # Guided setup flow
│   └── charts/                   # Recharts wrappers
│
├── lib/
│   ├── db/
│   │   ├── index.ts              # Drizzle client export
│   │   └── schema.ts             # All table definitions
│   │
│   ├── services/
│   │   ├── analytics.service.ts  # GA4 query + aggregation
│   │   ├── report.service.ts     # Report CRUD + generation
│   │   ├── property.service.ts   # GA4 property management
│   │   ├── subscription.service.ts
│   │   └── delivery.service.ts   # Dispatch to channels
│   │
│   ├── clients/
│   │   ├── ga4.client.ts         # BetaAnalyticsDataClient wrapper
│   │   ├── stripe.ts             # Stripe SDK init
│   │   ├── whatsapp.client.ts    # WhatsApp Cloud API
│   │   └── resend.ts             # Email client
│   │
│   ├── queue/
│   │   ├── connection.ts         # Shared IORedis instance
│   │   ├── queues.ts             # Queue definitions
│   │   └── types.ts              # Job payload interfaces
│   │
│   ├── formatters/
│   │   ├── types.ts              # ChannelFormatter interface
│   │   ├── whatsapp.formatter.ts
│   │   ├── email.formatter.ts
│   │   ├── slack.formatter.ts
│   │   └── json.formatter.ts     # For API/MCP/GPT Action
│   │
│   ├── auth/
│   │   └── index.ts              # Better Auth config
│   │
│   ├── env.ts                    # @t3-oss/env-nextjs validation
│   └── utils.ts                  # cn() helper
│
├── workers/
│   ├── index.ts                  # Worker entrypoint (tsx workers/index.ts)
│   ├── report.worker.ts          # GA4 fetch → generate → store
│   └── delivery.worker.ts        # Format → send per channel
│
├── mcp/
│   ├── index.ts                  # MCP server entrypoint
│   └── tools/
│       ├── query-analytics.ts
│       ├── list-reports.ts
│       └── get-report.ts
│
├── gpt-action/
│   └── openapi.yaml              # OpenAPI 3.1 spec for ChatGPT
│
├── drizzle/                      # Generated migrations
│
├── biome.json
├── docker-compose.yml
├── drizzle.config.ts
├── next.config.ts
├── tsconfig.json
├── package.json
├── .env.example
└── .env.local
```

---

## SETUP STEPS
1. `pnpm create next-app@latest analytics-saas` with TypeScript + Tailwind + App Router
2. Install all dependencies (see INSTALL section)
3. Copy `.env.example` → `.env.local`, fill in values
4. `docker compose up -d` — start PostgreSQL + Redis
5. Define schema in `lib/db/schema.ts`
6. `pnpm drizzle-kit generate` then `pnpm drizzle-kit migrate`
7. `pnpm dev` — start Next.js dev server
8. `pnpm tsx workers/index.ts` — start background workers (separate terminal)

---

## KEY PATTERNS

### Service Layer (not Repository)
API routes and workers import from `lib/services/`. Services call `db` (Drizzle) directly — no repository abstraction. The ORM is the data-access layer.

### Channel Formatter
Same report data, different output per channel. Each formatter implements `ChannelFormatter` interface. `delivery.service.ts` maps channel → formatter → client.

### Queue Handoff
API routes enqueue jobs (`reportQueue.add()`). Workers process them (`new Worker('reports', processor)`). Shared queue definitions in `lib/queue/`. Workers run as a separate Node.js process via `tsx workers/index.ts`.

### Webhook → Enqueue → Process
All webhooks (Stripe, WhatsApp) validate signature, enqueue to BullMQ, return 200 immediately. Processing happens async in workers.

### MCP + GPT Action → Same API
MCP tools and GPT Actions consume the same `lib/services/` functions. MCP runs as a separate stdio process. GPT Actions hit `/api/` routes via OpenAPI spec.

### Deploy: Railway (not Vercel)
Next.js in `standalone` output mode. BullMQ requires persistent Redis + long-running workers — incompatible with Vercel serverless. Railway runs: Next.js web service + worker process + managed PostgreSQL + managed Redis.

---

## FRAMEWORK DECISION
**Winner: Next.js 16 (App Router) on Railway**

| Evaluated | Verdict |
|-----------|---------|
| Next.js 16 | ✅ Winner — PWA native, Auth.js/Better Auth ecosystem, largest community |
| Remix | ❌ Eliminated — v3 unreleased, abandoned React for Preact fork |
| Hono + React SPA | ❌ Rejected — split architecture adds CORS + deployment complexity for no gain at this scale |

## TOOLING DECISION
**Biome over ESLint + Prettier** — Next.js 16 removed `next lint`, now recommends Biome directly. One tool replaces two. 97% Prettier-compatible, 450+ lint rules, Rust-fast.

---

## SOURCES
- npm registry (all package versions verified)
- Next.js 16 docs: https://nextjs.org/docs
- Better Auth docs: https://www.better-auth.com
- Drizzle ORM docs: https://orm.drizzle.team
- Tailwind CSS v4: https://tailwindcss.com/docs
- BullMQ docs: https://docs.bullmq.io
- Biome docs: https://biomejs.dev
- Railway docs: https://docs.railway.com
- Stripe Node.js SDK: https://github.com/stripe/stripe-node
- WhatsApp Cloud API: https://developers.facebook.com/docs/whatsapp/cloud-api
- MCP SDK: https://github.com/modelcontextprotocol/typescript-sdk
- Real project structures: nextjs/saas-starter (16k★), norish-recipes/norish (1.1k★), formzillion (78★)
```
