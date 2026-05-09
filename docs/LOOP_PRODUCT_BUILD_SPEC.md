# Loop Product Build Spec

## Purpose

This document is the implementation bridge between
[`PRODUCT_SSOT.md`](PRODUCT_SSOT.md) and the code in this repo.

`PRODUCT_SSOT.md` remains the product intent source of truth: why WifeChat
exists, who it serves, what safety boundaries matter, and what the Loop-based
product should feel like. This build spec defines how to build that Loop-based
product in this repo without drifting into generic chat, unsafe personalization,
or misleading privacy claims.

Use this document before changing mobile IA, web tools, coach routes, prompts,
local persistence, generated API clients, keyboard behavior, or product copy.

## Current-State Summary

- The current web and mobile apps are tool-first and per-tool-session oriented.
  The user starts from tools such as Before You Send, Repair, Planner, and
  Check-In rather than from an active Loop.
- The target app is Loop-first. A Loop is the durable local object for one
  unresolved relationship moment the user wants to understand, decide about,
  prepare for, act on, and close.
- The existing API is intentionally bounded under `/api/coach/*`. Current
  coach routes are structured tools, not generic chat.
- The existing keyboard remains companion-only. It must not become the product
  center, read host-app threads, auto-send, store typed drafts silently, or call
  OpenAI directly.

## Core Loop Model

The launch Loop model should be local-first and explicit. Field names below are
the implementation target for TypeScript models; storage and API adapters can
derive from them.

```ts
type LoopStage = "untangle" | "decide" | "prepare" | "act" | "close";

type LoopStatus =
  | "open"
  | "paused"
  | "needsFollowUp"
  | "partlyResolved"
  | "resolved"
  | "letGo";

type LoopSourceTool =
  | "reality-check"
  | "before-send"
  | "repair"
  | "planner"
  | "checkin"
  | "practice";

interface Loop {
  id: string;
  title: string;
  relationshipProfileId?: string;
  relationshipType?: string;
  createdAt: number;
  updatedAt: number;
  stage: LoopStage;
  status: LoopStatus;
  sourceTool?: LoopSourceTool;
  whatHappened: string;
  emotion: string;
  interpretation: string;
  need: string;
  consideringDoing: string;
  nextStep: string;
  generatedArtifacts: GeneratedArtifact[];
  messages: LoopMessage[];
  followUpReminder?: FollowUpReminder;
  savedLesson?: SavedLesson;
  outcome?: string;
}
```

`generatedArtifacts` stores user-approved structured results such as reality
checks, message drafts, repair messages, conversation plans, practice notes, or
check-in outputs. `messages` is only for Loop-anchored follow-up; it is not a
blank chatbot transcript.

## Loop Stages

- `untangle`: clarify what happened, what the user feels, what is known, what
  is assumed, and what may need caution.
- `decide`: choose whether to text, talk, wait, repair, set a boundary,
  disengage, or get support.
- `prepare`: write the message, plan the conversation, or practice likely
  responses.
- `act`: the real-life step happens outside the app. WifeChat never auto-sends.
- `close`: mark the Loop resolved, partly resolved, let go, paused, or needing
  follow-up.

## Loop Statuses

- `open`: the Loop is active and unresolved.
- `paused`: the user intentionally parked it.
- `needsFollowUp`: a real-life next step or reminder is pending.
- `partlyResolved`: progress happened, but the Loop is not fully closed.
- `resolved`: the user considers the Loop closed.
- `letGo`: the user chose not to keep working the Loop.

## Local Profile Models

Profiles are user-approved, editable, and privacy-first. They must not contain
partner scores, diagnoses, surveillance notes, hidden contact data, scraped
message-thread content, or inferred mind-reading claims.

