# WifeChat

WifeChat is a production-minded iPhone, web, keyboard-extension, and API project for private relationship perspective and communication coaching.

**Product north star:** See it clearly. Say it well. Close the loop.

WifeChat is not a generic chatbot, not therapy, not surveillance, and not a keyboard-only rewrite utility. It helps users work through emotionally confusing relationship moments, choose a grounded next step, communicate in their own voice, and close unresolved Loops in real life.

## Start here

Read these documents in order before making product, prompt, API, mobile, web, or keyboard changes:

1. [`docs/PRODUCT_SSOT.md`](docs/PRODUCT_SSOT.md) — product source of truth: purpose, target user, Loops, personalization model, UI/UX principles, monetization posture, and agent rules.
2. [`docs/LOOP_PRODUCT_BUILD_SPEC.md`](docs/LOOP_PRODUCT_BUILD_SPEC.md) — implementation bridge for building the Loop-first product from the SSOT into this repo.
3. [`docs/AI_CONTEXT_ENVELOPE_SPEC.md`](docs/AI_CONTEXT_ENVELOPE_SPEC.md) — source of truth for which local Loop/profile context can be sent to AI routes, when it is sent, and how it stays bounded/privacy-safe.
4. [`replit.md`](replit.md) — current workspace map, stack, commands, API safety posture, privacy language, and deployment assumptions.
5. [`docs/IOS_KEYBOARD_EXTENSION_PLAN.md`](docs/IOS_KEYBOARD_EXTENSION_PLAN.md) — native iOS keyboard-extension source of truth.
6. [`docs/WIFECHAT_PRODUCTION_SAFETY_PLAN.md`](docs/WIFECHAT_PRODUCTION_SAFETY_PLAN.md) — production safety/hardening plan for API, privacy, provider usage, tests, and operational posture.

If those docs disagree with code, stop and report the drift before changing behavior unless the task explicitly asks you to resolve it.

## What the product is

WifeChat is a private perspective and communication coach for emotionally confusing relationship moments.

The core product object is a **Loop**: one unresolved relationship moment the user wants to understand, respond to, repair, practice, follow up on, or let go.

The intended product flow is:

1. **Untangle** — reality-check what happened and how the user feels.
2. **Decide** — choose whether to text, talk, wait, repair, set a boundary, disengage, or get support.
3. **Prepare** — write the message, plan the conversation, or practice possible responses.
4. **Act** — the real-life step happens outside the app. WifeChat never auto-sends.
5. **Close** — mark the Loop resolved, partly resolved, let go, paused, or needing follow-up.

Core modes:

- **Open Loop Mode** for active unresolved relationship moments.
- **Maintenance Mode** for saved people/profiles when no active issue exists.

## What this repo must not become

Do not turn WifeChat into:

- a generic `/api/chat` app
- a therapy replacement
- a crisis-support service
- a partner-monitoring or relationship-scoring app
- a manipulation, coercion, guilt, or persuasion tool
- a message-thread reader
- a live keylogger
- a keyboard that sends text before the user explicitly taps Generate
- a mobile app or extension that contains OpenAI keys, provider secrets, passcodes, or backend credentials

## Repository layout

This is a pnpm workspace monorepo.

| Path | Purpose |
| --- | --- |
| `artifacts/wife-chat` | Vite + React web Relationship Studio. |
| `artifacts/wife-chat-mobile` | Expo Router mobile app plus committed native iOS output for keyboard-extension work. |
| `artifacts/api-server` | Express API serving `/api/healthz` and `/api/coach/*`. The backend is the only place that calls OpenAI/cloud AI providers. |
| `docs/PRODUCT_SSOT.md` | Product direction and agent guardrails. |
| `docs/LOOP_PRODUCT_BUILD_SPEC.md` | Loop-first implementation plan and phase guardrails. |
| `docs/AI_CONTEXT_ENVELOPE_SPEC.md` | AI context envelope rules for safe, bounded, user-initiated context injection. |
| `docs/IOS_KEYBOARD_EXTENSION_PLAN.md` | Native keyboard-extension plan and privacy constraints. |
| `replit.md` | Detailed workspace, command, API, logging, safety, and privacy reference. |

## Setup

Use pnpm. The root `preinstall` script rejects npm/yarn lockfile drift and enforces pnpm usage.

```bash
pnpm install
```

## Common commands

Root-level checks:

```bash
pnpm run typecheck
pnpm run build
```

