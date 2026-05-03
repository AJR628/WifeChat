# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Artifacts

### `artifacts/wife-chat` — Relationship Studio (web)

Vite + React + Tailwind + shadcn/ui. Single-page tabbed dashboard with four
relationship-coaching tools: **Before You Send**, **Fight Repair**,
**Hard Conversation Planner**, and **Daily Check-In**. UI is mobile-first,
nothing is persisted server-side, includes a safety/disclaimer footer, and copy
buttons on every result block.

Key files:
- `src/components/RelationshipStudio.tsx` — top-level shell + tabs
- `src/components/tools/*` — one file per tool
- `src/components/ResultCard.tsx` — shared copy-able output card
- `src/lib/coach.ts` — typed client for `/api/coach/*`

### `artifacts/api-server` — Express API

Endpoints under `/api/coach/*` call OpenAI with strict JSON-schema response
formats so the UI receives validated structured payloads (no markdown to
parse). All endpoints share one `SAFETY_PROMPT` that enforces the product's
non-negotiables (no mind-reading the partner, no manipulation, no therapy
claims, crisis resources for safety language). Per-IP in-memory rate limiting
lives in `src/lib/rateLimit.ts` (20 req/min/IP). Optional gating via
`APP_PASSCODE` env var.

OpenAI credentials: prefers Replit AI Integrations
(`AI_INTEGRATIONS_OPENAI_BASE_URL` + `AI_INTEGRATIONS_OPENAI_API_KEY`,
auto-provisioned), falls back to user-supplied `OPENAI_API_KEY`. Model:
`gpt-5-mini` (uses `max_completion_tokens`, no `temperature`).

The legacy `POST /api/chat` endpoint has been removed; only `/api/health`
and `/api/coach/*` are mounted.

#### API perimeter (Phase 1)

- **CORS**: allowlist driven by `ALLOWED_ORIGINS` (comma-separated). In
  production an origin must appear in `ALLOWED_ORIGINS` to be accepted; in
  development `localhost`, `127.0.0.1`, and `*.replit.dev` / `*.repl.co` /
  `*.replit.app` are also allowed. Disallowed origins receive responses
  with no `Access-Control-Allow-Origin` header (browser blocks the call).
- **Request ID**: every response includes an `X-Request-Id` header. The
  same id is propagated to `pino-http` logs via `genReqId`. Clients may
  send their own `X-Request-Id` (≤128 chars) and it will be honored;
  otherwise a UUIDv4 is generated.
- **Global JSON error handler**: all uncaught errors return
  `{ error, requestId }` as JSON — never an HTML error page.
- **Helmet**: default headers enabled (no custom CSP).
- **Body parsing**: only `express.json({ limit: "64kb" })`. The unused
  `express.urlencoded(...)` middleware was removed.

#### Deployment assumption — `trust proxy: 1`

`app.set("trust proxy", 1)` (`artifacts/api-server/src/app.ts`) assumes
**exactly one trusted proxy hop in front of the Node process** (the
Replit edge / autoscale router). If the topology changes — direct
exposure with no proxy, or two hops — `req.ip` will collapse to the
proxy's address and the per-IP rate limiter will treat all callers as
one bucket. Re-verify this assumption when changing deployment target
or adding any reverse proxy in front of Replit.

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