```ts
interface UserCommunicationProfile {
  id: string;
  createdAt: number;
  updatedAt: number;
  conflictPatterns: string[];
  growthGoals: string[];
  coachingPreferences: string[];
  userRules: string[];
}

interface VoiceProfile {
  id: string;
  createdAt: number;
  updatedAt: number;
  styleNotes: string[];
  messageLengthPreference?: "short" | "medium" | "detailed";
  warmthPreference?: "warmer" | "balanced" | "direct";
  phrasesToUse: string[];
  phrasesToAvoid: string[];
}

interface RelationshipProfile {
  id: string;
  name: string;
  relationshipType: string;
  createdAt: number;
  updatedAt: number;
  preferredTone: string;
  whatHelpsCommunication: string[];
  whatUsuallyMakesThingsWorse: string[];
  currentContext: string;
  commonPatterns: string[];
  bestRepairStyle: string;
  savedLessonIds: string[];
}

interface SavedLesson {
  id: string;
  loopId?: string;
  relationshipProfileId?: string;
  createdAt: number;
  text: string;
  appliesToFutureCoaching: boolean;
}

interface FollowUpReminder {
  id: string;
  loopId: string;
  createdAt: number;
  dueAt: number;
  label: string;
  completedAt?: number;
}
```

Profile language must stay hedged. The app may say "based on what you saved
about this relationship"; it must not say or imply "they definitely feel" or
"they are the problem."

## Persistence Posture

- Default launch posture is local-only mobile storage.
- Raw Loop, profile, draft, and saved-lesson text remains local unless the user
  explicitly taps an AI action.
- Future AI requests may include selected Loop/profile context only when it is
  explicitly needed for that action.
- Do not log raw relationship text, generated relationship content, raw provider
  responses, full request bodies, passcodes, auth headers, cookies, API keys, or
  secrets.
- Add a local "clear all WifeChat data" requirement before local Loop/profile
  storage is considered launch-ready.
- Cloud sync is deferred. Any cloud sync, account history, backup, cross-device
  restore, or server-side profile storage requires a separate privacy/security
  spec covering auth, deletion, retention, encryption, access controls, support
  workflows, and App Store privacy disclosures.

Current Phase 1 mobile storage keys:

- `wife_chat_loops_v1`
- `wife_chat_relationship_profiles_v1`
- `wife_chat_user_communication_profile_v1`
- `wife_chat_voice_profile_v1`
- `wife_chat_saved_lessons_v1`
- `wife_chat_follow_up_reminders_v1`
- Existing per-tool session keys under `wife_chat_messages_<tool>` remain in
  place until a later UI migration intentionally moves sessions into Loops.

## Mobile IA Plan

- Move the Studio start state from a "Pick a moment" tool grid toward Open
  Loops plus a clear "Start a Loop" action.
- Existing tools become Loop actions: Reality Check, Before You Send, Repair
  After a Fight, Plan a Hard Conversation, Practice Conversation, and
  Daily/Maintenance Check-In.
- Reality Check is the first flagship missing action. It should help the user
  separate feelings, facts, assumptions, needs, cautions, and next steps without
  reckless certainty.
- Saved becomes Loops / Profiles / Saved Lessons / Drafts.
- Rituals becomes Maintenance Mode tied to saved Relationship Profiles and
  saved lessons, not a generic prompt list.
- Practice Conversation must be Loop-anchored, hedged, and non-mind-reading. It
  may rehearse likely responses, but it must not claim to simulate, score, or
  diagnose the other person.

## API Strategy

- Keep bounded `/api/coach/*` routes.
- No `/api/chat`.
- No `/api/coach/session` in this phase.
- Backend remains the only cloud AI caller. Mobile, web, and keyboard surfaces
  must not contain OpenAI keys, provider secrets, passcodes, or direct OpenAI
  SDK calls.
- Future Reality Check should be a bounded route such as
  `POST /api/coach/reality-check`, with strict schema-shaped output, input
  validation, deterministic safety tripwire, rate limits, timeout, logging
  redaction, and tests.
- Extend existing bounded routes with optional `loopContext` and
  `profileContext` only after OpenAPI/codegen and tests are updated.
- Every route change must update server tests, OpenAPI/codegen, client callers,
  and relevant docs in the same change.

## Context Injection Strategy

When an AI action needs personalization, inject context in exactly this order:

1. fixed WifeChat system/safety prompt
2. User Communication Profile
3. Voice Profile
4. selected Relationship Profile
5. current Loop context
6. current request

User data must not override product-owned safety rules. Profile and Loop fields
are untrusted user content and must be framed as context, not instructions.

