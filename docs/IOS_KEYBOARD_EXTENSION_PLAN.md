# iOS Keyboard Extension Plan

Living architecture plan for the real WifeChat iOS custom keyboard extension.
This document is the native path source of truth for the committed Expo iOS
project and static custom keyboard scaffold. The current static milestone is a
one-box local preview keyboard with custom in-extension keys. API-backed
Generate remains deferred.

## Current Repo Evidence

- The Expo mobile package is `@workspace/wife-chat-mobile` and starts through
  `expo-router/entry` (`artifacts/wife-chat-mobile/package.json:2-10`).
- The Expo config sets `ios.supportsTablet=false` and bundle identifier
  `com.ajrhea.wifechat` (`artifacts/wife-chat-mobile/app.json`).
- The native iOS project is committed under `artifacts/wife-chat-mobile/ios`.
  Android native output remains uncommitted.
- The committed keyboard extension target is `WifeChatKeyboard`, with Swift
  entrypoint `artifacts/wife-chat-mobile/ios/WifeChatKeyboard/KeyboardViewController.swift`.
- The current keyboard scaffold is static/local only: one editable WifeChat
  message box, Warm / Direct / Short tone control, deterministic local preview
  generation, undo, Insert, and custom QWERTY keys. It does not call the backend.
- The current mobile API client sends `before-send` requests to the existing
  backend route only:
  `https://${EXPO_PUBLIC_DOMAIN}/api/coach/before-send`
  (`artifacts/wife-chat-mobile/lib/coach.ts:101-113`).
- The backend mounts only health and coach routers under `/api`
  (`artifacts/api-server/src/app.ts:79`,
  `artifacts/api-server/src/routes/index.ts:1-10`).
- V1 must keep using `POST /api/coach/before-send`
  (`artifacts/api-server/src/routes/coach.ts:537`). Do not add `/api/chat`,
  `/api/coach/session`, or any new backend route for keyboard V1.

## Why Expo Go Cannot Test This

Expo Go can run the JavaScript app, but an iOS custom keyboard is a native app
extension target packaged into the app bundle and configured through Xcode
entitlements and an extension `Info.plist`. Expo Go cannot add a keyboard
extension target to its own host app, cannot expose the target in iOS Settings,
and cannot test keyboard extension lifecycle behavior.

Testing this path requires a generated native iOS project and either:

- a local development build installed on an iPhone or simulator, or
- a TestFlight/App Store build after the native target is wired.

## Required Local Tooling

- macOS.
- Xcode with iOS SDK installed.
- An Apple Developer account/team for physical-device signing.
- Node/pnpm dependencies installed for this workspace.
- Expo prebuild run from `artifacts/wife-chat-mobile`.
- iPhone or iOS simulator for keyboard enablement testing. Network-backed
  keyboard behavior should be verified on a physical iPhone before release.

## Native Generation Policy

The generated iOS project is now committed because native keyboard extension
work requires Xcode-managed targets. Future Expo config changes may require
native diffs, Xcode project maintenance, signing coordination, and App Store
extension review.

Local generation commands:

```bash
pnpm --filter @workspace/wife-chat-mobile prebuild:ios
```

Clean regeneration command:

```bash
pnpm --filter @workspace/wife-chat-mobile prebuild:ios:clean
```

Use the clean command only when intentionally discarding generated native
changes. Do not run it over hand-edited native files without a review.

## Target Architecture

- Main app: Expo React Native app in `artifacts/wife-chat-mobile`.
- Native extension: Swift iOS Custom Keyboard Extension target inside the
  generated Xcode project.
- Shared backend contract: keyboard V1 calls the existing
  `POST /api/coach/before-send` route with `{ "message": "<user text>" }`.
- No OpenAI SDK, OpenAI key, or provider secret belongs in the mobile app or
  keyboard extension. The backend remains the only OpenAI caller.
- The keyboard extension owns only the text the user types or pastes into the
  keyboard UI. It must not inspect the host app's message thread.

## Bundle IDs

Current committed bundle IDs:

- Main app bundle ID: `com.ajrhea.wifechat`.
- Keyboard extension bundle ID: `com.ajrhea.wifechat.WifeChatKeyboard`.

The extension bundle identifier must be unique, nested under the app bundle ID
by convention, and reflected consistently in Xcode signing, provisioning
profiles, and App Store Connect.

## RequestsOpenAccess / Allow Full Access

An iOS keyboard extension can be installed without full access, but network
access for Generate requires `RequestsOpenAccess` in the keyboard extension
`Info.plist` and the user enabling "Allow Full Access" in iOS Settings.

The current static/local keyboard milestone keeps `RequestsOpenAccess=false`
and does not require Allow Full Access.

Production implication:

- Without full access, V1 should still let the user type locally and insert
  locally generated/static text if a no-network fallback exists.
- With full access enabled, the keyboard may call the WifeChat backend only
  after the user taps Generate.
- The UI and App Store privacy copy must clearly explain why full access is
  requested and what is sent.

## Privacy Promise

"Only text typed or pasted into the keyboard is sent after Generate."

For the current static/local milestone, Generate does not send text anywhere.
It only replaces the in-memory message box with a deterministic local preview.

Concrete rules:

- Do not send text as the user types.
- Do not read message threads from Messages, WhatsApp, or any host app.
- Do not auto-send messages.
- Do not store typed text unless the user explicitly saves it in a future flow.
- Do not log or persist relationship text from the keyboard extension.
- Do not include OpenAI keys or other server secrets in the app or extension.
- Insert only after the user taps Insert; final sending remains manual in the
  host app.

## V1 Scope

This is the intended network-backed V1 flow after static keyboard UX
verification, not the current static milestone:

1. User enables the WifeChat keyboard in iOS Settings.
2. User opens the WifeChat keyboard inside Messages, WhatsApp, or another text
   field host app.
3. User types or pastes their rough reply into the keyboard UI.
4. User chooses one direction: Warm, Direct, or Short.
5. User taps Generate.
6. Keyboard sends one request to `POST /api/coach/before-send` with only the
   typed/pasted draft text.
7. Keyboard displays the generated option matching the selected direction.
8. User taps Insert.
9. Keyboard inserts the selected text into the active message field.
10. User manually sends in the host app.

## Non-Goals

- No in-app fake keyboard mockup.
- No `/api/chat`.
- No `/api/coach/session`.
- No new backend route for V1.
- No backend safety/logging behavior changes.
- No direct OpenAI calls from mobile or the extension.
- No live keylogging.
- No thread reading or incoming-message analysis.
- No auto-send behavior.
- No Interpret mode in V1 beyond a visible "Coming soon" label if product
  wants it. Omission is acceptable.
- No App Groups data sharing in V1 unless explicitly scoped.
- No cloud history or saved relationship text.

## Initial Native Scaffold Sequence

Initial static scaffold status:

1. `pnpm --filter @workspace/wife-chat-mobile prebuild:ios` generated the iOS
   project.
2. The Xcode project is `artifacts/wife-chat-mobile/ios/WifeChat.xcodeproj`.
3. The Custom Keyboard Extension target is `WifeChatKeyboard`.
4. The first scaffold intentionally contains only static UI:
   - title: WifeChat
   - privacy line: "Only text you type here is used."
   - local draft text box
   - Warm / Direct / Short controls
   - Generate button disabled or locally mocked
   - Insert button inserts hardcoded sample text
5. Native comments state:
   - no thread reading
   - no auto-send
   - no live keylogging
   - no direct OpenAI calls
   - no secret storage
6. Build and install from Xcode.
7. Enable the keyboard in iOS Settings.
8. Verify hardcoded Insert works in Messages before adding the API call.

## Current Static Keyboard V2 Milestone

The current native keyboard implementation is still static/local and exists to
prove the usable keyboard loop before backend wiring:

1. The user types rough text into the WifeChat message box using custom
   in-extension QWERTY keys, paste, or hardware keyboard input.