Web app:

```bash
pnpm --filter @workspace/wife-chat run dev
pnpm --filter @workspace/wife-chat run typecheck
pnpm --filter @workspace/wife-chat run build
```

Mobile app:

```bash
pnpm --filter @workspace/wife-chat-mobile run dev
pnpm --filter @workspace/wife-chat-mobile run typecheck
pnpm --filter @workspace/wife-chat-mobile run build
```

API server:

```bash
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/api-server test
```

API client/schema generation:

```bash
pnpm --filter @workspace/api-spec run codegen
```

Database schema push for development only:

```bash
pnpm --filter @workspace/db run push
```

## API posture

The API is intentionally narrow. Keep it narrow.

Current public API surface is health plus coach routes. The legacy `POST /api/chat` route has been removed. New generic chat/session routes should not be added unless the product and safety docs are deliberately updated in the same change.

Important API rules:

- Use existing `/api/coach/*` contracts unless a task explicitly changes them.
- Keep strict schema-shaped responses for coach tools.
- Preserve safety tripwires, validation, CORS posture, request-size limits, rate limits, passcode/auth gates, and logging redaction.
- Never log raw relationship text, generated relationship content, raw provider responses, full request bodies, passcodes, auth headers, cookies, API keys, or secrets.
- Backend errors shown to users must be helpful without exposing provider internals.

## Keyboard-extension posture

The keyboard extension is a companion surface, not the product center.

Current keyboard work is static/local and uses no backend route. Network-backed keyboard V1, when explicitly approved, must use the existing `POST /api/coach/before-send` route. Do not add `/api/chat`, `/api/coach/session`, or a new backend route for keyboard V1.

Keyboard privacy rules:

- no host-app thread reading
- no auto-send
- no live keylogging
- no direct OpenAI calls
- no secrets in the extension
- no network request before the user taps Generate
- final sending remains manual by the user in the host app

## Product personalization model

Personalization is the moat, but it must be structured, user-approved, and safe.

The intended context stack is:

1. fixed WifeChat system/safety prompt
2. User Communication Profile
3. Voice Profile
4. selected Relationship Profile
5. current Loop context
6. current request

The LLM should not freely invent or rewrite the user’s system prompt. Product-owned safety rules always win.

Local Loop/profile context is not uploaded passively. Context is sent only when the user taps an AI action, and only the relevant context for that action should be included. See [`docs/AI_CONTEXT_ENVELOPE_SPEC.md`](docs/AI_CONTEXT_ENVELOPE_SPEC.md).

## Production mindset

Every change should preserve a clear path to an App Store-ready product.

Before changing behavior:

1. Audit the relevant files and docs.
2. Cite repo evidence in the plan using file paths and, where possible, line references.
3. Prefer the existing pattern unless there is a clear reason to change it.
4. Keep diffs small and cohesive.
5. Do not force-fix unrelated code.
6. Update truth docs when product behavior, architecture, API contracts, privacy promises, build steps, testing steps, environment variables, native setup, or App Store-facing behavior changes.
7. Run the smallest relevant verification commands and report exact results.

## App Store and privacy posture

User-facing claims must remain truthful:

- WifeChat is not therapy, legal, medical, emergency, or crisis support.
- WifeChat must not claim to diagnose, score, track, or read another person.
- Cloud AI coaching may send user-submitted text to the WifeChat API and AI provider.
- Do not claim provider retention behavior unless verified and documented.
- User-created local Loops, profiles, saved lessons, drafts, and reminders should remain user-controlled.
- Safety language may trigger a static safety response and crisis-resource guidance.

## Agent checklist

Future agents should use this checklist for every task:

- Read `docs/PRODUCT_SSOT.md`, `replit.md`, and any task-specific docs first.
- Confirm which package/surface owns the behavior.
- Search for existing routes, clients, schemas, prompt builders, constants, and docs before adding anything new.
- Avoid duplicate routes, duplicate clients, parallel schemas, or mismatched response semantics.
- Do not add secrets, unsafe logging, analytics, persistence of sensitive relationship text, thread reading, keylogging, auto-send, or generic chat escape hatches.
- Run targeted checks and report results.
- State docs updated, or explain why docs did not need updates.

## Current north star

WifeChat should make the user feel:

> This app gets me, but it does not just agree with me. It helped me stop spinning, see the moment more clearly, and choose a next step I can feel good about.
