# Web Advisor — Project Plan

**Location:** `/Users/taskoutsovasilis/Documents/Portal/web-advisor/`
**Problem:** Non-technical business owners need to know: *What's wrong with my website? Am I getting enough traffic? What can I do to improve?*
**Product:** An AI-powered web advisor that connects to GA4, diagnoses website health, and delivers plain-English recommendations via any channel (web, WhatsApp, email, ChatGPT, Claude).

---

## Phase 1 — Foundation (Project scaffolding + core infrastructure)

**Goal:** Bootable Next.js app with DB, Redis, auth, and the GA4 data pipeline working end-to-end.

### What gets built
- Next.js 16 project in `/Portal/web-advisor/`
- All config files (next.config.ts, tsconfig.json, biome.json, drizzle.config.ts, docker-compose.yml, .env.example)
- Database schema: `users`, `properties`, `reports`, `subscriptions`, `delivery_preferences`
- Better Auth setup with Google OAuth (same Google login also grants GA4 read access)
- GA4 client (`lib/clients/ga4.client.ts`) — port the existing Python `fetch_ga4_stats.py` to TypeScript using `@google-analytics/data`
- Redis connection + BullMQ queue definitions
- Type-safe env validation with `@t3-oss/env-nextjs`

### Database schema

```
users
├── id (uuid, pk)
├── name
├── email
├── google_access_token (encrypted)
├── google_refresh_token (encrypted)
├── timezone
├── created_at
└── updated_at

properties
├── id (uuid, pk)
├── user_id (fk → users)
├── ga4_property_id (e.g. "537938382")
├── website_url
├── website_name
├── connected_at
└── status (active | disconnected)

reports
├── id (uuid, pk)
├── property_id (fk → properties)
├── type (snapshot | deep-dive | weekly | monthly)
├── period_start
├── period_end
├── raw_data (jsonb — cached GA4 response)
├── diagnosis (jsonb — parsed insights + recommendations)
├── html_content (text — rendered report)
├── created_at
└── status (generating | ready | failed)

subscriptions
├── id (uuid, pk)
├── user_id (fk → users)
├── stripe_customer_id
├── stripe_subscription_id
├── plan (free | growth | pro)
├── status (active | cancelled | past_due)
├── current_period_end
└── created_at

delivery_preferences
├── id (uuid, pk)
├── user_id (fk → users)
├── channel (email | whatsapp | sms | slack)
├── config (jsonb — phone number, slack webhook, etc.)
├── frequency (daily | weekly | monthly)
├── enabled (boolean)
└── created_at
```

---

## Phase 2 — The Advisor Brain (Diagnosis + Recommendations Engine)

**Goal:** Transform raw GA4 data into plain-English diagnosis and actionable recommendations.

### What gets built
- `lib/services/analytics.service.ts` — fetches + caches GA4 data via Redis (TTL: 4 hours)
- `lib/services/diagnosis.service.ts` — the core "brain":
  - **Health score** (0-100): weighted composite of traffic trend, bounce rate, engagement rate, mobile usability, 404 errors
  - **Issue detection**: high bounce pages, traffic drops, missing mobile optimization, broken pages (404s), single-source dependency
  - **Recommendations**: prioritized, plain-English, actionable (e.g. *"Your About page is broken — 11 people tried to visit it this month and got an error. Here's how to fix it."*)
  - **Benchmarking**: compare current vs previous period, flag significant changes
- `lib/services/report.service.ts` — orchestrates: fetch → diagnose → generate HTML → store
- Report templates adapted from the existing `monthly-brief-template.html` and `deep-dive-june-2026.html`

### Diagnosis rules (initial set)
| Rule | Trigger | Severity |
|------|---------|----------|
| Traffic drop | >20% decrease vs prior period | 🔴 High |
| High bounce rate | >70% on any top page | 🟡 Medium |
| 404 errors | Any pageviews hitting non-existent URLs | 🔴 High |
| Single source dependency | >60% traffic from one source | 🟡 Medium |
| Low engagement | Avg session <30 seconds | 🔴 High |
| Mobile issues | Mobile bounce >20% higher than desktop | 🟡 Medium |
| No social traffic | 0 sessions from social channels | 🟢 Low |
| Weekend dead zone | <10% of traffic on weekends (for applicable businesses) | 🟢 Low |

---

## Phase 3 — Onboarding Flow (Guided 3-Step Setup)

**Goal:** Non-technical business owner goes from zero to first report in under 3 minutes.

