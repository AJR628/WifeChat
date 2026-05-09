# WifeChat Product SSOT

## Purpose

This document is the product source of truth for WifeChat. It should guide future product, API, mobile, web, keyboard, copy, prompt, onboarding, and monetization work.

When this document conflicts with a proposed feature idea, preserve the smaller, safer, more focused path unless the product direction is intentionally changed and this document is updated in the same change.

## One-line definition

**WifeChat is a private perspective and communication coach that helps users work through emotionally confusing relationship moments, communicate clearly, and close the loop in real life.**

## Core promise

**See it clearly. Say it well. Close the loop.**

WifeChat is not mainly about generating nicer text. It is about helping a user stop spinning, understand what is happening, decide what to do next, communicate in their own voice, and follow through.

## Product category

WifeChat is a **relationship perspective and communication app**.

It is not:

- a therapy replacement
- a crisis service
- a generic chatbot
- a generic AI writing keyboard
- a relationship scoring app
- a partner tracker
- a persuasion or manipulation tool
- a social network

## Primary target user

WifeChat is for people who care about their relationships but get emotionally tangled when something feels hurtful, confusing, unfair, tense, or unresolved.

The primary user may:

- second-guess whether they are overreacting or underreacting
- overthink texts or difficult conversations
- avoid conflict until resentment builds
- overexplain when anxious
- get defensive when they feel blamed
- apologize too quickly or take too much responsibility
- struggle to set clear boundaries
- want private perspective before asking friends, Reddit, or a general AI chat
- want help communicating in a way that still sounds like them

The wedge is not “everyone in a relationship.” The wedge is:

**People who emotionally spiral, avoid, or overthink after a relational moment and want private guidance before they react.**

## Core emotional job

When I feel upset, confused, guilty, defensive, hurt, or unsure about a relationship moment, help me understand it clearly, choose a grounded next step, and say what I need to say without making it worse.

## Core product object: Loop

A **Loop** is one unresolved relationship moment the user wants to understand, respond to, repair, practice, follow up on, or let go.

Loops are the product center. Chat can exist inside a Loop, but the app should not become a blank chatbot.

A Loop may include:

- title
- person/profile
- relationship type
- what happened
- current emotion
- user’s interpretation
- what the user wants or needs
- what the user is considering doing
- current stage
- next step
- generated drafts/plans
- follow-up reminders
- saved lesson
- outcome

Loop stages:

1. **Untangle** — what happened, how the user feels, what may be reasonable, what may need caution.
2. **Decide** — choose whether to text, talk, wait, repair, set a boundary, disengage, or get support.
3. **Prepare** — write the message, plan the conversation, or practice possible responses.
4. **Act** — the real-life step happens outside the app. The app never auto-sends.
5. **Close** — mark resolved, partly resolved, let go, paused, or needs follow-up.

## Core modes

### Open Loop Mode

Used when something feels unresolved.

Open Loop Mode helps the user:

- reality-check their reaction
- clarify what they need
- separate facts from assumptions
- spot boundaries or safety concerns
- decide whether communication is appropriate
- prepare a message or conversation
- practice likely responses
- close the loop after real-life action

### Maintenance Mode

Used when there is no active issue for a saved person/profile.

Maintenance Mode helps the user:

- send a thoughtful check-in
- follow up on something important
- express appreciation
- practice a healthier communication pattern
- review saved lessons
- keep the relationship tended when things are good

Maintenance Mode should not create drama. It should help users communicate consistently, warmly, and intentionally.

## Canonical feature hierarchy

1. **Reality Check**
   - Helps the user answer: “Am I overreacting, underreacting, or seeing this clearly?”
   - Should provide calibrated perspective, not reckless certainty.
   - Should validate feelings without blindly validating every interpretation.

2. **Before You Send**
   - Helps the user improve a draft before sending.
   - Should catch harshness, defensiveness, blame, unclear requests, overexplaining, passive aggression, or unnecessary escalation.
   - Final sending always remains manual by the user.

3. **Repair After a Fight**
   - Helps the user reconnect after hurt, tension, or conflict.
   - Should favor ownership, clarity, sincerity, and repair over winning.

4. **Plan a Hard Conversation**
   - Helps the user prepare for a difficult conversation.
   - Should clarify goal, fear, boundary, opening line, talking points, and clean next step.

5. **Practice Conversation**
   - Helps the user rehearse likely responses inside a specific Loop.
   - Should help the user stay grounded without pretending to know exactly what the other person will say.

