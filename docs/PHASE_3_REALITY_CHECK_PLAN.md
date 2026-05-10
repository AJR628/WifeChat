# Phase 3 — Reality Check + Context Envelope Plan

## Purpose

Phase 3 turns the local Loop shell into the first true WifeChat product loop:

**Start a Loop → Get Perspective → save the first Reality Check → continue from that Loop.**

This plan is the working phase document for ChatGPT, Codex, Replit Agent, and future agents. Update the status table in this file as subphases are completed. Do not let implementation drift into generic chat, broad refactors, cloud sync, or unbounded context upload.

## Required front-door reading

Before changing code in Phase 3, read:

1. [`README.md`](../README.md)
2. [`PRODUCT_SSOT.md`](PRODUCT_SSOT.md)
3. [`LOOP_PRODUCT_BUILD_SPEC.md`](LOOP_PRODUCT_BUILD_SPEC.md)
4. [`AI_CONTEXT_ENVELOPE_SPEC.md`](AI_CONTEXT_ENVELOPE_SPEC.md)
5. [`WIFECHAT_PRODUCTION_SAFETY_PLAN.md`](WIFECHAT_PRODUCTION_SAFETY_PLAN.md)
6. [`IOS_KEYBOARD_EXTENSION_PLAN.md`](IOS_KEYBOARD_EXTENSION_PLAN.md) if touching native/keyboard files

## Current state at Phase 3 start

### Product state

- WifeChat is now Loop-first in product docs.
- The mobile app can create, save, reopen, edit, pause, resolve, and archive local Loops.
- Existing coach actions can be launched from a Loop and their results are saved locally as Loop messages/artifacts.
- The Start Loop form is useful as a data foundation, but it is too heavy for the intended first-use experience.
- The user still does not get immediate Loop-specific perspective after describing what happened.

### Mobile state

Relevant files:

- `artifacts/wife-chat-mobile/lib/loopModels.ts`
- `artifacts/wife-chat-mobile/lib/storage.ts`
- `artifacts/wife-chat-mobile/lib/loopStore.ts`
- `artifacts/wife-chat-mobile/lib/coach.ts`
- `artifacts/wife-chat-mobile/app/loop/new.tsx`
- `artifacts/wife-chat-mobile/app/loop/[id].tsx`
- `artifacts/wife-chat-mobile/app/coach/[tool].tsx`
- `artifacts/wife-chat-mobile/app/(tabs)/index.tsx`
- `artifacts/wife-chat-mobile/app/(tabs)/saved.tsx`
- `artifacts/wife-chat-mobile/app/(tabs)/rituals.tsx`
- `artifacts/wife-chat-mobile/app/(tabs)/profile.tsx`

Important current behavior:

- Local storage is the private memory.
- `sendCoach(tool, text)` sends only the current text to existing coach routes.
- Loop mode in `app/coach/[tool].tsx` currently changes local persistence only; it does not send Loop context to the model.
- Relationship Profiles, User Communication Profile, and Voice Profile models exist, but no onboarding/profile UI is wired yet.

### Backend state

Relevant files:

- `artifacts/api-server/src/routes/coach.ts`
- `artifacts/api-server/src/lib/safety.ts`
- `artifacts/api-server/src/lib/rateLimit.ts`
- `artifacts/api-server/src/lib/safeLog.ts`
- `artifacts/api-server/src/lib/logger.ts`
- `artifacts/api-server/tests/api.integration.test.ts`

Important current behavior:

- Current bounded routes are:
  - `POST /api/coach/before-send`
  - `POST /api/coach/repair`
  - `POST /api/coach/planner`
  - `POST /api/coach/checkin`
- There is no `/api/chat`.
- There is no `/api/coach/session`.
- Backend owns the fixed safety/system prompt and all OpenAI/provider calls.
- Request validation, deterministic safety tripwire, rate limit, timeout, kill switch, provider error redaction, and metadata-only logging already exist.
- Current prompt builders already frame interpolated user content as untrusted input.

