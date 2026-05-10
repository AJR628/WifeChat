# Phase 3.1 Backend Audit + Route Contract Plan

Date verified: 2026-05-10

Scope: docs-only backend audit for Phase 3.1. This pass does not add
`POST /api/coach/reality-check`, does not change runtime behavior, does not edit
prompts, API route code, mobile UI, generated clients, native keyboard files, or
dependencies.

## Files inspected

Front-door and product docs:

- `README.md`
- `replit.md`
- `docs/PRODUCT_SSOT.md`
- `docs/LOOP_PRODUCT_BUILD_SPEC.md`
- `docs/AI_CONTEXT_ENVELOPE_SPEC.md`
- `docs/PHASE_3_REALITY_CHECK_PLAN.md`
- `docs/WIFECHAT_PRODUCTION_SAFETY_PLAN.md`

Backend/API files:

- `artifacts/api-server/src/app.ts`
- `artifacts/api-server/src/routes/index.ts`
- `artifacts/api-server/src/routes/coach.ts`
- `artifacts/api-server/src/routes/health.ts`
- `artifacts/api-server/src/lib/safety.ts`
- `artifacts/api-server/src/lib/rateLimit.ts`
- `artifacts/api-server/src/lib/safeLog.ts`
- `artifacts/api-server/src/lib/logger.ts`
- `artifacts/api-server/tests/api.integration.test.ts`
- `artifacts/api-server/tests/provider.test.ts`
- `artifacts/api-server/tests/safeLog.unit.test.ts`
- `artifacts/api-server/tests/safety.unit.test.ts`
- `artifacts/api-server/package.json`

Mobile/web caller and Loop files:

- `artifacts/wife-chat-mobile/lib/coach.ts`
- `artifacts/wife-chat-mobile/lib/loopModels.ts`
- `artifacts/wife-chat-mobile/lib/loopStore.ts`
- `artifacts/wife-chat-mobile/lib/storage.ts`
- `artifacts/wife-chat-mobile/constants/tools.ts`
- `artifacts/wife-chat-mobile/app/coach/[tool].tsx`
- `artifacts/wife-chat-mobile/app/loop/[id].tsx`
- `artifacts/wife-chat-mobile/app/loop/new.tsx`
- `artifacts/wife-chat/src/lib/coach.ts`

API spec/codegen files:

- `lib/api-spec/openapi.yaml`
- `lib/api-spec/orval.config.ts`
- `lib/api-spec/package.json`
- `lib/api-client-react/src/generated/api.ts`
- `lib/api-client-react/src/generated/api.schemas.ts`
- `lib/api-zod/src/generated/api.ts`
- `lib/api-zod/src/generated/types/index.ts`
- `package.json`
- `pnpm-workspace.yaml`

## Current backend route ownership

The live API server is Express. `artifacts/api-server/src/app.ts` mounts
request logging, `helmet`, CORS, `express.json({ limit: "64kb" })`, then mounts
the API router at `/api` (`app.ts:47-81`). The API router mounts only
`healthRouter` and `coachRouter` (`routes/index.ts:7-8`).

The current coach route owner is the hand-written Express router in
`artifacts/api-server/src/routes/coach.ts`. Live bounded coach routes are:

- `POST /api/coach/before-send` (`coach.ts:537`)
- `POST /api/coach/repair` (`coach.ts:538`)
- `POST /api/coach/planner` (`coach.ts:539`)
- `POST /api/coach/checkin` (`coach.ts:540`)

There is no live `/api/chat` route and no live `/api/coach/session` route in the
mounted router. The Phase 3 plan repeats those as non-goals
(`docs/PHASE_3_REALITY_CHECK_PLAN.md:91-108`).

Current coach execution order in `runTool` is:

1. Kill switch middleware on `/coach` (`coach.ts:20-34`).
2. Optional passcode check from body or `x-app-passcode` (`coach.ts:375-386`).
3. Per-tool input validation and 4,000 character caps (`coach.ts:107-282`).
4. Deterministic safety tripwire over every validated string field
   (`coach.ts:400-443`).