6. **Daily / Maintenance Check-In**
   - Helps the user stay intentional when no Loop is active.
   - Should be lightweight, practical, and tied to saved profiles or reminders.

7. **Relationship Profiles**
   - User-created, user-approved context for specific people.
   - Should never be created from hidden scraping, host-app message reading, or surveillance.

8. **Save What Worked**
   - Lets the user save useful lessons from a Loop.
   - These lessons can personalize future coaching when explicitly selected or associated with a profile.

9. **Follow-Up Reminders**
   - Helps the user return to real-life next steps.
   - Examples: check back tomorrow, ask how it went, send repair tonight, follow up after appointment.

## Personalization model

Personalization is the core moat, but it must be controlled, editable, and privacy-first.

WifeChat must personalize through structured, user-approved context. The LLM must not be allowed to invent or rewrite the user’s system prompt freely.

The context stack should be:

1. **Fixed WifeChat system/safety prompt**
2. **User Communication Profile**
3. **Voice Profile**
4. **Selected Relationship Profile**
5. **Current Loop context**
6. **Current request**

The fixed WifeChat system/safety prompt remains product-owned and must preserve safety boundaries.

### User Communication Profile

Captures how the user tends to react and how they want WifeChat to coach them.

May include:

- conflict pattern: shuts down, overexplains, gets defensive, apologizes too quickly, avoids, sends too much, gets sarcastic, spirals privately
- growth goal: calmer, clearer, warmer, more direct, less reactive, better boundaries, better repair
- coaching preference: gentle, direct, encouraging, no-nonsense, short and practical, deeper and reflective
- user rules: do not just validate me, do not talk down to me, tell me when I may be escalating, help me find the clean next step

### Voice Profile

Captures how the user naturally writes.

May include:

- casual vs polished
- short vs detailed
- warm vs direct
- emoji preference
- humor preference
- apology style
- boundary style
- phrases to avoid
- no corporate tone
- no therapy-speak in final messages

Coach voice and message voice are separate:

- **Coach voice** can be calm, structured, reflective, and clear.
- **Message voice** should sound like the user, not like a therapist, HR memo, or generic AI.

### Relationship Profile

Captures user-approved context about a specific person or relationship.

May include:

- relationship type
- preferred tone with this person
- what helps communication
- what usually makes things worse
- current context
- common loop/pattern
- best repair style
- saved lessons

Relationship profiles must not imply mind-reading. The app may say “based on what you saved about this relationship,” not “they definitely feel…”

## Product coaching stance

WifeChat should consistently follow this stance:

**Validate the feeling. Question the interpretation. Clarify the need. Suggest the next step.**

This means:

- Feelings can be real even when interpretations are incomplete.
- The app should not automatically side with the user or the other person.
- The app should avoid reckless certainty.
- The app should offer calibrated perspective and practical next steps.
- The app should be respectful, never demeaning, and never shame the user for asking.

Good example:

> “It makes sense that this bothered you. I would be careful not to assume intent yet, though. The clearer issue is that you need consistency and acknowledgment. I’d keep the next message short and specific.”

Bad examples:

> “They are toxic. Leave them.”

> “You are definitely overreacting.”

> “Just communicate openly and honestly.”

## Interaction model

WifeChat may include chat, but chat must be anchored to a Loop, selected profile, structured result, saved context, or follow-up action.

The app should start structured and continue conversationally.

Preferred flow:

1. User creates or opens a Loop.
2. User answers guided questions.
3. WifeChat returns structured perspective.
4. User chooses a next step.
5. Follow-up chat helps refine, practice, or close the Loop.

Avoid:

- blank generic chatbot as the main surface
- open-ended infinite rumination
- unbounded “what if…” spirals
- generic advice with no next step

The app should gently move the user toward enough clarity to act or let go.

## Onboarding strategy

Do not require a long intake form before the user feels value.

Use progressive onboarding:

1. **First launch** — ask a small number of questions to create a starter communication lens.
2. **First Loop** — let the user experience the product quickly.
3. **After useful output** — ask whether to save a profile note, voice note, or communication lesson.
4. **Over time** — build User Communication Profile, Voice Profile, and Relationship Profiles from explicit user-approved saves.

Suggested first-launch questions:

- “When conflict happens, I tend to…”
- “I want WifeChat to help me be more…”
- “How should WifeChat coach you?”
- “How should final messages sound?”
- “Do you want to create a person/profile now or start with a Loop?”

## Privacy and data boundaries

