import { Router, type Request, type Response } from "express";
import OpenAI from "openai";
import { checkRateLimit, clientKey } from "../lib/rateLimit";

const router = Router();

const MODEL = "gpt-5-mini";
const MAX_INPUT_CHARS = 4000;
// Phase 2 cost guardrail: the coach JSON schemas are compact (≈7 short string
// fields per tool, occasionally a small array). 1500 completion tokens is well
// above the realistic ceiling for a full structured response and caps
// worst-case spend per request at ~10× lower than the previous 8192.
const MAX_COMPLETION_TOKENS = 1500;
// Phase 2 timeout guardrail: cap upstream wait so a hung OpenAI call cannot
// pin a Node worker indefinitely. Applied at the SDK-client level.
const OPENAI_TIMEOUT_MS = 30_000;

// Phase 2 kill switch: when set to "true", every /api/coach/* request is
// short-circuited with a 503 BEFORE rate limiting and BEFORE any OpenAI call,
// so the toggle is effectively instant.
const KILL_SWITCH_ENV = "COACH_API_DISABLED";
function coachKillSwitch(req: Request, res: Response, next: () => void): void {
  if (process.env[KILL_SWITCH_ENV] === "true") {
    req.log?.warn({ event: "coach_kill_switch" }, "Coach API disabled by env");
    res.status(503).json({
      error: "The coach is temporarily unavailable. Please try again later.",
    });
    return;
  }
  next();
}
router.use("/coach", coachKillSwitch);

const SAFETY_PROMPT = `You are a relationship communication coach inside an app called WifeChat / Relationship Studio.

Your job is to help the user say hard things better, repair conflict, and build healthier connection with their partner.

Voice and stance:
- Practical, concise, emotionally mature, non-judgmental.
- Warm but never sappy. No therapy-speak clichés. No emojis unless the user used one.
- Treat the user as a capable adult who is trying.
- Default to plain language a stressed person can read on a phone.

Hard rules — NEVER do these:
- Never claim to know what the partner actually thinks, feels, or wants. Use hedged language: "they may have felt", "one possibility", "you might check".
- Never encourage manipulation, coercion, control, surveillance, ultimatums as leverage, guilt-tripping, contempt, name-calling, or stonewalling.
- Never tell the user their partner is the problem, is toxic, narcissistic, abusive, or should be left, based on a single message.
- Never produce content that shames, mocks, or dehumanizes the partner.
- Never give legal, medical, or psychiatric advice.
- Never pretend to be a licensed therapist.

Safety:
- If the user describes physical violence, threats, fear for their safety, sexual coercion, or self-harm, gently acknowledge and recommend they reach out to a qualified professional or, in the US, 988 (Suicide & Crisis Lifeline) or the National Domestic Violence Hotline 1-800-799-7233. Then either decline the requested rewrite or provide only a safety-oriented response.
- This product is not therapy and not emergency support. Mention this gently when relevant, not in every response.

Output:
- You will be asked to return JSON that strictly matches a provided schema.
- Keep each field tight: usually 1–3 sentences. Lists: 3–5 items unless asked.
- Do not include preambles like "Sure!" or "Here is".`;

type ToolKey = "before-send" | "repair" | "planner" | "checkin";

type ToolDef = {
  key: ToolKey;
  schemaName: string;
  schema: Record<string, unknown>;
  buildUserPrompt: (input: Record<string, string>) => string;
  validateInput: (body: unknown) => { ok: true; data: Record<string, string> } | { ok: false; error: string };
};

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function tooLong(s: string): boolean {
  return s.length > MAX_INPUT_CHARS;
}