5. Per-IP in-memory rate limit (`coach.ts:388-397`, `rateLimit.ts:13-49`).
6. Provider credential selection and lazy OpenAI client (`coach.ts:340-372`).
7. OpenAI call, JSON parse, required-key response checks, and `{ tool, result }`
   response (`coach.ts:452-512`).

## Current mobile/web wiring

Mobile is Loop-first in current `main`, but existing cloud coach calls are still
text-only:

- `artifacts/wife-chat-mobile/lib/coach.ts` defines supported tools as
  `"before-send" | "repair" | "checkin"` and posts to
  `https://${EXPO_PUBLIC_DOMAIN}/api/coach/${tool}` (`lib/coach.ts:13-131`).
- `artifacts/wife-chat-mobile/app/coach/[tool].tsx` accepts optional `loopId`,
  loads Loop messages for local display, calls `sendCoach(toolKey, text)`, and
  saves user/assistant messages plus a `GeneratedArtifact` back into the Loop
  when in Loop mode (`app/coach/[tool].tsx:37-168`).
- The Phase 3 plan correctly says Loop mode changes local persistence only and
  does not send Loop context to the model yet
  (`docs/PHASE_3_REALITY_CHECK_PLAN.md:48-53`).
- `artifacts/wife-chat-mobile/lib/loopModels.ts` already includes
  `"reality-check"` as a `LoopSourceTool` (`loopModels.ts:23`).
- Web uses a hand-written helper at `artifacts/wife-chat/src/lib/coach.ts`,
  posting to `${BASE}/api/coach/${path}` (`wife-chat/src/lib/coach.ts:47-91`).

## Current API client/codegen ownership

The workspace has OpenAPI/Orval infrastructure:

- `replit.md:26` identifies API codegen as Orval from OpenAPI.
- `replit.md:33` documents `pnpm --filter @workspace/api-spec run codegen`.
- `lib/api-spec/package.json:6` owns the codegen script.
- `lib/api-spec/orval.config.ts:16-72` generates React Query client output into
  `lib/api-client-react/src/generated` and Zod output into
  `lib/api-zod/src/generated`.
- `lib/api-spec/openapi.yaml:1-27` currently specifies only `GET /healthz`.
- `lib/api-client-react/src/generated/api.ts:31-45` contains only the generated
  health check fetcher/query key.
- `lib/api-zod/src/generated/api.ts:14-16` contains only
  `HealthCheckResponse`.

Current `/api/coach/*` callers are therefore hand-written, not generated.
However, current Phase 3 docs require route changes to maintain
OpenAPI/codegen parity:

- `docs/LOOP_PRODUCT_BUILD_SPEC.md:226-231` says future Reality Check should be
  a bounded route and every route change must update server tests,
  OpenAPI/codegen, client callers, and docs in the same change.
- `docs/AI_CONTEXT_ENVELOPE_SPEC.md:168-173` says envelope model changes must
  update the spec, API validation, generated clients, and docs in the same
  change.
- `docs/AI_CONTEXT_ENVELOPE_SPEC.md:586-599` requires OpenAPI/codegen coverage
  for request schema, response schema, and generated clients/schemas; if
  codegen is not yet authoritative, the implementing agent must audit and
  document current contract ownership first.

Conclusion: current coach clients are hand-written, but 3.2 should update
OpenAPI/codegen for the new Reality Check route unless the Phase 3 docs are
deliberately changed first.

## Current test harness pattern

The API test command is defined in `artifacts/api-server/package.json:6-12` and
runs Node's built-in test runner through `tsx`.

Integration tests:

- Set `NODE_ENV=test`, `LOG_LEVEL=silent`, and `ALLOWED_ORIGINS` before
  importing the app (`api.integration.test.ts:23-29`).
- Boot the Express app on an ephemeral port with `app.listen(0)` and close it in
  `after()` (`api.integration.test.ts:31-44`).
