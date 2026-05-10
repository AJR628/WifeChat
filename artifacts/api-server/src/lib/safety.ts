// Phase 4 — Deterministic Safety Intercept.
//
// This module is a FAIL-SAFE TRIPWIRE, NOT A CLASSIFIER. It runs locally,
// before any OpenAI call, on the validated user-supplied text fields of
// every /api/coach/* request. If it trips, the route returns a static,
// schema-shaped, safety-oriented response and never contacts OpenAI.
//
// Design rules (do not relax without a written reason):
//   - Local-only: no model call, no external API, no new dependency.
//   - Conservative: a small regex/keyword set targeting unambiguous
//     crisis language (self-harm, partner violence, threats to kill or
//     hurt, sexual coercion, stalking/control, fear for personal safety).
//   - False negatives are accepted. The model layer + prompt remain a
//     second line of defense; this tripwire is the bottom line.
//   - False positives are tolerated. The static response is gentle,
//     non-judgmental, and offers crisis resources — the cost of a wrong
//     trigger is an extra hotline reminder, not harm.
//   - Privacy: the tripwire never logs or returns the matched text or
//     the matched regex. Callers log only `{ event, category, tool,
//     requestId }` (see coach.ts).
//   - Avoids broad triggers on common conflict words ("fight", "argue",
//     "angry", "upset", "hate this", "I'm hurt") unless they appear
//     alongside violence / threat / fear / coercion / stalking phrasing.
//
// Locale note: hotline numbers in the static responses are US defaults
// (988 Suicide & Crisis Lifeline; National Domestic Violence Hotline
// 1-800-799-7233). Locale-aware crisis routing remains deferred (R16
// in the safety plan) — not in scope for Phase 4.

export type SafetyTripwireCategory =
  | "self_harm"
  | "violence"
  | "coercion"
  | "stalking"
  | "fear"
  | "threats";

export type SafetyTripwireResult =
  | { tripped: false }
  | { tripped: true; category: SafetyTripwireCategory };

