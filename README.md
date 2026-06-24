# GooAnalytics — Multi-Channel Analytics SaaS

A standalone analytics platform extracted from the Terence project, now independent and ready for scaling.

## Structure

```
GooAnalytics/
├── analytics/                    # Core analytics module
│   ├── analytics-saas/          # Next.js 16 SaaS application (nested git repo)
│   ├── .claude/                 # Claude Code skills & configurations
│   ├── CLAUDE.md                # Project guidelines for Claude Code
│   ├── RESEARCH.md              # Architecture & planning docs
│   ├── ga4-key.json             # Google Analytics service account (private)
│   └── *.html                   # Generated reports
└── README.md                     # This file
```

## Quick Start

### Prerequisites
- Node.js 20+
- pnpm 9+
- Docker & Docker Compose (for PostgreSQL + Redis)

### Setup

```bash
cd analytics/analytics-saas

# Install dependencies
pnpm install

# Start database + cache
docker compose up -d

# Setup environment
cp .env.example .env.local
# Fill in: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, AUTH_SECRET, etc.

# Run database migrations
pnpm drizzle-kit migrate

# Start dev environment
pnpm dev                    # Terminal 1: Next.js dev server
pnpm workers                # Terminal 2: Background workers
pnpm mcp                    # Terminal 3 (optional): MCP server for Claude
```

## Development

```bash
# Linting & formatting
pnpm biome check --write

# Testing
pnpm test                   # Unit tests
pnpm test:watch            # Watch mode
pnpm test:e2e              # E2E tests (requires pnpm dev running)

# Building
pnpm build                  # Production build
pnpm start                  # Start production server

# Database
pnpm drizzle-kit generate   # Generate migration from schema changes
pnpm drizzle-kit studio     # Open Drizzle Studio (GUI browser)
```

## Architecture

**See `/analytics/RESEARCH.md` for complete architecture documentation.**

### Tech Stack
- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript
- **Database:** PostgreSQL + Drizzle ORM
- **Cache & Jobs:** Redis + BullMQ
- **Auth:** Google OAuth + session cookies
- **Payments:** Stripe (checkout, webhooks, portal)
- **Messaging:** Email (Resend), WhatsApp (Cloud API), SMS (Twilio)
- **AI Integration:** Claude (brief generation) + MCP tools
- **Linting:** Biome (replaces ESLint + Prettier)
- **Testing:** Vitest (unit) + Playwright (E2E)
- **Deployment:** Railway (persistent Redis + long-running workers)

### Key Features

✅ **Team Management**
- User signup/login via Google OAuth
- Invite team members with role-based access (viewer/editor/admin)
- Resend/cancel invitations with expiry tracking
- Full audit log of team actions

✅ **Report Generation**
- Connect GA4, Google Search Console, Google Business Profile
- Automated report generation on schedule (monthly/weekly/daily)
- Claude AI brief generation (plain English summaries)

✅ **Multi-Channel Delivery**
- Email (Resend)
- WhatsApp (Cloud API)
- SMS (Twilio)
- Slack (formatters)
- JSON API
- Claude MCP tools
- ChatGPT Actions

✅ **Subscription Management**
- Stripe Checkout integration
- Customer Portal for billing management
- Webhook-based subscription lifecycle handling

✅ **Role-Based Access Control**
- Owners can manage teams and configurations
- Editors can modify report configs and generate reports
- Admins can manage team membership
- Viewers can only read reports

✅ **Operational Foundations**
- Database migrations via Drizzle
- Background job processing (BullMQ) with idempotent Stripe webhook handling
- Unit tests (Vitest) for permissions, services, formatters, and session signing; route + E2E coverage is partial
- TypeScript strict typecheck passes; Biome lint is clean for core `lib/` and API code (some UI accessibility lint items remain)
- Structured logging via `lib/logger.ts` (no stray `console` calls in app code)
- Per-workspace rate limiting on report generation/delivery
- Audit logging for all team actions

## File Guide

| File | Purpose |
|------|---------|
| `analytics/CLAUDE.md` | Guidelines for Claude Code when working in this project |
| `analytics/RESEARCH.md` | Complete architecture, design decisions, deployment strategy |
| `analytics/analytics-saas/` | Next.js application (see CLAUDE.md inside) |
| `analytics/.claude/skills/` | GA4 stats-pulling skill for report generation |
| `analytics/ga4-key.json` | Google Analytics service account (private, do not commit) |

## Phases Completed

✅ **Phase 1-8:** Feature-complete analytics SaaS
- Next.js scaffold + config/tooling
- Database schema + migrations
- Google OAuth authentication
- GA4/GSC/GBP data clients
- Claude brief generation
- Background workers
- Dashboard UI + session auth
- Landing page + property config CRUD
- Stripe billing + webhooks
- MCP server + test infrastructure

✅ **Phase 9:** Role-Based Access Control
- Permission helpers (canEditConfig, canDeleteConfig, etc)
- Config route authorization fixes
- Invite logic validation
- Full RBAC implementation

✅ **Phase 10:** Team Management Complete
- Invitation lifecycle (resend, cancel, cleanup)
- Audit logging system
- Audit viewer UI with pagination
- Role management (change member roles)

## Deployment

**Not for Vercel.** Deploy to Railway:

```bash
# Build
pnpm build

# Railway deployment (standalone mode + workers)
# See RESEARCH.md for detailed Railway setup
```

## Support

For issues or questions, see `analytics/CLAUDE.md` for project conventions and guidelines.

## License

Proprietary — Terence London Salon