2. The keyboard keeps typed text in memory only and synchronizes the `UITextView`
   with the in-memory current text.
3. Letter, Space, Delete, Return, and Shift mutate only WifeChat's current
   in-memory text. Delete does not mutate host app text.
4. Warm / Direct / Short selects the local preview style.
5. Generate is deterministic local scaffolding through
   `mockGenerateLocalPreview`. It does not use `URLSession`, an API client, a
   backend URL, or provider credentials.
6. Generate saves the exact original draft in memory, replaces the same message
   box with the local preview, and shows Undo.
7. Undo restores the exact original draft from memory.
8. Insert is the only path that writes to the host field, via
   `textDocumentProxy.insertText(currentText)`. It does not auto-send and does
   not clear the draft.
9. The globe key calls `advanceToNextInputMode()` and does not mutate WifeChat
   text or host text.

## API-Backed Reply Mode Plan

After the static target compiles and Insert is proven:

1. Add a small Swift API client inside the keyboard extension.
2. Read the backend domain from a non-secret app configuration source.
3. Require the user to tap Generate before any network request.
4. Send `POST /api/coach/before-send` with `Content-Type: application/json`
   and body `{ "message": draftText }`.
5. Include a client request ID header if/when the native client owns one, so
   support can correlate with backend `X-Request-Id`.
6. Parse the existing response envelope `{ tool, result }`.
7. Map directions:
   - Warm -> `result.softer`
   - Direct -> `result.direct`
   - Short -> `result.shortText`
8. Display backend errors without exposing provider internals.
9. Add a finite timeout and one user-initiated retry affordance. Do not retry
   automatically while the user edits text.
10. Keep all typed text in memory only unless a future explicit-save feature is
    approved.

## Future App Groups Plan

App Groups are deferred. Use them later only for non-secret, user-approved
state shared between the Expo app and keyboard extension, such as:

- selected tone preference,
- onboarding flag,
- backend environment/domain selection for internal builds,
- explicit saved snippets if a privacy-reviewed save flow exists.

Do not use App Groups to silently store draft relationship text. Do not store
OpenAI keys, passcodes, auth tokens, or provider secrets in App Groups.

## Future Interpret Mode Plan

Interpret mode is deferred because it implies incoming-message analysis and can
create privacy and safety risks if users believe WifeChat is reading threads or
diagnosing their partner.

Before building Interpret:

- define the exact user-provided input source,
- require explicit paste/type action from the user,
- avoid host-thread access,
- keep hedged language and no mind-reading,
- re-check backend safety tripwire coverage,
- update App Store privacy disclosure and in-app privacy copy.

## Verification Checklist

Committed static scaffold status:

- [x] Repo owner approved committing generated `ios/` output.
- [x] Bundle IDs are committed.
- [x] App and keyboard target build locally from the workspace with signing
      disabled.
- [ ] Keyboard target appears in iOS Settings.
- [ ] Keyboard opens in Messages and at least one third-party text field.
- [ ] Static custom keys append to the WifeChat message box.
- [ ] Static Generate replaces the message box with a local preview.
- [ ] Static Undo restores the original draft.
- [ ] Static Insert inserts the current WifeChat message text.
- [ ] Static Delete does not delete host app text.
- [ ] Globe/Next Keyboard switches input modes.
- [x] No API call exists in the first scaffold.
- [x] Native code contains no OpenAI key, passcode, or backend secret.
- [x] Native code comments document no thread reading, no auto-send, and no
      live keylogging.

Before API-backed V1 ships:

- [ ] Generate sends no text before the user taps Generate.
- [ ] Request body contains only text typed/pasted into the keyboard UI.
- [ ] No message thread or host app context is sent.
- [ ] Request uses existing `POST /api/coach/before-send`.
- [ ] No `/api/chat`, `/api/coach/session`, or new backend route exists.
- [ ] Backend tests pass.
- [ ] Static unsafe logging grep remains clean.
- [ ] User can Insert but must manually send.
- [ ] Full Access requirement is described accurately in product and App Store
      privacy copy.