### What gets built
- `app/(auth)/register/page.tsx` — email + Google sign-in
- `app/(auth)/login/page.tsx`
- `components/onboarding/` — 3-step guided flow:
  1. **Your Business** — name, website URL (auto-validated)
  2. **Connect Analytics** — single "Connect Google Analytics" button → OAuth popup → auto-detect GA4 property matching their website URL
  3. **Your Preferences** — plain-English checkboxes (*"How many people visit?"*, *"Where do they come from?"*, etc.) + report frequency + delivery channel
- `app/api/auth/[...all]/route.ts` — Better Auth API routes
- `lib/services/property.service.ts` — auto-match GA4 properties to website URL after OAuth

### Key UX decisions
- **No GA4 Property ID input** — auto-detected via OAuth `listAccountSummaries()`
- **No jargon anywhere** — "visitors" not "sessions", "people finding you" not "traffic sources"
- **Instant first report** — after connecting, immediately generate a snapshot: *"Here's what we found..."*
- **No GA4? Help them set it up** — detect missing GA4, offer guided setup or manual installation snippet

---

## Phase 4 — Dashboard (Website + PWA)

**Goal:** Clean, simple dashboard that answers the three core questions at a glance.

### What gets built
- `app/(dashboard)/layout.tsx` — minimal sidebar (Overview, Reports, Settings)
- `app/(dashboard)/page.tsx` — overview:
  - Health score badge (0-100 with color)
  - *"What's wrong?"* — top 3 issues, severity-coded
  - *"Your traffic"* — sparkline + trend arrow + plain-English summary
  - *"What to do"* — top 3 prioritized recommendations
- `app/(dashboard)/reports/page.tsx` — report history list
- `app/(dashboard)/reports/[reportId]/page.tsx` — full report view (adapted from existing HTML templates)
- `app/(dashboard)/settings/page.tsx` — delivery preferences, connected properties
- `app/(dashboard)/settings/billing/page.tsx` — Stripe customer portal link
- `components/dashboard/` — HealthScore, IssueCard, RecommendationCard, TrafficChart, SourcesBar
- `components/charts/` — Recharts wrappers for sparkline, area chart, donut
- `app/manifest.ts` — PWA manifest for mobile "Add to Home Screen"
- Service worker for offline access to last-viewed report

### Mobile-first design
The dashboard is designed phone-first. The overview page is the "open the app, glance, done" experience:
```
┌─────────────────────────┐
│  Web Advisor             │
│                          │
│  Health Score: 72/100 🟡 │
│                          │
│  ⚠️ 3 issues found       │
│  🔴 About page is broken │
│  🟡 Bounce rate is high  │
│  🟡 Only 1 traffic source│
│                          │
│  📈 847 visitors this wk │
│     ▲ 14% vs last week   │
│                          │
│  💡 Top recommendation    │
│  Fix your About page —   │
│  11 people tried to visit│
│  it and got an error.    │
│                          │
│  [View Full Report →]    │
└─────────────────────────┘
```

---

## Phase 5 — Delivery Channels (Email + WhatsApp)

**Goal:** Reports arrive where the business owner already is.

### What gets built
- `workers/index.ts` — worker entrypoint
- `workers/report.worker.ts` — processes report generation jobs (GA4 fetch → diagnose → render)
- `workers/delivery.worker.ts` — processes delivery jobs (format → send per channel)
- `lib/formatters/types.ts` — `ChannelFormatter` interface
- `lib/formatters/email.formatter.ts` — HTML email with inline CSS (adapted from existing templates)
- `lib/formatters/whatsapp.formatter.ts` — plain text, chunked to 4096 chars, interactive reply buttons
- `lib/formatters/json.formatter.ts` — structured JSON for API/MCP/GPT consumers
- `lib/clients/resend.ts` — Resend email client
- `lib/clients/whatsapp.client.ts` — WhatsApp Cloud API client
- `app/api/webhooks/whatsapp/route.ts` — inbound WhatsApp message handler (reply "1" for full report, "2" for comparison, etc.)
- `app/api/cron/scheduled-reports/route.ts` — cron trigger for scheduled report generation
- `lib/services/delivery.service.ts` — dispatch formatted reports to all enabled channels

### WhatsApp interaction model
```
[Scheduled message arrives]
📊 Web Advisor — Weekly Update

Health Score: 72/100 🟡

👥 847 visitors (+14%)
🔴 About page still broken
💡 Fix it → terencelondon.com/about

Reply:
1 → Full report
2 → Compare to last month
3 → How do I fix this?
```