WifeChat is privacy-first, but copy must stay truthful.

Rules:

- Do not claim “nothing is sent” when cloud AI coaching sends text to the WifeChat API and AI provider.
- Do not log raw relationship text, generated relationship content, raw provider responses, passcodes, auth headers, cookies, API keys, or full request bodies.
- Do not read host app message threads.
- Do not scrape contacts or messages.
- Do not auto-send messages.
- Do not persist typed draft text in the keyboard extension.
- User-created local Loops, profiles, saved lessons, and reminders should remain user-controlled.
- Provider retention behavior must not be claimed unless verified and documented.

## Safety boundaries

WifeChat must not:

- diagnose the user, partner, spouse, friend, family member, or coworker
- claim to know what another person thinks or feels
- encourage manipulation, coercion, stalking, threats, guilt, control, or pressure
- frame itself as therapy, legal advice, medical advice, emergency support, or crisis support
- encourage users to stay in unsafe situations
- produce messages designed to punish, shame, trap, or control another person

When safety language appears, WifeChat should prioritize safety guidance over message generation.

Safety-sensitive situations may include:

- self-harm
- violence
- threats
- coercion
- stalking
- fear
- abuse
- crisis language

The safest answer may be: do not send a message, get support, contact emergency resources, document what happened, or use crisis resources.

## Keyboard extension role

The keyboard extension is a companion surface, not the product center.

It should support quick “Before You Send” use cases:

- simple rewrite
- soften
- clarify
- shorten
- repair tone
- insert selected result

Keyboard rules:

- no host app thread reading
- no auto-send
- no live keylogging
- no direct OpenAI calls
- no secrets in the extension
- no network request before the user taps Generate
- final sending remains manual

On capable devices, simple on-device/system-model rewriting may remain available even without cloud coaching, but deep Loop guidance requires the main app/coaching flow.

## Monetization posture

WifeChat should use a simple paid model.

Preferred launch posture:

- paid subscription app
- full-experience free trial
- user-created local content remains accessible after trial expiration
- cloud AI coaching requires active subscription after trial
- simple on-device rewrite may remain available on supported devices
- no lifetime unlimited AI
- no public token language in the UI

Use an internal monthly guidance allowance / capacity meter if needed.

Cost control must not come from shallow, generic answers. Cost control should come from:

- bounded Loop flows
- structured outputs
- context summaries
- model routing behind the scenes
- rate limits
- monthly guidance allowance
- no unlimited cloud AI promises

## UI/UX principles

The UI/UX is make-or-break.

WifeChat should feel:

- calm
- private
- mature
- practical
- warm
- emotionally grounded
- structured but not clinical
- personal but not creepy

It should not feel:

- like a generic chatbot
- like Reddit in app form
- like therapy cosplay
- like HR language
- like a moral judge
- like a relationship scoreboard
- like a manipulation playbook

Progress tracking should reward healthy follow-through, not drama.

Good metrics:

- Loops closed
- repairs attempted
- boundaries practiced
- follow-ups completed
- pauses before reacting
- maintenance check-ins sent
- hard conversations prepared

Avoid relationship scores, partner scores, compatibility scores, or anything that appears to grade another person.

## Feature decision filter

Before adding a feature, ask:

1. Does this help the user understand, communicate about, or close a real relationship Loop?
2. Does it reduce spiraling, avoidance, escalation, regret, or confusion?
3. Does it preserve privacy and safety boundaries?
4. Does it make the app more personal without becoming creepy?
5. Does it help the user act in real life, not just generate more text?
6. Can it be explained clearly to an App Store reviewer?
7. Would it still be useful if the keyboard extension did not exist?

If mostly no, defer it.

## Agent implementation rules

Future agents must:

- audit relevant files before changing behavior
- preserve this product direction unless explicitly instructed otherwise
- keep prompts, UI copy, API contracts, mobile UX, and docs aligned with this SSOT
- avoid adding generic `/api/chat` or free-form chat escape hatches
- avoid adding therapy, diagnosis, partner-scoring, surveillance, or manipulation features
- keep privacy claims truthful
- update this document when a product change intentionally alters the direction

## Working tagline options

- See it clearly. Say it well. Close the loop.
- Get perspective before you react.
- For the conversations you keep replaying in your head.
- Untangle the moment before you respond.
- A private coach for hard relationship moments.

## Current product north star

WifeChat should make the user feel:

> “This app gets me, but it does not just agree with me. It helped me stop spinning, see the moment more clearly, and choose a next step I can feel good about.”
