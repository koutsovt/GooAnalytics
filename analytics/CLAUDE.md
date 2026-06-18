# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current State

**Status:** Greenfield SaaS in planning phase. Currently only the **GA4 stats-pulling Python skill** exists (`.claude/skills/terence-london-stats/`). The full Next.js + TypeScript + PostgreSQL + Redis stack is documented in `RESEARCH.md` and will be built as phase two.

**What exists now:**
- `ga4-key.json` — Google Analytics service account (private, do not commit)
- `.claude/skills/terence-london-stats/scripts/fetch_ga4_stats.py` — Python script that pulls data from GA4 API
- `.claude/skills/terence-london-stats/assets/monthly-brief-template.html` — HTML template for generating reports
- Generated reports: `deep-dive-june-2026.html`, `monthly-brief-june-2026.html`

## GA4 Stats Skill (Current)

### Setup
The skill requires Google Analytics service account credentials. Before running:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/ga4-key.json
pip install google-analytics-data --break-system-packages
```

### Running the Skill
```bash
python .claude/skills/terence-london-stats/scripts/fetch_ga4_stats.py \
  --property 537938382 \
  --start 2026-05-04 \
  --end 2026-06-02
```

With a prior period for month-on-month comparison:
```bash
python .claude/skills/terence-london-stats/scripts/fetch_ga4_stats.py \
  --property 537938382 \
  --start 2026-05-04 \
  --end 2026-06-02 \
  --compare-start 2026-04-04 \
  --compare-end 2026-05-03
```

The script outputs JSON with blocks: `overview`, `events`, `conversions`, `sources`, `daily`, `device` (plus `*_compare` equivalents if comparison requested). See `.claude/skills/terence-london-stats/SKILL.md` for metric details and template editing instructions.

## Planned Architecture (Phase 2+)

Full reference in `RESEARCH.md`. Key points:

### Tech Stack
- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript 6
- **Database:** PostgreSQL + Drizzle ORM (typesafe queries, migrations via drizzle-kit)
- **Job Queue:** Redis + BullMQ (background report generation + delivery)
- **Auth:** Better Auth (Google OAuth + session management)
- **Billing:** Stripe
- **Messaging:** Twilio (SMS), WhatsApp Cloud API, Resend (email), web-push (PWA notifications)
- **Linting:** Biome (replaces ESLint + Prettier)
- **Testing:** Vitest + Playwright
- **Deployment:** Railway (not Vercel — requires persistent Redis + long-running workers)

### Architecture Patterns

**Service Layer, Not Repository:**
API routes and workers import from `lib/services/`. Services call Drizzle directly — no repository abstraction. The ORM is the data-access layer.

**Channel Formatter:**
Same report data, different output per channel (WhatsApp, email, Slack, JSON for API/MCP). Each formatter implements `ChannelFormatter` interface.

**Queue Handoff → Worker Processing:**
1. API routes enqueue jobs (e.g., `reportQueue.add()`)
2. Workers process them (`new Worker('reports', processor)`)
3. Shared queue definitions in `lib/queue/`
4. Workers run as a separate Node.js process via `tsx workers/index.ts`

**Webhook → Enqueue → Process (Async):**
All webhooks (Stripe, WhatsApp) validate signature, enqueue to BullMQ, return 200 immediately. Processing happens async in workers.

**Multi-Channel Delivery:**
MCP tools, GPT Actions, and Slack consume the same `lib/services/` functions. MCP and GPT Action specs both built from service layer (no duplicate logic).

### Project Structure
```
analytics-saas/
├── app/
│   ├── (marketing)/      # Landing, pricing
│   ├── (auth)/           # Login, register
│   ├── (dashboard)/      # Dashboard, reports, settings
│   ├── api/              # API routes + webhooks
│   └── manifest.ts, globals.css, layout.tsx
│
├── lib/
│   ├── db/               # Drizzle schema + client
│   ├── services/         # Business logic (analytics, reports, subscriptions, delivery)
│   ├── clients/          # GA4, Stripe, WhatsApp, Resend wrappers
│   ├── queue/            # BullMQ queue definitions
│   ├── formatters/       # Channel-specific formatters (WhatsApp, email, Slack, JSON)
│   ├── auth/             # Better Auth config
│   └── env.ts            # @t3-oss/env-nextjs validation
│
├── workers/              # Background job processing (report generation, delivery)
├── mcp/                  # MCP server + tools
├── gpt-action/           # ChatGPT OpenAPI 3.1 spec
├── components/           # UI components (shadcn/ui + dashboard-specific)
├── drizzle/              # Generated migrations
└── docker-compose.yml    # Local PostgreSQL + Redis
```

## Development Commands (Will Be Added)

Once the Next.js project is created:

```bash
# Install dependencies
pnpm install

# Development
pnpm dev                 # Run Next.js dev server (port 3000)
pnpm tsx workers/index.ts # Run background workers (separate terminal)

# Linting & formatting
pnpm biome check --apply  # Lint + format
pnpm biome check         # Check only (no fix)

# Database
pnpm drizzle-kit generate # Generate migration
pnpm drizzle-kit migrate   # Run pending migrations
pnpm drizzle-kit studio   # Open Drizzle Studio (GUI browser)

# Testing
pnpm vitest              # Run unit + integration tests
pnpm vitest --ui         # Open test UI
pnpm playwright test     # Run E2E tests

# Local infrastructure
docker compose up -d     # Start PostgreSQL + Redis
docker compose down      # Stop services
```

## Key Files & Their Purpose

| File | Purpose |
|------|---------|
| `RESEARCH.md` | Complete blueprint — architecture decisions, dependencies, setup steps, deployment strategy |
| `.claude/skills/terence-london-stats/SKILL.md` | GA4 script documentation — auth, metrics, template editing |
| `.claude/skills/terence-london-stats/scripts/fetch_ga4_stats.py` | Python script to pull GA4 data and output JSON |
| `ga4-key.json` | Google Analytics service account key (private) |

## Important Context

**GA4 Property:** 537938382 (Terence London salon website, terencelondon.com)

**Booking Metrics:** The `click_book` event is the headline metric — represents intent to book. Raw event count will be higher (people click multiple times comparing slots) but always report **unique users % (e.g., 37/104 = 36%)** not raw clicks.

**Parent Project:** `/Users/taskoutsovasilis/Documents/Portal/Terence/` is the Terence London salon website (Next.js, React 19, Tailwind v4). The analytics directory is a separate greenfield SaaS build, not a component of the salon website.

**Deployment:** Not Vercel. Next.js runs in `standalone` output mode on Railway, which supports persistent Redis + long-running workers that BullMQ requires.

## When Starting Phase 2 (Full Next.js Build)

1. Follow the INSTALL section in `RESEARCH.md` exactly — creates the project structure
2. Use the CONFIG FILES section to bootstrap config files
3. Copy the PROJECT STRUCTURE as your guide
4. Implement service layer first (`lib/services/`), then API routes, then UI
5. Use Biome for linting (it's already configured in `RESEARCH.md`)
6. Keep `docker-compose.yml` running locally (PostgreSQL + Redis required for development)
7. Background workers (`workers/index.ts`) must run in a separate terminal during dev