---

## Phase 6 — Payments (Stripe Integration)

**Goal:** Free → Growth → Pro upgrade path.

### What gets built
- `lib/clients/stripe.ts` — Stripe SDK init
- `lib/services/subscription.service.ts` — create checkout, manage subscriptions, enforce plan limits
- `app/api/webhooks/stripe/route.ts` — Stripe webhook handler (subscription.created, updated, deleted, invoice.paid, invoice.payment_failed)
- `app/(dashboard)/settings/billing/page.tsx` — current plan display + upgrade button + Stripe customer portal
- `app/(marketing)/pricing/page.tsx` — pricing page with 3 tiers
- Plan enforcement middleware — check user's plan before allowing features (channels, report frequency, history depth)

### Pricing tiers
| | Free | Growth (£29/mo) | Pro (£79/mo) |
|---|---|---|---|
| Websites | 1 | 3 | 10 |
| Reports | Monthly email | Weekly + monthly | Daily + weekly + monthly |
| Channels | Email only | + WhatsApp + PWA | + SMS + Slack + ChatGPT + Claude |
| History | 30 days | 6 months | 24 months |
| Insights | Basic health score | + Diagnosis + recommendations | + AI deep-dive analysis |

---

## Phase 7 — AI Connectors (ChatGPT + Claude)

**Goal:** Business owners can ask *"How's my website?"* inside ChatGPT or Claude.

### What gets built
- `app/api/v1/` — versioned public API routes (used by all AI connectors):
  - `GET /api/v1/health-score` — current health score + issues
  - `GET /api/v1/reports` — list reports
  - `GET /api/v1/reports/:id` — single report
  - `GET /api/v1/analytics/query` — ad-hoc query
  - `POST /api/v1/reports/generate` — trigger new report
- API key auth for external consumers (stored in `api_keys` table)
- `gpt-action/openapi.yaml` — OpenAPI 3.1 spec pointing at `/api/v1/` routes
- `mcp/index.ts` — MCP server entrypoint using `@modelcontextprotocol/sdk`
- `mcp/tools/query-analytics.ts` — query GA4 data
- `mcp/tools/get-health-score.ts` — get current diagnosis
- `mcp/tools/list-reports.ts` — list available reports
- `mcp/tools/get-report.ts` — get full report

---

## Phase 8 — Marketing Site

**Goal:** Landing page that explains Web Advisor to non-technical business owners.

### What gets built
- `app/(marketing)/layout.tsx` — navbar + footer, no auth required
- `app/(marketing)/page.tsx` — landing page:
  - Hero: *"Your website advisor. Plain English. No jargon."*
  - Problem statement: *"You have a website. But is it working for you?"*
  - 3 value props: What's wrong → Are you getting traffic → What to improve
  - How it works (3-step visual)
  - Pricing section
  - CTA: *"Connect your website — it takes 2 minutes"*
- `app/(marketing)/pricing/page.tsx` — full pricing comparison

---

## Phase 9 — Railway Deployment

**Goal:** Production deployment on Railway with all services running, custom domain, and CI/CD.

### Railway project topology
```
Railway Project: web-advisor
├── web (Next.js 16 standalone)     ← git-push deploy
│   └── Custom domain: webadvisor.app (or similar)
├── worker (BullMQ processor)       ← same repo, different start command
├── PostgreSQL                      ← managed by Railway
└── Redis                           ← managed by Railway
```

### What gets built / configured
- `Dockerfile` — multi-stage build for Next.js standalone output
- `Dockerfile.worker` — worker-specific image (same codebase, runs `tsx workers/index.ts`)
- `railway.toml` — Railway service config (build command, start command, healthcheck)
- `.github/workflows/deploy.yml` — CI pipeline: biome check → vitest → build → Railway auto-deploys on push to `main`
- Railway environment variables — all `.env.example` vars configured per service
- Railway cron service — triggers `/api/cron/scheduled-reports` on schedule
- Custom domain + SSL (automatic via Railway)
- Private networking — web ↔ worker ↔ PostgreSQL ↔ Redis communicate over Railway's internal network

### Estimated Railway costs (MVP phase)
| Service | Estimated cost |
|---------|---------------|
| Next.js web | ~$10/mo |
| BullMQ worker | ~$5-8/mo |
| PostgreSQL | ~$3-5/mo |
| Redis | ~$2-3/mo |
| Hobby plan fee | $5/mo |
| **Total** | **~$25-31/mo** |