const TOOLS: Record<ToolKey, ToolDef> = {
  "before-send": {
    key: "before-send",
    schemaName: "BeforeYouSend",
    schema: {
      type: "object",
      additionalProperties: false,
      required: [
        "better",
        "softer",
        "direct",
        "shortText",
        "howItMightLand",
        "realNeed",
        "oneThingToAvoid",
      ],
      properties: {
        better: { type: "string", description: "An overall improved version of the message — clear, kind, and grounded." },
        softer: { type: "string", description: "A warmer, less reactive version that still says the real thing." },
        direct: { type: "string", description: "A more direct version that names the issue plainly without contempt." },
        shortText: { type: "string", description: "A version short enough to send as a single text message." },
        howItMightLand: { type: "string", description: "How a partner might receive the original message. Hedged, non-mind-reading." },
        realNeed: { type: "string", description: "The underlying need the user seems to be expressing." },
        oneThingToAvoid: { type: "string", description: "One specific thing to avoid saying or doing in this exchange." },
      },
    },
    validateInput(body) {
      const message = str((body as { message?: unknown })?.message);
      if (!message) return { ok: false, error: "message is required" };
      if (tooLong(message)) return { ok: false, error: `message exceeds ${MAX_INPUT_CHARS} characters` };
      return { ok: true, data: { message } };
    },
    buildUserPrompt({ message }) {
      return `The user is about to send this message to their partner. Help them say it better.

--- ORIGINAL MESSAGE ---
${message}
--- END ---

Return JSON for the BeforeYouSend schema. Keep each field short and practical.`;
    },
  },

  repair: {
    key: "repair",
    schemaName: "FightRepair",
    schema: {
      type: "object",
      additionalProperties: false,
      required: [
        "neutralSummary",
        "yourSideMayHaveFelt",
        "partnerSideMayHaveFelt",
        "whereItDerailed",
        "repairMessage",
        "questionToAskLater",
        "nextBestAction",
      ],
      properties: {
        neutralSummary: { type: "string", description: "A short, neutral, non-blaming summary of what happened." },
        yourSideMayHaveFelt: { type: "string", description: "Plausible feelings underneath the user's reactions. Hedged." },
        partnerSideMayHaveFelt: { type: "string", description: "Plausible feelings the partner may have had. Hedged. Do not claim to know." },
        whereItDerailed: { type: "string", description: "The specific moment or move that escalated things." },
        repairMessage: { type: "string", description: "A short message the user could send to begin repair. Owns their part. No blame." },
        questionToAskLater: { type: "string", description: "One open, non-loaded question to ask once both are calm." },
        nextBestAction: { type: "string", description: "One small concrete next step." },
      },
    },
    validateInput(body) {
      const description = str((body as { description?: unknown })?.description);
      if (!description) return { ok: false, error: "description is required" };
      if (tooLong(description)) return { ok: false, error: `description exceeds ${MAX_INPUT_CHARS} characters` };
      return { ok: true, data: { description } };
    },
    buildUserPrompt({ description }) {
      return `The user just had a fight with their partner and wants help repairing it.

--- WHAT HAPPENED (their account) ---
${description}
--- END ---

Return JSON for the FightRepair schema. Be even-handed. Do not take sides. Do not pathologize the partner.`;
    },
  },

  planner: {
    key: "planner",
    schemaName: "HardConversationPlan",
    schema: {
      type: "object",
      additionalProperties: false,
      required: [
        "opener",
        "keyPoints",
        "sensitiveSpots",
        "calmResponses",
        "closingRequest",
      ],
      properties: {
        opener: { type: "string", description: "A grounded opening sentence that invites a real conversation." },
        keyPoints: {
          type: "array",
          minItems: 3,
          maxItems: 3,
          items: { type: "string" },
          description: "Exactly 3 key points the user wants to land. Each one short.",
        },
        sensitiveSpots: {
          type: "array",
          minItems: 2,
          maxItems: 5,
          items: { type: "string" },
          description: "Likely sensitive spots or things that may trigger defensiveness.",
        },
        calmResponses: {
          type: "array",
          minItems: 2,
          maxItems: 5,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["ifTheySay", "youCanSay"],
            properties: {
              ifTheySay: { type: "string" },
              youCanSay: { type: "string" },
            },
          },
          description: "Pairs of likely partner responses and a calm reply the user could give.",
        },
        closingRequest: { type: "string", description: "A clear, kind ask for what the user wants going forward." },
      },
    },
    validateInput(body) {
      const b = body as Record<string, unknown> | null;
      const topic = str(b?.topic);
      const goal = str(b?.goal);
      const fear = str(b?.fear);
      const desiredOutcome = str(b?.desiredOutcome);
      if (!topic || !goal || !desiredOutcome) {
        return { ok: false, error: "topic, goal, and desiredOutcome are required" };
      }
      for (const v of [topic, goal, fear, desiredOutcome]) {
        if (tooLong(v)) return { ok: false, error: `field exceeds ${MAX_INPUT_CHARS} characters` };
      }
      return { ok: true, data: { topic, goal, fear, desiredOutcome } };
    },
    buildUserPrompt({ topic, goal, fear, desiredOutcome }) {
      return `The user wants to plan a hard conversation with their partner.

Topic: ${topic}
Their goal in the conversation: ${goal}
What they fear could happen: ${fear || "(not provided)"}
Desired outcome: ${desiredOutcome}

Return JSON for the HardConversationPlan schema. Make it usable — something they can read on their phone right before talking.`;
    },
  },

  checkin: {
    key: "checkin",
    schemaName: "DailyCheckIn",
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["reflection", "partnerMessage", "connectionAction"],
      properties: {
        reflection: { type: "string", description: "A short private reflection for the user. Honest, kind, not preachy." },
        partnerMessage: { type: "string", description: "An optional short message the user could send their partner today. Warm, specific, no manipulation." },
        connectionAction: { type: "string", description: "One tiny concrete connection action the user could do today (under 5 minutes)." },
      },
    },
    validateInput(body) {
      const b = body as Record<string, unknown> | null;
      const mood = str(b?.mood);
      const gratitude = str(b?.gratitude);
      const friction = str(b?.friction);
      const want = str(b?.want);
      if (!mood && !gratitude && !friction && !want) {
        return { ok: false, error: "at least one field is required" };
      }
      for (const v of [mood, gratitude, friction, want]) {
        if (tooLong(v)) return { ok: false, error: `field exceeds ${MAX_INPUT_CHARS} characters` };
      }
      return { ok: true, data: { mood, gratitude, friction, want } };
    },
    buildUserPrompt({ mood, gratitude, friction, want }) {
      return `The user is doing a daily relationship check-in.

How they're feeling today: ${mood || "(not shared)"}
Something they appreciate about their partner: ${gratitude || "(not shared)"}
A small friction or unmet need: ${friction || "(not shared)"}
What they'd like more of: ${want || "(not shared)"}

Return JSON for the DailyCheckIn schema. Keep partnerMessage natural enough to actually send.`;
    },
  },
};