## Phase 3 goal

Deliver a production-minded Reality Check MVP:

1. Add a bounded `POST /api/coach/reality-check` route.
2. Add a strict, safe context-envelope validation/rendering path.
3. Add a mobile context-envelope builder that sends only the current Loop and selected relevant local context.
4. Simplify Start Loop so the user can quickly describe what happened.
5. Add a primary CTA: **Get perspective** / **Untangle this**.
6. Save the initial Reality Check response back into the Loop as an artifact/message.
7. Preserve all privacy, safety, logging, App Store, and keyboard boundaries.

## Non-goals

Phase 3 must not implement:

- `/api/chat`
- `/api/coach/session`
- generic free-form chat
- full onboarding/personality setup
- Relationship Profile creation/editing UI
- cloud sync or cloud history
- account auth/subscriptions
- keyboard network generation
- direct OpenAI calls from mobile/web/keyboard
- provider secrets in mobile/native/generated clients
- analytics
- host-app message reading
- auto-send behavior
- partner scoring, diagnosis, surveillance, manipulation, or mind-reading features

## Phase 3 status table

Update this table as work lands.

| Subphase | Status | Owner | Summary |
| --- | --- | --- | --- |
| 3.0 Front-door/doc sync | Verified | ChatGPT/Codex | README and replit.md link the active Phase 3 plan and context-envelope spec. |
| 3.1 Backend audit + route contract plan | Verified | Codex | Backend audit saved in `docs/PHASE_3_1_BACKEND_AUDIT.md`; route/codegen/test ownership verified before route work. |
| 3.2 Backend Reality Check route | Verified | Codex | Bounded route, strict schema, context helpers, OpenAPI/codegen, and backend tests shipped. |
| 3.3 Mobile context-envelope builder | Planned | Codex | Add explicit context builder/client function, no UI redesign. |
| 3.4 Start Loop UX + initial CTA | Planned | Replit Agent | Simplify form, add Get Perspective, save result into Loop. |
| 3.5 Ongoing Loop guidance polish | Planned | Replit Agent/Codex | Add Loop-level follow-up using Reality Check route, still bounded. |
| 3.6 Phase closeout | Planned | ChatGPT/Codex | Docs/status update, drift check, App Store/privacy copy check. |

Status values: `Planned`, `In Progress`, `Implemented`, `Verified`, `Deferred`, `Blocked`.

## Subphase 3.0 — Front-door/doc sync

### Goal

Make Phase 3 discoverable and make the context spec part of the active repo front door.

### Expected files

- `README.md`
- `replit.md`
- `docs/PHASE_3_REALITY_CHECK_PLAN.md`

### Tasks

- Add this plan.
- Link it from README as the active Phase 3 implementation plan.
- Update `replit.md` so it points to `AI_CONTEXT_ENVELOPE_SPEC.md` and this Phase 3 plan.
- Do not change runtime code.

### Verification

- Docs-only diff.
- No route/prompt/client/native/package changes.

## Subphase 3.1 — Backend audit + route contract plan

### Goal

Before adding `POST /api/coach/reality-check`, confirm where API contracts and tests are actually owned in this repo.

### Expected files

Audit only. No implementation files should change unless the report is saved as docs.

### Audit targets

- `artifacts/api-server/src/routes/coach.ts`
- `artifacts/api-server/tests/api.integration.test.ts`
- `artifacts/api-server/package.json`
- API spec/codegen packages if present in the current checkout
- `artifacts/wife-chat-mobile/lib/coach.ts`
- web client coach helper if the web app will call Reality Check later

### Questions to answer

- Is OpenAPI/codegen currently authoritative for coach routes, or are current coach clients hand-written?
- What tests already assert `/api/chat` is absent?
- What test harness pattern should Reality Check use?
- Can context-envelope helpers be unit-tested without live OpenAI?
- Which files should own route schemas and response formatting?

### Output

A short implementation plan/report with:

- files inspected
- exact route contract proposal
- test list
- codegen impact
- doc impact
- risks

### Guardrails

No runtime behavior changes in 3.1 unless explicitly approved.

## Subphase 3.2 — Backend Reality Check route

### Goal

Add a bounded Reality Check route using strict schema-shaped output and safe context-envelope handling.

### Expected files

Likely files:

- `artifacts/api-server/src/routes/coach.ts`
- `artifacts/api-server/src/coach/contextEnvelope.ts` or equivalent shared helper
- `artifacts/api-server/src/coach/promptContext.ts` or equivalent shared helper
- `artifacts/api-server/tests/api.integration.test.ts`
- API spec/codegen files if current repo audit confirms they are authoritative
- relevant docs only if implementation differs from this plan/spec

### Route

```http
POST /api/coach/reality-check
```

### Request shape

Use `AI_CONTEXT_ENVELOPE_SPEC.md` as source of truth.

Minimum V1 request body:

```ts
type RealityCheckRequest = {
  action: "reality-check";
  request: {
    text: string;
  };
  context?: {
    userCommunicationProfile?: UserCommunicationProfileContext;
    voiceProfile?: VoiceProfileContext;
    relationshipProfile?: RelationshipProfileContext;
    loopContext?: LoopContext;
    savedLessons?: SavedLessonContext[];
  };
  clientMeta?: {
    platform?: "ios" | "android" | "web";
    sourceSurface?: "mobile" | "web" | "keyboard";
    localContextVersion?: 1;
  };
};
```

Do not accept unknown/unbounded fields unless there is an explicit compatibility reason.

### Response shape

```ts
type RealityCheckResult = {
  whatSeemsUnderstandable: string;
  whatToSlowDownOn: string;
  factsVsAssumptions: string[];
  boundaryOrSafetyCheck: string;
  likelyNeed: string;
  nextBestStep: string;
  suggestedPath:
    | "wait"
    | "text"
    | "talk"
    | "repair"
    | "boundary"
    | "get-support"
    | "let-go";
  optionalDraft?: string;
};
```

Response envelope should match the existing coach route style unless Phase 3 deliberately updates the contract in docs/tests/codegen.

### Implementation contract

- Route: `POST /api/coach/reality-check`.
- Request envelope is strict: `action` must be `"reality-check"`, `request.text` is required, trimmed, non-empty, and capped at 4,000 characters; context objects reject unknown fields, arrays are capped, and the total serialized envelope is capped near 12,000 characters.
- Response envelope stays consistent with existing coach routes: `{ tool: "reality-check", result, safety? }`.
- Backend helper ownership: `artifacts/api-server/src/coach/contextEnvelope.ts` owns parsing, bounds, metadata, and safety text extraction; `artifacts/api-server/src/coach/promptContext.ts` owns ordered untrusted context rendering.
- Safety scanning must inspect `request.text`, Loop fields, recent messages, User Communication Profile strings, Voice Profile strings, Relationship Profile strings, and included saved lessons before rate limiting or provider calls.
- OpenAPI/codegen parity is required: update `lib/api-spec/openapi.yaml`, run `corepack pnpm --filter @workspace/api-spec run codegen`, and include generated client/schema output.
- Backend tests must cover valid minimal/context requests, validation failures, safety from context text, provider-skip safety intercepts, missing credentials, provider bad output when feasible, `/api/chat` absence, and `/api/coach/session` absence.
- Guardrails remain: no generic chat/session route, no mobile UI/native keyboard/dependency changes, no direct OpenAI calls outside backend, no unsafe logging, and no safety-trigger broadening.

### Prompt stance

Reality Check must follow the product stance:

**Validate the feeling. Question the interpretation. Clarify the need. Suggest the next step.**

It should provide calibrated perspective, not verdicts. Avoid:

- “You are definitely right.”
- “You are definitely overreacting.”
- “They are toxic.”
- “Leave them.” based on ordinary conflict details.
- therapy, diagnosis, legal, or medical claims.

