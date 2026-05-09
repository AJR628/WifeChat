# WifeChat Phase 2 Mobile Loop Shell Plan

## Goal
Build the mobile Loop shell using the Phase 1 local TypeScript models and AsyncStorage helpers, without changing runtime backend behavior.

Evidence inspected:
`README.md`, `replit.md`, `docs/PRODUCT_SSOT.md`, `docs/LOOP_PRODUCT_BUILD_SPEC.md`, `docs/IOS_KEYBOARD_EXTENSION_PLAN.md`, `docs/WIFECHAT_PRODUCTION_SAFETY_PLAN.md`, `artifacts/wife-chat-mobile/lib/loopModels.ts`, `artifacts/wife-chat-mobile/lib/storage.ts`, `artifacts/wife-chat-mobile/lib/coach.ts`, `artifacts/wife-chat-mobile/constants/tools.ts`, and all current files under `artifacts/wife-chat-mobile/app`.

## Current Wiring Summary
Mobile entrypoints today:
- `app/(tabs)/index.tsx`: tool-first Studio grid.
- `app/coach/[tool].tsx`: per-tool chat shell using `loadMessages`, `saveMessages`, `clearMessages`.
- `app/(tabs)/saved.tsx`: static placeholder saved categories.
- `app/(tabs)/rituals.tsx`: static Rituals list; Daily Check-In links to `/coach/checkin`.
- `app/(tabs)/profile.tsx`: local tone preference and privacy/about copy.
- `app/_layout.tsx`: only registers `(tabs)` and `coach/[tool]`.

Backend routes involved:
- Existing mobile API calls stay only in `artifacts/wife-chat-mobile/lib/coach.ts`.
- Supported mobile calls remain `POST /api/coach/before-send`, `POST /api/coach/repair`, and `POST /api/coach/checkin`.
- No `/api/chat`, no `/api/coach/session`, no route additions.

Proven risks/gaps:
- Product is still tool-first; no Open Loops shell exists.
- Loop models/storage exist, but no UI reads or writes them yet.
- Per-tool coach sessions are not Loop-anchored.
- Saved/Rituals/Profile copy still reflects pre-Loop placeholders.
- `planner` and `practice` remain `comingSoon`; do not enable them in Phase 2 because current mobile client only supports single-text bounded calls for three tools.

## Phase 2A: Open Loops + Start + Detail + Local Lifecycle
Expected files:
- Add `artifacts/wife-chat-mobile/lib/loopStore.ts`.
- Update `artifacts/wife-chat-mobile/app/_layout.tsx`.
- Update `artifacts/wife-chat-mobile/app/(tabs)/index.tsx`.
- Add `artifacts/wife-chat-mobile/app/loop/new.tsx`.
- Add `artifacts/wife-chat-mobile/app/loop/[id].tsx`.

Data flow:
- `loopStore.ts` wraps `loadLoops`/`saveLoops` with local-only helpers: `listLoops`, `getLoop`, `createLoop`, `updateLoop`, `closeLoop`.
- Helpers always load latest loops before save to reduce stale overwrites.
- New Loop defaults: `stage: "untangle"`, `status: "open"`, empty arrays for `generatedArtifacts` and `messages`, timestamps from `Date.now()`.
- Open Loops list shows statuses `open`, `paused`, `needsFollowUp`, `partlyResolved`, sorted by `updatedAt` desc.
- Closed statuses `resolved` and `letGo` remain accessible from Saved/Loop detail later, but are not primary on Studio.

UI states:
- Studio loading state while loops hydrate.
- Empty Open Loops state with Start a Loop CTA.
- Non-empty Open Loops list with title, stage, status, updated date, and next step preview.
- Start form fields: title, what happened, emotion, interpretation, need, considering doing, next step, relationship type.
- Detail state: not found, loading, editable Loop fields, stage/status controls, generated artifacts list placeholder, close/let-go/pause actions.
- Save buttons disabled while local save is in progress.
- No AI action in 2A.

Acceptance criteria:
- User can create a Loop locally and return to Studio to see it under Open Loops.
- User can open Loop detail, edit fields, change stage/status, pause, mark needs follow-up, resolve, or let go.
- Closing a Loop removes it from Open Loops without deleting it.
- Malformed stored Loop JSON does not crash startup because Phase 1 storage guards are used.
- Existing tool cards may remain below Open Loops as secondary quick tools, unchanged until 2B.

Tests/checks:
- `pnpm --filter @workspace/wife-chat-mobile typecheck`.
- Manual: fresh install empty state, create Loop, app reload, edit Loop, close Loop, reopened detail not found behavior.
- Static grep guardrails listed in the final verification section.

Docs:
- Update `docs/LOOP_PRODUCT_BUILD_SPEC.md` only if route names, statuses, or local lifecycle behavior differ from the current build spec.

Risks:
- AsyncStorage writes are not transactional; `loopStore.ts` should always read latest before writing and avoid broad overwrites.
- Save helpers currently swallow persistence errors, so UI cannot reliably distinguish failed disk writes.

## Phase 2B: Existing Coach Tools As Loop Actions
Expected files:
- Update `artifacts/wife-chat-mobile/app/loop/[id].tsx`.
- Update `artifacts/wife-chat-mobile/app/coach/[tool].tsx`.
- Reuse `artifacts/wife-chat-mobile/lib/coach.ts` unchanged.
- Reuse `artifacts/wife-chat-mobile/constants/tools.ts` unchanged unless only presentation labels are needed.

