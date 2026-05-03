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

OpenAI credentials (Phase 3 correction):
- **Default:** user-supplied `OPENAI_API_KEY` against the official OpenAI
  base URL. No custom `baseURL` is ever combined with `OPENAI_API_KEY`.
- **Opt-in only:** set `USE_REPLIT_OPENAI_PROXY=true` to route through
  Replit's AI Integrations proxy. Only when this flag is `"true"` will
  the server read `AI_INTEGRATIONS_OPENAI_API_KEY` and
  `AI_INTEGRATIONS_OPENAI_BASE_URL`. This is intentionally not the
  default so the user is not silently billed Replit credits when they
  have their own key configured.
- If the selected provider's key is missing, the server returns
  `500 { "error": "Server is not configured for the assistant." }` and
  stays alive. The OpenAI client is a lazy singleton; rotating the API
  key requires a process restart.

Model: `gpt-5-mini` (uses `max_completion_tokens`, no `temperature`).

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

#### Privacy-safe logging (Phase 3)

WifeChat logs must never contain raw relationship content. Specifically,
no log line — at any level — may include the request body, raw model
output, parsed model output, full provider/OpenAI error objects,
passcodes, API keys (full or partial), or auth/cookie headers.

- **Allowed metadata fields:** `requestId`, `route`/`url`, `tool`,
  `event`, `status`/`errorStatus`, `errorName`, `model`, timing if
  already present, rate-limit / kill-switch / safety event flags, and
  schema field names (e.g. the `missing` list for missing required
  fields — these are schema names, not user content).
- **Pino redact list** (`artifacts/api-server/src/lib/logger.ts`):
  `req.body`, `req.headers.authorization`, `req.headers.cookie`,
  `req.headers["x-app-passcode"]`, `req.headers["x-api-key"]`,
  `res.headers["set-cookie"]`.
- **Safe error helper** (`artifacts/api-server/src/lib/safeLog.ts`):
  `safeErrorMeta(err)` extracts only `errorName` and optional numeric
  `status`. It deliberately does **not** return `err.message`, because
  the OpenAI SDK and other providers pack the upstream response body
  (which can echo the user's prompt or the model's output) into the
  `message` field as plain text — a heuristic filter is not strong
  enough. Operators correlate logs by `X-Request-Id` and reproduce,
  rather than grep error bodies. Never returns `err.body`,
  `err.response`, `err.cause`, `err.stack`, `err.headers`, prompts, or
  any provider payload.
- **Coach event names** that route handlers emit (no content payload):
  `coach_kill_switch`, `coach_missing_credentials`,
  `coach_model_non_json`, `coach_model_invalid_shape`,
  `coach_model_missing_required_fields`, `coach_provider_error`.
- **Global error handler** logs only `{ event, status, requestId,
  errorName }` — never the full `err` object, so body-parser's raw
  payload is not echoed back into logs.

#### Coach cost / timeout / kill switch (Phase 2)

- **`MAX_COMPLETION_TOKENS = 1500`** (`artifacts/api-server/src/routes/coach.ts`):
  caps worst-case spend per OpenAI call; the coach JSON schemas are
  compact so this is well above the realistic ceiling for a full payload.
- **OpenAI client timeout**: a lazy singleton `OpenAI` instance is built
  on first request with `timeout: 30_000` (30 s). Reused across requests.
  If credentials are missing the route returns `500 { error: "Server is
  not configured for the assistant." }` and the server stays up.
- **`COACH_API_DISABLED=true`** kill switch: short-circuits every
  `/api/coach/*` request with `503 { error: "The coach is temporarily
  unavailable. Please try again later." }` **before** the rate limiter
  and **before** any OpenAI call. Toggling the env var and restarting
  the workflow is the fastest brake on cost or abuse.
- The optional `COACH_DAILY_REQUEST_CAP` process-level counter is
  **deferred** — the safety plan marks it optional and a memory-only,
  per-process counter that resets on every restart and does not work
  across instances would be misleading without a persistent store.
  Revisit alongside Phase 7 (durable rate limiting / quotas).

#### Deployment assumption — `trust proxy: 1`

`app.set("trust proxy", 1)` (`artifacts/api-server/src/app.ts`) assumes
**exactly one trusted proxy hop in front of the Node process** (the
Replit edge / autoscale router). If the topology changes — direct
exposure with no proxy, or two hops — `req.ip` will collapse to the
proxy's address and the per-IP rate limiter will treat all callers as
one bucket. Re-verify this assumption when changing deployment target
or adding any reverse proxy in front of Replit.

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