### Migration path
When revenue exceeds ~$500/mo, evaluate moving to a Hetzner VPS (€8.50/mo) running the same Docker Compose stack. The app is fully containerized — migration is `docker compose up` on a different machine.

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| GA4 API quota limits | Rate limiting at scale | Cache aggressively in Redis (4hr TTL), batch requests |
| Business has no GA4 | Can't connect | Detect + offer guided GA4 setup instructions |
| WhatsApp Business API approval | Delayed messaging channel | Start with email, add WhatsApp when approved |
| Stripe integration complexity | Payment edge cases | Use Stripe customer portal for self-service |
| OAuth token expiry | Disconnected properties | Refresh tokens automatically, alert user if revoked |
| Railway costs scaling | Margin erosion at ~50+ users | Monitor usage, migrate to VPS when revenue justifies |
| Railway outages | Service downtime | Health checks, BullMQ retries (jobs survive Redis restarts) |

---

## Verification Criteria

- [ ] `pnpm build` passes with zero errors/warnings
- [ ] `pnpm biome check .` passes clean
- [ ] `pnpm vitest run` — all unit tests pass
- [ ] Docker compose starts PostgreSQL + Redis, migrations run
- [ ] Google OAuth flow completes → GA4 property auto-detected
- [ ] Report generates from GA4 data → stored in DB → viewable in dashboard
- [ ] Email delivery sends formatted report via Resend
- [ ] WhatsApp webhook receives and responds to messages
- [ ] Stripe checkout creates subscription → webhook updates DB
- [ ] PWA installs on mobile, shows cached last report offline
- [ ] MCP server responds to `query-analytics` tool call
- [ ] GPT Action spec validates and works in ChatGPT
- [ ] Railway deploy succeeds — web + worker + PostgreSQL + Redis all running
- [ ] Custom domain resolves with SSL
- [ ] Cron triggers scheduled report generation on Railway

---

## Steps