Data flow:
- Loop detail shows action cards for `before-send`, `repair`, and `checkin`.
- Action cards route to existing `coach/[tool]` with optional `loopId`.
- If no `loopId`, current per-tool message storage behavior remains unchanged.
- If `loopId` exists, `coach/[tool]` hydrates messages from that Loop’s `messages` filtered by `sourceTool`.
- Successful sends still call `sendCoach(toolKey, text)` exactly as today.
- After successful assistant reply in Loop mode, append local `LoopMessage` records for user and assistant messages and append one `GeneratedArtifact` with `sourceTool`, `title`, `createdAt`, and payload `{ text: replyText }`.
- Failed sends do not write Loop messages or artifacts.
- No loop/profile context is sent to the API in Phase 2.

UI states:
- Coach header shows existing tool title plus a small Loop context subtitle when `loopId` is present.
- Loop mode has a back path to Loop detail.
- Coming-soon tools remain disabled.
- Planner remains disabled because mobile lacks the structured `/api/coach/planner` payload UI.
- Practice remains disabled because no approved bounded route exists.

Acceptance criteria:
- Direct `/coach/before-send`, `/coach/repair`, and `/coach/checkin` still work and persist per-tool history as before.
- Loop-launched coach actions persist local messages/artifacts into the selected Loop.
- Existing API request path, body, headers, timeout behavior, and error handling in `lib/coach.ts` are unchanged.
- No implicit auto-stage transitions; user controls Loop stage/status manually.

Tests/checks:
- `pnpm --filter @workspace/wife-chat-mobile typecheck`.
- Manual: direct coach session still uses per-tool history; Loop-launched coach session writes to Loop; failed network send rolls back visible user message and does not persist artifact.
- Grep diff to confirm `lib/coach.ts`, backend routes, OpenAPI/codegen, and generated clients were not changed.

Docs:
- Update `docs/LOOP_PRODUCT_BUILD_SPEC.md` if the exact Loop artifact payload or direct-vs-Loop coach behavior should be documented.

Risks:
- `coach/[tool]` will have two persistence modes; keep branching explicit and isolated to avoid mixing per-tool history with Loop messages.
- Loop artifacts store formatted assistant text locally; privacy copy must continue to say local-only unless user taps an AI action.

## Phase 2C: Saved/Rituals/Profile Reframing + Clear Local Data
Expected files:
- Update `artifacts/wife-chat-mobile/app/(tabs)/saved.tsx`.
- Update `artifacts/wife-chat-mobile/app/(tabs)/rituals.tsx`.
- Update `artifacts/wife-chat-mobile/app/(tabs)/profile.tsx`.
- Possibly update `artifacts/wife-chat-mobile/app/(tabs)/_layout.tsx` if tab label changes from Rituals to Maintenance.

Data flow:
- Saved screen loads loops, relationship profiles, saved lessons, and reminders using Phase 1 helpers.
- Saved sections become: Loops, Profiles, Saved Lessons, Drafts.
- Rituals becomes Maintenance Mode and reads relationship profiles; if none exist, show an empty state instead of implying active personalized maintenance.
- Daily Check-In can remain as an available action, still routing to existing `/coach/checkin`.
- Profile screen adds clear local data UX using `clearAllWifeChatLocalData`.
- Clear local data wipes all `wife_chat_` keys, including loops, profiles, lessons, reminders, tone, and per-tool sessions.

UI states:
- Saved loading, empty, and counted section states.
- Saved Loop rows route to Loop detail.
- Maintenance Mode empty profile state and available Daily Check-In state.
- Profile clear-data confirmation, destructive action, clearing state, and post-clear reset to default tone.
- Web confirmation should not silently clear; use a web-compatible confirm path.

Acceptance criteria:
- Saved no longer claims saving is “coming soon” for Loops once Loops are live.
- Maintenance copy does not imply partner scoring, diagnosis, surveillance, or mind-reading.
- Clear all local data requires explicit confirmation and does not affect any backend/cloud state.
- After clear-all, Studio shows no Open Loops, Saved counts reset, Profile tone returns to balanced, and coach histories are gone.
- No analytics, logging, cloud sync, API calls, or native keyboard changes.

Tests/checks:
- `pnpm --filter @workspace/wife-chat-mobile typecheck`.
- Manual: create Loop, verify Saved count/detail link, clear data, restart app, verify no local WifeChat data remains visible.
- Static grep for unsafe logging and prohibited routes.

Docs:
- Update `replit.md` user-facing privacy guidance if clear-local-data UX ships.
- Update `docs/LOOP_PRODUCT_BUILD_SPEC.md` Phase 2 status/notes if tab naming or clear-data behavior differs from the spec.
- README only needs an update if front-door guidance changes, which is not expected for Phase 2.

## Final Verification For All Phase 2
Run:
```bash
pnpm --filter @workspace/wife-chat-mobile typecheck
rg -n "api/chat|/api/coach/session" README.md docs replit.md artifacts
rg -n "OPENAI_API_KEY|AI_INTEGRATIONS|APP_PASSCODE|OpenAI|x-app-passcode" artifacts/wife-chat-mobile
rg -n "console\\.|logger|analytics|captureException|captureMessage" artifacts/wife-chat-mobile/app artifacts/wife-chat-mobile/lib
git diff --name-only -- artifacts/api-server artifacts/wife-chat-mobile/ios artifacts/api-client-react artifacts/api-spec
```

Expected:
- Typecheck passes.
- No live `/api/chat` or `/api/coach/session` route additions.
- No mobile/native secrets.
- No unsafe relationship-text logging.
- No backend, OpenAPI/codegen, generated client, or native keyboard diffs.

## Assumptions
- Phase 2 does not create profile-editing CRUD beyond displaying/reframing existing stored profile data and clear-local-data UX.
- Reality Check remains Phase 3, not Phase 2.
- Planner and Practice remain disabled on mobile until their bounded contracts/UI are explicitly scoped.
- Existing coach API calls are preserved by leaving `lib/coach.ts` unchanged.