// Phase 2: lazy singleton OpenAI client. Constructed on first successful
// credential read so the server does not crash at import time if env vars
// are missing. Reused across requests so the SDK can pool connections and
// so we have one place to enforce the request timeout.
let openaiSingleton: OpenAI | null = null;
let openaiSingletonKeyFingerprint: string | null = null;

function getOpenAI(req: Request, res: Response): OpenAI | null {
  const baseURL = process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"];
  const apiKey =
    process.env["AI_INTEGRATIONS_OPENAI_API_KEY"] ?? process.env["OPENAI_API_KEY"];
  if (!apiKey) {
    req.log.error("OpenAI credentials are not configured");
    res.status(500).json({ error: "Server is not configured for the assistant." });
    return null;
  }
  // Rebuild the singleton if the credential identity changes (e.g. env reload
  // in dev). Fingerprint is base+key length, no secret value is logged.
  const fingerprint = `${baseURL ?? ""}:${apiKey.length}:${apiKey.slice(-4)}`;
  if (!openaiSingleton || openaiSingletonKeyFingerprint !== fingerprint) {
    openaiSingleton = new OpenAI({
      apiKey,
      timeout: OPENAI_TIMEOUT_MS,
      ...(baseURL ? { baseURL } : {}),
    });
    openaiSingletonKeyFingerprint = fingerprint;
  }
  return openaiSingleton;
}

function passcodeOk(req: Request, res: Response): boolean {
  const required = process.env["APP_PASSCODE"];
  if (!required) return true;
  const provided = (req.body as { passcode?: string } | undefined)?.passcode
    ?? req.header("x-app-passcode")
    ?? "";
  if (provided !== required) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

function rateLimitOk(req: Request, res: Response): boolean {
  const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
  const result = checkRateLimit(clientKey(ip));
  if (!result.ok) {
    res.setHeader("Retry-After", String(result.retryAfterSec));
    res.status(429).json({ error: `Too many requests. Try again in ${result.retryAfterSec}s.` });
    return false;
  }
  res.setHeader("X-RateLimit-Remaining", String(result.remaining));
  return true;
}

async function runTool(tool: ToolDef, req: Request, res: Response): Promise<void> {
  if (!passcodeOk(req, res)) return;
  if (!rateLimitOk(req, res)) return;

  const validation = tool.validateInput(req.body);
  if (!validation.ok) {
    res.status(400).json({ error: validation.error });
    return;
  }

  const openai = getOpenAI(req, res);
  if (!openai) return;

  const userPrompt = tool.buildUserPrompt(validation.data);

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      max_completion_tokens: MAX_COMPLETION_TOKENS,
      messages: [
        { role: "system", content: SAFETY_PROMPT },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: tool.schemaName,
          strict: true,
          schema: tool.schema,
        },
      },
    });

    const raw = completion.choices?.[0]?.message?.content ?? "";
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      req.log.error({ raw }, "Coach: model returned non-JSON");
      res.status(502).json({ error: "The assistant returned an unexpected response. Try again." });
      return;
    }

    const required = (tool.schema as { required?: string[] }).required ?? [];
    if (typeof parsed !== "object" || parsed === null) {
      req.log.error({ parsed }, "Coach: model output is not an object");
      res.status(502).json({ error: "The assistant returned an unexpected response. Try again." });
      return;
    }
    const obj = parsed as Record<string, unknown>;
    const missing = required.filter((k) => !(k in obj));
    if (missing.length > 0) {
      req.log.error({ missing }, "Coach: model output missing required fields");
      res.status(502).json({ error: "The assistant returned an incomplete response. Try again." });
      return;
    }

    res.json({ tool: tool.key, result: parsed });
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status;
    req.log.error({ err, status }, "Coach: OpenAI call failed");
    if (status === 429) {
      res.status(503).json({ error: "The assistant is busy right now. Please try again in a moment." });
      return;
    }
    res.status(502).json({ error: "Failed to reach the assistant. Please try again." });
  }
}

router.post("/coach/before-send", (req, res) => runTool(TOOLS["before-send"], req, res));
router.post("/coach/repair", (req, res) => runTool(TOOLS.repair, req, res));
router.post("/coach/planner", (req, res) => runTool(TOOLS.planner, req, res));
router.post("/coach/checkin", (req, res) => runTool(TOOLS.checkin, req, res));

export default router;
