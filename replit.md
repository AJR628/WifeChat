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

The legacy `POST /api/chat` endpoint is still mounted but unused by the new
UI.

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