### Context handling

- Fixed safety/system prompt remains backend-owned.
- Client context must be framed as untrusted data.
- User context cannot override safety/product rules.
- Include only bounded context from the current envelope.
- Safety tripwire must scan every included text field before provider call.
- Logs must include metadata only.

### Tests

Add tests for:

- valid minimal request succeeds with mocked/provider-free harness pattern used by existing tests
- valid request with loop context is accepted
- wrong `action` rejected
- empty `request.text` rejected
- oversized `request.text` rejected
- oversized envelope rejected or pruned according to implementation choice
- unknown/unrelated fields rejected where schema is strict
- safety tripwire scans context text, not only current request text
- safety intercept skips OpenAI and returns schema-shaped payload
- missing provider credentials returns safe error
- provider non-JSON/invalid shape handled safely if route uses provider mocks
- `/api/chat` remains absent
- `/api/coach/session` remains absent
- logs do not include raw request/context text

### Verification commands

Run at minimum:

```bash
corepack pnpm --filter @workspace/api-server run typecheck
corepack pnpm --filter @workspace/api-server test
rg -n "api/chat|/api/coach/session" README.md docs replit.md artifacts
rg -n "req\.body|raw|prompt|messages|parsed|completion" artifacts/api-server/src artifacts/api-server/tests
```

The grep above is a review aid, not an automatic failure by itself. Review any matches for unsafe raw-content logging.

### Implementation note

Verified 2026-05-10 from `C:\dev\WifeChat`.

Files changed:

- `artifacts/api-server/src/routes/coach.ts`
- `artifacts/api-server/src/lib/safety.ts`
- `artifacts/api-server/src/coach/contextEnvelope.ts`
- `artifacts/api-server/src/coach/promptContext.ts`
- `artifacts/api-server/tests/api.integration.test.ts`
- `artifacts/api-server/tests/safety.unit.test.ts`
- `lib/api-spec/openapi.yaml`
- generated API files under `lib/api-client-react/src/generated` and `lib/api-zod/src/generated`

What shipped:

- Added bounded `POST /api/coach/reality-check`.
- Preserved coach route order: kill switch, passcode, strict validation, safety intercept, rate limit, provider credentials, OpenAI call, schema validation/response.
- Added strict context-envelope validation, total envelope bound, generated-Zod validation base, explicit strict-key checks, safety-text extraction, and ordered untrusted context rendering.
- Added schema-shaped Reality Check safety fallback with `suggestedPath: "get-support"`.
- Added OpenAPI/codegen parity and backend tests for valid requests, validation failures, context safety scanning, safety provider-skip, missing credentials, bad provider output, `/api/chat` absence, and `/api/coach/session` absence.

Checks run:

- `corepack pnpm exec tsc --build lib/api-zod/tsconfig.json` passed.
- `corepack pnpm -w run typecheck:libs` passed.
- `corepack pnpm --filter @workspace/api-server run typecheck` passed.
- `corepack pnpm --filter @workspace/api-server test` passed: 55 tests, 0 failures.
- Guardrail scans for generic routes, mobile/native secrets, and raw-content logging patterns were reviewed.

Notes:

- `corepack pnpm --filter @workspace/api-spec run codegen` generated the expected files but failed on this Windows PATH at its second step because the package script invokes bare `pnpm`. The equivalent generation and library typecheck were run with `corepack pnpm exec orval --config ./orval.config.ts` and `corepack pnpm -w run typecheck:libs`.
- No separate Phase 3.2 plan doc was created.

## Subphase 3.3 — Mobile context-envelope builder

### Goal

Add explicit mobile helpers for building and sending context-aware Reality Check requests. Do not make existing `sendCoach(tool, text)` silently upload context.

### Expected files

Likely files:

- `artifacts/wife-chat-mobile/lib/coachContext.ts`
- `artifacts/wife-chat-mobile/lib/coach.ts` or a new dedicated client helper
- mobile type files if needed