- Cover health/request-id, invalid JSON, CORS, kill switch, missing
  credentials, safety intercept, and `/api/chat` absence
  (`api.integration.test.ts:46-242`).

No-live-OpenAI patterns:

- Missing-credential tests clear all provider env vars and assert a clean 500
  while the server remains alive (`api.integration.test.ts:123-156`).
- Safety intercept tests clear credentials and monkey-patch `globalThis.fetch`
  so any external provider call is detected (`api.integration.test.ts:159-225`).
- Provider tests combine direct `selectCredentials()` unit checks with HTTP
  cases that stop before live provider calls (`provider.test.ts:92-285`).

Safety tests:

- `detectSafetyTripwire()` is pure and local (`safety.ts:116-122`).
- Static schema-shaped safety results are built by `buildSafetyResult()`
  (`safety.ts:269-282`).
- Unit tests cover tripping/non-tripping phrases and non-empty safety result
  shapes for every existing tool (`safety.unit.test.ts:16-125`).

Current absence coverage:

- `POST /api/chat` and `GET /api/chat` return 404 in
  `api.integration.test.ts:228-242`.
- There is not yet an equivalent `/api/coach/session` absence test. Add it in
  3.2.

## Proposed Reality Check route contract

Endpoint:

```http
POST /api/coach/reality-check
```

Request source of truth:

- `docs/AI_CONTEXT_ENVELOPE_SPEC.md:168-199`
- `docs/AI_CONTEXT_ENVELOPE_SPEC.md:478-511`
- `docs/PHASE_3_REALITY_CHECK_PLAN.md:212-266`

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

The Phase 3 plan says not to accept unknown/unbounded fields unless there is an
explicit compatibility reason (`docs/PHASE_3_REALITY_CHECK_PLAN.md:242`).

Response result shape:

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

Response envelope should match the current coach style unless Phase 3
deliberately changes the contract in docs/tests/codegen
(`docs/PHASE_3_REALITY_CHECK_PLAN.md:266`):

```json
{
  "tool": "reality-check",
  "result": {
    "whatSeemsUnderstandable": "",
    "whatToSlowDownOn": "",
    "factsVsAssumptions": [],
    "boundaryOrSafetyCheck": "",
    "likelyNeed": "",
    "nextBestStep": "",
    "suggestedPath": "wait"
  }
}
```

For deterministic safety intercepts, keep the additive existing style:

```json
{
  "tool": "reality-check",
  "result": {},
  "safety": { "intercepted": true, "category": "violence" }
}
```

The current safety metadata pattern is additive and already used by existing
coach routes (`coach.ts:436-440`).

## Proposed helper module ownership

Backend context-envelope validation should live in a backend-owned helper, not
mobile/web/generated code. The context-envelope spec recommends:

- `artifacts/api-server/src/coach/contextEnvelope.ts` for request validation,
  bounds/pruning validation, text extraction for safety scanning, and untrusted
  block rendering (`docs/AI_CONTEXT_ENVELOPE_SPEC.md:432-438`).
- `artifacts/api-server/src/coach/promptContext.ts` for formatting optional
  context into ordered prompt blocks while keeping the system prompt separate
  (`docs/AI_CONTEXT_ENVELOPE_SPEC.md:439-443`).
- `artifacts/api-server/src/routes/coach.ts` remains the route owner for bounded
  coach endpoints unless routes are split deliberately
  (`docs/AI_CONTEXT_ENVELOPE_SPEC.md:444-447`).

Safety text extraction should be a pure helper that extracts every
user-supplied text field from the validated envelope and feeds each field to
`detectSafetyTripwire()` before rate limiting/provider calls. The spec requires
safety scanning across `request.text`, Loop fields, recent user messages,
Relationship Profile free-text fields, User Communication Profile strings, Voice
Profile strings, and included saved lessons
(`docs/AI_CONTEXT_ENVELOPE_SPEC.md:406-422`).