1. Scaffold Next.js 16 project in `/Users/taskoutsovasilis/Documents/Portal/web-advisor/` with pnpm, install all dependencies from RESEARCH.md, create all config files (next.config.ts, tsconfig.json, biome.json, drizzle.config.ts, docker-compose.yml, .env.example, postcss.config.mjs, app/globals.css)
2. Create type-safe environment validation in `lib/env.ts` using `@t3-oss/env-nextjs` with Zod schemas for all env vars (DATABASE_URL, REDIS_URL, GOOGLE_CLIENT_ID, STRIPE_SECRET_KEY, etc.)
3. Create database schema in `lib/db/schema.ts` with Drizzle ORM — tables: users, properties, reports, subscriptions, delivery_preferences, api_keys — and `lib/db/index.ts` for the Drizzle client export
4. Set up docker-compose, run `drizzle-kit generate` and `drizzle-kit migrate` to create initial migration, verify DB starts and schema applies
5. Set up Better Auth in `lib/auth/index.ts` with Google OAuth provider, Drizzle adapter, session management, and `app/api/auth/[...all]/route.ts` API route
6. Port `fetch_ga4_stats.py` to TypeScript as `lib/clients/ga4.client.ts` using `@google-analytics/data` — same 6 report blocks (overview, events, conversions, sources, daily, device) with comparison period support
7. Create Redis connection (`lib/queue/connection.ts`), BullMQ queue definitions (`lib/queue/queues.ts` — reportQueue, deliveryQueue), and job payload types (`lib/queue/types.ts`)
8. Build `lib/services/analytics.service.ts` — fetches GA4 data via ga4.client, caches in Redis with 4hr TTL, returns typed analytics data
9. Build `lib/services/diagnosis.service.ts` — the advisor brain: takes analytics data, produces health score (0-100), detects issues (traffic drop, high bounce, 404s, single source dependency, low engagement, mobile issues), generates prioritized plain-English recommendations
10. Build `lib/services/report.service.ts` — orchestrates: fetch analytics → run diagnosis → generate HTML report → store in DB
11. Build `lib/services/property.service.ts` — after OAuth, calls GA4 Admin API `listAccountSummaries()` to auto-detect properties matching the user's website URL
12. Create the 3-step onboarding flow: `app/(auth)/register/page.tsx`, `app/(auth)/login/page.tsx`, `app/(auth)/layout.tsx`, and `components/onboarding/` (StepBusiness, StepConnect, StepPreferences) with guided UI — no jargon, auto-detect GA4 property
13. Build the dashboard layout `app/(dashboard)/layout.tsx` (minimal sidebar) and overview page `app/(dashboard)/page.tsx` showing health score, top issues, traffic summary, and top recommendations
14. Build dashboard detail pages: `app/(dashboard)/reports/page.tsx` (report list), `app/(dashboard)/reports/[reportId]/page.tsx` (full report), `app/(dashboard)/settings/page.tsx` (delivery prefs + properties), `app/(dashboard)/settings/billing/page.tsx`
15. Build dashboard components: `components/dashboard/HealthScore.tsx`, `components/dashboard/IssueCard.tsx`, `components/dashboard/RecommendationCard.tsx`, `components/dashboard/TrafficChart.tsx`, `components/dashboard/SourcesBar.tsx`, and `components/charts/` Recharts wrappers
16. Add PWA support: `app/manifest.ts` with MetadataRoute.Manifest, custom service worker for offline access to last-viewed report, "Add to Home Screen" prompt
17. Build channel formatters: `lib/formatters/types.ts` (ChannelFormatter interface), `lib/formatters/email.formatter.ts`, `lib/formatters/whatsapp.formatter.ts`, `lib/formatters/json.formatter.ts`, `lib/formatters/slack.formatter.ts`
18. Build external API clients: `lib/clients/resend.ts`, `lib/clients/whatsapp.client.ts`, `lib/clients/stripe.ts`
19. Build BullMQ workers: `workers/report.worker.ts` (GA4 fetch → diagnose → render → store), `workers/delivery.worker.ts` (format per channel → send), `workers/index.ts` (entrypoint)
20. Build `lib/services/delivery.service.ts` — dispatches formatted reports to enabled channels, and `app/api/cron/scheduled-reports/route.ts` for scheduled triggers
21. Build webhook routes: `app/api/webhooks/stripe/route.ts` (signature verify → handle subscription events), `app/api/webhooks/whatsapp/route.ts` (verify + parse inbound messages → enqueue response)
22. Build `lib/services/subscription.service.ts` and Stripe integration: create checkout sessions, handle webhook events (subscription.created/updated/deleted, invoice.paid/failed), enforce plan limits via middleware
23. Build versioned public API: `app/api/v1/health-score/route.ts`, `app/api/v1/reports/route.ts`, `app/api/v1/reports/[reportId]/route.ts`, `app/api/v1/analytics/query/route.ts` — with API key auth
24. Build MCP server: `mcp/index.ts` (McpServer + StdioServerTransport), `mcp/tools/query-analytics.ts`, `mcp/tools/get-health-score.ts`, `mcp/tools/list-reports.ts`, `mcp/tools/get-report.ts` — all importing from `lib/services/`
25. Create GPT Action OpenAPI spec: `gpt-action/openapi.yaml` pointing at `/api/v1/` routes with bearer auth
26. Build marketing site: `app/(marketing)/layout.tsx`, `app/(marketing)/page.tsx` (landing page with hero, value props, how-it-works, pricing CTA), `app/(marketing)/pricing/page.tsx` (tier comparison)
27. Write unit tests with Vitest for diagnosis.service (health score calculation, issue detection rules), report.service (generation flow), formatters (output per channel), and subscription.service (plan enforcement)
28. Write E2E tests with Playwright for: onboarding flow (register → connect → first report), dashboard navigation, settings page, billing upgrade flow
29. Create `Dockerfile` (multi-stage: deps → build → standalone runner) and `Dockerfile.worker` (same base, runs `tsx workers/index.ts`), plus `railway.toml` with service config, healthcheck path, and build settings
30. Set up Railway project: create services (web, worker), provision managed PostgreSQL + Redis, configure environment variables, set up private networking between services
31. Configure Railway cron service to trigger `/api/cron/scheduled-reports` on schedule (daily for Pro, weekly for Growth, monthly for Free)
32. Set up CI/CD: `.github/workflows/deploy.yml` — on push to `main`: run `biome check`, run `vitest`, build succeeds → Railway auto-deploys via GitHub integration
33. Configure custom domain + verify SSL, set up Stripe webhook endpoint URL to production domain, configure WhatsApp webhook URL
34. Final verification: `pnpm build` zero errors, `pnpm biome check .` clean, all tests pass, docker-compose up works locally, Railway deployment healthy, full flow from register → connect GA4 → view report → receive email on production URL