// Patterns are checked in priority order: a self_harm match outranks a
// violence match outranks a threats match, etc. The first hit wins so
// the static response is the most acute one for the user.
//
// Each pattern is intentionally narrow. Examples that should NOT trip:
//   - "we had a fight last night"
//   - "I'm so angry"
//   - "I hate this"
//   - "he upset me"
//   - "I'm hurt by what he said"
// Examples that SHOULD trip (one per category) are exercised in the
// Phase 4 manual verification commands in the safety plan.
const PATTERNS: ReadonlyArray<{ category: SafetyTripwireCategory; re: RegExp }> = [
  // --- self_harm ---
  { category: "self_harm", re: /\b(?:kill|hurt|harm)\s+myself\b/i },
  { category: "self_harm", re: /\bend(?:ing)?\s+my\s+(?:own\s+)?life\b/i },
  { category: "self_harm", re: /\b(?:commit\s+)?suicid(?:e|al)\b/i },
  { category: "self_harm", re: /\bi\s+(?:want|wanna|wish)\s+to\s+die\b/i },
  { category: "self_harm", re: /\btake\s+my\s+own\s+life\b/i },

  // --- violence (partner-directed against the user) ---
  // "he hit me", "she punched me", "they choked me", "my husband beat me"
  {
    category: "violence",
    re: /\b(?:he|she|they|my\s+(?:husband|wife|partner|boyfriend|girlfriend|spouse|ex))\s+(?:hit|hits|hit\s+me|punched|punches|choked|chokes|slapped|slaps|beat|beats|kicked|kicks|strangled|strangles|grabbed|grabs|shoved|shoves|pushed|pushes)\s+(?:me|us)\b/i,
  },
  // "hit me last night", "punched me in the face"
  { category: "violence", re: /\b(?:punched|choked|strangled|slapped|beat|kicked)\s+me\b/i },
  { category: "violence", re: /\bhit\s+me\b/i },

  // --- threats ---
  { category: "threats", re: /\bthreatened\s+to\s+(?:kill|hurt|harm|beat|shoot|stab)\b/i },
  {
    category: "threats",
    re: /\bsaid\s+(?:he|she|they)\s+(?:would|will|'?ll)\s+(?:kill|hurt|harm|beat|shoot|stab)\b/i,
  },
  {
    category: "threats",
    re: /\b(?:he|she|they)\s+says?\s+(?:he|she|they)\s*(?:'?ll|\s+will|\s+would)\s+(?:kill|hurt|harm)\s+(?:me|us|the\s+kids|my\s+kids|the\s+children)\b/i,
  },

  // --- coercion (sexual / consent) ---
  { category: "coercion", re: /\bforced\s+me\s+(?:to\s+have\s+sex|sexually|into\s+sex)\b/i },
  { category: "coercion", re: /\bsexual\s+coercion\b/i },
  { category: "coercion", re: /\bwon'?t\s+let\s+me\s+say\s+no\b/i },
  { category: "coercion", re: /\bmade\s+me\s+have\s+sex\b/i },
  { category: "coercion", re: /\brap(?:e|ed)\s+me\b/i },

  // --- stalking / control ---
  { category: "stalking", re: /\btracks?\s+my\s+(?:phone|location|car)\b/i },
  { category: "stalking", re: /\bmonitor(?:s|ing)\s+my\s+(?:messages|texts|phone|email|emails)\b/i },
  { category: "stalking", re: /\bwon'?t\s+let\s+me\s+leave\b/i },
  { category: "stalking", re: /\bfollows?\s+me\s+everywhere\b/i },
  { category: "stalking", re: /\bcontrols?\s+(?:where\s+i\s+go|who\s+i\s+see|my\s+money)\b/i },

  // --- fear (specifically: fear for safety; not generic "I'm scared") ---
  { category: "fear", re: /\bafraid\s+to\s+go\s+home\b/i },
  { category: "fear", re: /\bfear(?:ful)?\s+for\s+my\s+(?:safety|life)\b/i },
  { category: "fear", re: /\bin\s+danger\b/i },
  {
    category: "fear",
    re: /\bi\s*(?:'?m|\s+am)\s+(?:scared|afraid|terrified)\s+(?:he|she|they)\s+(?:will|'?ll|might|would|is\s+going\s+to)\s+(?:hurt|kill|harm|hit)\b/i,
  },
];

/**
 * Pure function. Inspects raw user-supplied text for unambiguous crisis
 * language and returns the first matching category (priority order
 * defined by PATTERNS). Returns `{ tripped: false }` for empty / non-string
 * input or when no pattern matches.
 *
 * Callers MUST NOT log the input string when this trips. Log only
 * `{ event: "safety_intercept", category, tool, requestId }`.
 */
export function detectSafetyTripwire(input: string): SafetyTripwireResult {
  if (typeof input !== "string" || input.length === 0) return { tripped: false };
  for (const { category, re } of PATTERNS) {
    if (re.test(input)) return { tripped: true, category };
  }
  return { tripped: false };
}

// ---------------------------------------------------------------------------
// Static, schema-shaped safety responses.
//
// One builder per coach tool. Each output exactly matches the JSON schema
// declared in routes/coach.ts so the existing frontend renders without
// any UI changes and without empty cards. Copy is gentle, brief, and
// practical. We deliberately:
//   - Prioritize the user's safety over message optimization.
//   - State the app is not therapy or emergency support.
//   - Surface 988 (Suicide & Crisis Lifeline) and 1-800-799-7233
//     (National Domestic Violence Hotline) as US defaults.
//   - Recommend emergency services for immediate danger.
//   - Avoid telling the user to confront the partner.
//   - Avoid diagnosing the partner or claiming to know what they think.
//   - Avoid tactics for evading anyone, including law enforcement.
//   - Use cautious framing like "if it is safe to do so."
// ---------------------------------------------------------------------------

type ToolKey = "before-send" | "repair" | "planner" | "checkin" | "reality-check";

const SAFETY_NOTE =
  "WifeChat is not therapy or emergency support. If you may be in immediate danger, call your local emergency number. In the US you can also reach 988 (Suicide & Crisis Lifeline) or the National Domestic Violence Hotline at 1-800-799-7233 (text START to 88788).";

const SAFETY_OPENER =
  "Your safety matters more than finding the perfect words right now.";

const REACH_OUT =
  "If it is safe to do so, please reach out to someone you trust or a trained advocate before deciding what to send.";

type BeforeSendShape = {
  better: string;
  softer: string;
  direct: string;
  shortText: string;
  howItMightLand: string;
  realNeed: string;
  oneThingToAvoid: string;
};

type RepairShape = {
  neutralSummary: string;
  yourSideMayHaveFelt: string;
  partnerSideMayHaveFelt: string;
  whereItDerailed: string;
  repairMessage: string;
  questionToAskLater: string;
  nextBestAction: string;
};

type PlannerShape = {
  opener: string;
  keyPoints: [string, string, string];
  sensitiveSpots: string[];
  calmResponses: { ifTheySay: string; youCanSay: string }[];
  closingRequest: string;
};

type CheckinShape = {
  reflection: string;
  partnerMessage: string;
  connectionAction: string;
};

type RealityCheckShape = {
  whatSeemsUnderstandable: string;
  whatToSlowDownOn: string;
  factsVsAssumptions: string[];
  boundaryOrSafetyCheck: string;
  likelyNeed: string;
  nextBestStep: string;
  suggestedPath: "get-support";
  optionalDraft?: string;
};

export type SafetyResult =
  | BeforeSendShape
  | RepairShape
  | PlannerShape
  | CheckinShape
  | RealityCheckShape;

function buildBeforeSend(_category: SafetyTripwireCategory): BeforeSendShape {
  return {
    better: `${SAFETY_OPENER} Before sending anything, consider stepping away to somewhere you feel safer. ${SAFETY_NOTE}`,
    softer: `${SAFETY_OPENER} You don't have to send a message right now. ${REACH_OUT}`,
    direct:
      "Please prioritize your safety over the conversation. If you may be in immediate danger, call your local emergency number, or in the US, 911.",
    shortText:
      "I need some time. I'll reach out when I can.",
    howItMightLand:
      "How a partner receives a message matters far less right now than your physical safety. We can help you craft words later, when you are somewhere you feel safe.",
    realNeed:
      "What's underneath this seems to be safety and support, not a better-worded message. A trained advocate (in the US: 1-800-799-7233) can help you think through next steps confidentially.",
    oneThingToAvoid:
      "Avoid saying anything that could escalate the situation while you are not in a safe place. The conversation can wait; your safety cannot.",
  };
}

function buildRepair(_category: SafetyTripwireCategory): RepairShape {
  return {
    neutralSummary: `${SAFETY_OPENER} What you described sounds like it goes beyond a normal conflict to repair, and that deserves real support. ${SAFETY_NOTE}`,
    yourSideMayHaveFelt:
      "You may be feeling frightened, exhausted, confused, or alone. Those reactions make sense. You do not have to figure this out by yourself.",
    partnerSideMayHaveFelt:
      "We can't and shouldn't speak to what your partner felt or intended. Patterns like this usually call for outside help, not a self-led repair conversation.",
    whereItDerailed:
      "This is not a moment for repair tactics. When safety is in question, the priority is getting to a place where you and anyone in your care are safe.",
    repairMessage:
      "Please consider reaching out to a domestic violence advocate before responding to your partner. In the US: 1-800-799-7233 (text START to 88788). They are confidential and free.",
    questionToAskLater:
      "Once you are somewhere safe, a question to ask a trusted person or advocate is: \"What would a safer next step look like for me this week?\"",
    nextBestAction:
      "If you may be in immediate danger, call your local emergency number now. Otherwise, contact a trained advocate or someone you trust before continuing the conversation with your partner.",
  };
}

function buildPlanner(_category: SafetyTripwireCategory): PlannerShape {
  return {
    opener: `${SAFETY_OPENER} It sounds like what you're navigating may not be safe to plan a conversation around right now. ${SAFETY_NOTE}`,
    keyPoints: [
      "Your physical safety comes before any planned conversation.",
      "A trained advocate can help you think this through confidentially — in the US: 1-800-799-7233 (text START to 88788).",
      "If you may be in immediate danger, call your local emergency number.",
    ],
    sensitiveSpots: [
      "Confronting a partner about safety concerns can escalate risk.",
      "Planning a conversation in the same space you do not feel safe in can make things harder.",
      "You do not have to make any decision today.",
    ],
    calmResponses: [
      {
        ifTheySay: "Why are you being like this?",
        youCanSay: "I'm not in a place to talk about this right now. I need some time.",
      },
      {
        ifTheySay: "Who have you been talking to?",
        youCanSay: "I'd rather not get into that right now. Let's come back to this later.",
      },
    ],
    closingRequest:
      "If it is safe to do so, please reach out to someone you trust or a trained advocate before having this conversation. WifeChat is not therapy or emergency support.",
  };
}

function buildCheckin(_category: SafetyTripwireCategory): CheckinShape {
  return {
    reflection: `${SAFETY_OPENER} What you shared sounds heavier than a normal check-in, and you deserve support that goes beyond an app. ${SAFETY_NOTE}`,
    partnerMessage:
      "Today might not be the day to send your partner a message. ${REACH_OUT}".replace(
        "${REACH_OUT}",
        REACH_OUT,
      ),
    connectionAction:
      "One small step: if it is safe to do so, save 988 and 1-800-799-7233 in your phone, or step into a place where you feel safer for a few minutes. If you may be in immediate danger, call your local emergency number.",
  };
}

function buildRealityCheck(_category: SafetyTripwireCategory): RealityCheckShape {
  return {
    whatSeemsUnderstandable:
      "It makes sense that this feels urgent or upsetting. When safety may be involved, your reaction deserves care and support rather than quick analysis.",
    whatToSlowDownOn:
      "Slow down on trying to solve this through the perfect message right now. A conversation can wait until you are somewhere safe and supported.",
    factsVsAssumptions: [
      "Fact: you described language or behavior that may involve safety risk.",
      "Fact: WifeChat is not therapy or emergency support.",
      "Next check: if you may be in immediate danger, use local emergency help first.",
    ],
    boundaryOrSafetyCheck: `${SAFETY_OPENER} ${SAFETY_NOTE}`,
    likelyNeed:
      "The clearest need is safety, support, and a grounded next step with someone qualified or trusted.",
    nextBestStep:
      "If you may be in immediate danger, call your local emergency number. If it is safe to do so, contact someone you trust or a trained advocate before responding.",
    suggestedPath: "get-support",
  };
}

export function buildSafetyResult(
  tool: ToolKey,
  category: SafetyTripwireCategory,
): SafetyResult {
  switch (tool) {
    case "before-send":
      return buildBeforeSend(category);
    case "repair":
      return buildRepair(category);
    case "planner":
      return buildPlanner(category);
    case "checkin":
      return buildCheckin(category);
    case "reality-check":
      return buildRealityCheck(category);
  }
}