Untrusted context rendering must preserve the current backend pattern of
wrapping interpolated user content as untrusted data. Existing routes already do
this in their prompt builders (`coach.ts:113-122`, `coach.ts:157-165`,
`coach.ts:230-253`, `coach.ts:284-307`). The context spec lists the required
untrusted block labels (`docs/AI_CONTEXT_ENVELOPE_SPEC.md:388-403`).

## Proposed tests for 3.2

Add backend tests for:

- Valid minimal request succeeds with the existing provider-free harness pattern.
- Valid request with Loop context is accepted.
- Wrong `action` is rejected.
- Empty `request.text` is rejected.
- Oversized `request.text` is rejected.
- Oversized envelope is rejected or pruned according to the documented
  implementation choice.
- Unknown/unrelated fields are rejected where schema is strict.
- Safety tripwire scans context text, not only current request text.
- Safety intercept skips OpenAI and returns schema-shaped payload.
- Missing provider credentials return a safe error without crashing the server.
- Provider non-JSON/invalid shape is handled safely if route tests mock/stub
  provider output.
- `/api/chat` remains absent.
- `/api/coach/session` remains absent.
- Logs do not include raw request/context text.

This list matches the Phase 3 plan (`docs/PHASE_3_REALITY_CHECK_PLAN.md:295-308`)
with the additional explicit `/api/coach/session` GET/POST absence guard.

## Risks and decisions needed before 3.2

- OpenAPI/codegen is present but currently health-only. 3.2 needs an explicit
  choice: follow the current Phase 3 docs and add Reality Check to OpenAPI, or
  change the docs before route work. Default recommendation: update
  OpenAPI/codegen in 3.2.
- Existing `buildSafetyResult()` only supports
  `"before-send" | "repair" | "planner" | "checkin"` (`safety.ts:142`), so 3.2
  needs a schema-shaped Reality Check safety builder.
- Existing `ToolKey` in `coach.ts` only covers the four current routes
  (`coach.ts:63`), so 3.2 needs route/schema integration without broad
  refactoring.
- Existing validators inspect known fields and ignore unrelated fields. Reality
  Check should be strict because the Phase 3 plan says unknown/unbounded fields
  should not be accepted without explicit compatibility reason.
- Current mobile Loop mode persists Loop context locally but does not send it to
  the model. 3.3 must add an explicit context-aware helper rather than changing
  `sendCoach(tool, text)` to silently upload context.
- Keep provider tests deterministic. Do not perform live OpenAI calls.

## Exact recommended 3.2 implementation plan

1. Add failing backend tests first for Reality Check request validation, strict
   unknown-field rejection, safety scanning across envelope fields, safety
   provider-skip behavior, missing credentials, `/api/chat` absence, and
   `/api/coach/session` absence.
2. Add `artifacts/api-server/src/coach/contextEnvelope.ts` with no new
   dependency unless deliberately approved.
3. Add `artifacts/api-server/src/coach/promptContext.ts` or equivalent prompt
   rendering helper that emits ordered untrusted context blocks.
4. Add Reality Check schema/result definitions and a schema-shaped static safety
   fallback.
5. Add `POST /api/coach/reality-check` in `artifacts/api-server/src/routes/coach.ts`
   using the existing order: kill switch, passcode, validation, safety intercept,
   rate limit, credential selection, provider call.
6. Update `lib/api-spec/openapi.yaml` with the request/response/error/safety
   schema for Reality Check.
7. Run `pnpm --filter @workspace/api-spec run codegen` and include generated
   client/schema updates in the same 3.2 changeset.
8. Run API typecheck/tests and static guardrail searches.
9. Update docs only for facts that changed or were verified by the implementation.

## Phase 3.1 status

Phase 3.1 backend audit is verified after syncing local `main` to GitHub
`origin/main`, re-checking the front-door docs, route ownership, current
mobile/web callers, OpenAPI/Orval/generated files, and backend tests.