### Tasks

- Add `buildAiContextEnvelope(...)` or equivalent.
- Include only the current Loop.
- Include only selected Relationship Profile when available later.
- Include User Communication Profile and Voice Profile when available later.
- For V1, work even when profiles are `null` / not built yet.
- Include bounded recent Loop messages.
- Include a short prior artifact summary if needed.
- Add `sendRealityCheck(envelope)` or similar explicit function.
- Do not alter standalone `sendCoach(tool, text)` behavior.

### Bounds

Follow `AI_CONTEXT_ENVELOPE_SPEC.md` limits:

- current request max aligned with backend max
- recent messages capped
- arrays capped
- no unrelated Loops/profiles/lessons
- no all-local-store serialization

### Verification

Run:

```bash
corepack pnpm --filter @workspace/wife-chat-mobile run typecheck
rg -n "OPENAI_API_KEY|AI_INTEGRATIONS|APP_PASSCODE|OpenAI|x-app-passcode" artifacts/wife-chat-mobile
rg -n "console\.|logger|analytics|captureException|captureMessage" artifacts/wife-chat-mobile/app artifacts/wife-chat-mobile/lib
```

Manual/code review checks:

- no direct OpenAI/mobile secrets
- context builder does not send all Loops
- unrelated profiles/lessons are not included
- existing quick tools still use existing path

## Subphase 3.4 — Start Loop UX + initial CTA

### Goal

Make the first Loop action feel immediate, useful, and less overwhelming.

### Expected files

Likely files:

- `artifacts/wife-chat-mobile/app/loop/new.tsx`
- `artifacts/wife-chat-mobile/app/loop/[id].tsx`
- `artifacts/wife-chat-mobile/lib/loopStore.ts` if a helper is needed
- `artifacts/wife-chat-mobile/lib/coachContext.ts` / Reality Check client from 3.3

### UX changes

Simplify Start Loop:

Required:

- `whatHappened`

Optional or progressive/expandable:

- title
- emotion
- interpretation
- need
- considering doing
- next step
- relationship type

Primary CTA:

- **Get perspective** or **Untangle this**

Secondary CTA:

- **Save without AI**

### Flow

When the user taps the primary CTA:

1. Save the Loop locally.
2. Build a Reality Check context envelope from that Loop.
3. Call `POST /api/coach/reality-check` through the explicit Reality Check client.
4. Save the user request + assistant response as Loop messages.
5. Save the structured Reality Check as a `GeneratedArtifact` with `sourceTool: "reality-check"`.
6. Navigate to Loop detail.
7. Show the Reality Check result prominently.

On failure:

- Keep the saved Loop.
- Show a helpful error without provider internals.
- Let user retry or continue editing.
- Do not save a fake artifact.

### UI copy

Use language like:

- “Tell WifeChat what happened.”
- “Add details if you want. You can leave anything blank.”
- “Get perspective.”
- “Saved on this device. Relevant context is sent only when you ask the assistant for help.”

Avoid:

- “diagnose”
- “score”
- “what they really think”
- “therapy” claims
- “nothing is sent”

### Verification

Run:

```bash
corepack pnpm --filter @workspace/wife-chat-mobile run typecheck
rg -n "api/chat|/api/coach/session" README.md docs replit.md artifacts
rg -n "OPENAI_API_KEY|AI_INTEGRATIONS|APP_PASSCODE|OpenAI|x-app-passcode" artifacts/wife-chat-mobile
rg -n "console\.|logger|analytics|captureException|captureMessage" artifacts/wife-chat-mobile/app artifacts/wife-chat-mobile/lib
```

Manual checks on Expo Go:

- create Loop with only `whatHappened`
- Get Perspective succeeds
- result appears in Loop detail
- app close/reopen preserves Loop + artifact
- failed request preserves Loop but not artifact
- Save without AI still works
- standalone tools still work

## Subphase 3.5 — Ongoing Loop guidance polish