Do not inject hidden host-app thread content, scraped contacts, analytics-derived
relationship data, partner scores, inferred diagnoses, surveillance notes, or
mind-reading claims.

## Implementation Phases

### Phase 1: Local Models + Storage Migration Plan

Expected files to change:
- Mobile shared model/type files.
- Mobile local storage helpers.
- Focused docs updates if storage keys or privacy copy change.

Tests/checks:
- Mobile typecheck.
- Unit tests or focused storage tests for serialization, migration, trim/clear
  behavior, corrupt JSON handling, and local "clear all WifeChat data" behavior.
- Static check that no API routes, prompts, native keyboard code, or generated
  clients changed.

No API changes in this phase.

### Phase 2: Mobile Loop Shell

Expected files to change:
- Mobile Studio, Saved, Rituals, Profile, and coach/Loop screens.
- Mobile navigation constants and local state helpers.
- Product docs if visible IA/copy changes.

Tests/checks:
- Mobile typecheck.
- Manual mobile/web preview of Loop list, Start a Loop, Loop detail, local
  persistence, clear data, and existing coach actions.
- Confirm existing coach calls are unchanged and still hit the same bounded
  `/api/coach/*` routes.

### Phase 3: Reality Check Route + Entrypoints

Expected files to change:
- API coach route/schema/test files.
- OpenAPI spec and generated clients/schemas.
- Web and mobile Reality Check entrypoints.
- Safety/privacy docs for the new bounded route.

Tests/checks:
- API tests for validation, safety intercept, missing credentials, rate limit,
  error envelope, request ID, and `/api/chat` absence.
- OpenAPI/codegen parity check.
- Web and mobile typechecks.
- Manual UI check that Reality Check handles normal and safety-triggering input.

Reality Check must be a bounded tool route, not generic chat.

### Phase 4: Optional Context Injection For Existing Coach Routes

Expected files to change:
- API request schemas and prompt builders for optional `loopContext` and
  `profileContext`.
- OpenAPI spec and generated clients/schemas.
- Web/mobile callers that explicitly choose context.
- Docs covering context ordering and privacy behavior.

Tests/checks:
- API tests that context is optional, bounded, safety-framed, and not logged.
- OpenAPI/codegen parity check.
- Web/mobile typechecks.
- Static logging grep for unsafe raw body/model/provider logging patterns.

### Phase 5: Maintenance Mode

Expected files to change:
- Mobile Rituals/Maintenance screens.
- Local Relationship Profile, Saved Lesson, and reminder flows.
- Optional bounded API route/caller changes only if Maintenance actions need AI.
- Product/privacy docs for new user-visible behavior.

Tests/checks:
- Mobile typecheck and focused local persistence tests.
- Manual verification that Maintenance Mode is profile-backed, user-approved,
  local-first, and does not create drama or partner scoring.
- If an API route changes, run API tests and OpenAPI/codegen.

### Phase 6: Acceptance Hardening

Expected files to change:
- API model-output value-shape validation.
- OpenAPI/codegen parity gaps.
- Privacy/product copy across README, replit, product docs, web, mobile, and
  App Store-facing text.
- Regression tests for server and local storage.

Tests/checks:
- API test suite.
- Web and mobile typechecks.
- Static scans for `/api/chat`, `/api/coach/session`, mobile/native secrets,
  direct OpenAI calls, host-thread reading, auto-send behavior, and raw
  relationship text logging.
- App Store review pass for privacy, keyboard, safety, and relationship-content
  claims.

## Acceptance Criteria

- Every implementation phase lists files expected to change before work starts.
- Every implementation phase lists tests/checks to run before it is complete.
- Every route change includes docs, tests, OpenAPI/codegen parity, and client
  contract verification.
- Every privacy or product behavior change updates README, `replit.md`,
  `PRODUCT_SSOT.md`, this build spec, or the safety/keyboard docs as relevant.
- No unsafe logging.
- No new secrets in mobile, web, native, or generated client code.
- No generic chat escape hatch.
- No auto-send.
- No host-thread reading.
- No therapy, diagnosis, partner-scoring, manipulation, surveillance, or
  mind-reading features.