### Goal

Let the user continue from the Reality Check inside the Loop without creating generic chat.

### Expected files

Likely files:

- `artifacts/wife-chat-mobile/app/loop/[id].tsx`
- maybe `artifacts/wife-chat-mobile/app/coach/[tool].tsx` if reusing chat UI carefully
- context/reality-check client helpers

### Approach

Prefer Loop-anchored follow-up actions such as:

- “Ask a follow-up”
- “Help me decide what to do”
- “Help me write a message”
- “What if they respond badly?”
- “Make this shorter”
- “Close the Loop”

Do not create a blank generic chatbot as the main surface.

Every follow-up request should:

- use the current Loop
- include bounded recent Loop messages/artifacts
- call a bounded route
- persist result locally only after success

### Guardrail

If this starts looking like `/api/chat`, stop and redesign it as structured Loop actions.

## Subphase 3.6 — Phase closeout

### Goal

Close the phase cleanly so future agents know what is shipped and what remains.

### Expected files

- `docs/PHASE_3_REALITY_CHECK_PLAN.md`
- `replit.md`
- `README.md` only if front-door status changes materially
- `docs/LOOP_PRODUCT_BUILD_SPEC.md` only if phase/status details need updates
- `docs/AI_CONTEXT_ENVELOPE_SPEC.md` only if implementation intentionally diverges

### Closeout checklist

- Update status table in this doc.
- Add current Reality Check route status to `replit.md`.
- Confirm privacy copy matches actual context upload behavior.
- Confirm `/api/chat` and `/api/coach/session` remain absent.
- Confirm mobile/web/native still contain no provider secrets.
- Confirm keyboard behavior is unchanged.
- Record known polish backlog.

## Agent responsibility split

### ChatGPT

- Product/architecture sanity checks.
- Scope control.
- Repo-doc alignment.
- Review Codex/Replit plans and implementation summaries.
- Keep drift/watchlist visible.

### Codex

Best for:

- backend route/schema/test implementation
- context-envelope helpers
- type/model work
- static scans
- docs/status updates
- small deterministic refactors

Codex should not do broad UI redesign unless explicitly scoped.

### Replit Agent

Best for:

- mobile UI/UX iteration
- Start Loop form simplification
- Loop detail presentation
- screenshots/manual UI validation

Replit Agent should not change backend routes, prompts, generated clients, package files, native keyboard code, or API contracts unless explicitly scoped.

## Universal guardrails for every Phase 3 task

Do not add:

- `/api/chat`
- `/api/coach/session`
- direct OpenAI calls outside backend
- mobile/native/web provider secrets
- host-app thread reading
- auto-send behavior
- background uploads
- cloud sync/history
- analytics
- unsafe logging
- therapy/diagnosis/partner-scoring/manipulation/surveillance features

Do preserve:

- bounded `/api/coach/*` route posture
- strict response schemas
- deterministic safety tripwire before provider calls
- passcode/auth gates if enabled
- rate limits and timeouts
- metadata-only logs
- App Store-safe privacy copy
- local-first Loop/profile storage
- user-initiated context upload only

## Ongoing polish/drift watchlist

Keep these visible, but do not let them derail Phase 3 unless they block implementation:

- Some backend/copy still says “partner”; product direction is broader than spouse/partner.
- Existing schemas include `partnerSideMayHaveFelt`; future broadened copy should prefer “other person.”
- Web app remains tool-first while mobile is Loop-first.
- Start Loop form is currently too long; Phase 3.4 addresses it.
- Maintenance Mode is still a shell.
- Relationship Profile UI is not built.
- User Communication Profile / Voice Profile onboarding is not built.
- Tone preference is truthful but not yet connected to AI responses.
- Local Loop/message/artifact storage is not capped.
- Mobile storage still lacks focused automated tests.
- Replit web preview may not reliably test coach sends; Expo Go physical device is the mobile source of truth for AI behavior.
- App Store privacy/terms copy is not final.
