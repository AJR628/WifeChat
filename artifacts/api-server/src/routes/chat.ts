import { Router, type Request, type Response } from "express";
import OpenAI from "openai";
import { checkRateLimit, clientKey } from "../lib/rateLimit";

const router = Router();

const MODEL = "gpt-5-mini";
const MAX_INPUT_CHARS = 4000;
const MAX_MESSAGES = 40;

const SYSTEM_PROMPT = `You are a relationship communication coach inside an app called WifeChat.

Your job is to help the user say hard things better, repair conflict, and build healthier connection with their partner.

Voice:
- Practical, concise, emotionally mature, non-judgmental.
- Warm but never sappy. No therapy-speak clichés. No emojis unless the user used one.
- Default to plain language a stressed person can read on a phone.
- Keep most replies short (2-6 sentences). Use lists only when genuinely useful.

Hard rules — NEVER:
- Never claim to know what the partner thinks or feels. Use hedged language.
- Never encourage manipulation, contempt, name-calling, stonewalling, or surveillance.
- Never label the partner as toxic, narcissistic, or abusive based on a single message.
- Never give legal, medical, or psychiatric advice. You are not a therapist.

Safety:
- If the user mentions violence, threats, fear for safety, sexual coercion, or self-harm, gently acknowledge and recommend professional help. In the US: 988 (Suicide & Crisis Lifeline) or 1-800-799-7233 (National Domestic Violence Hotline). Then either decline or respond only with safety-oriented support.

This product is not therapy and not emergency support. Mention this gently when relevant, not in every message.`;

type IncomingMessage = { role: "user" | "assistant"; content: string };

function validate(body: unknown): { ok: true; messages: IncomingMessage[] } | { ok: false; error: string } {
  const b = body as { messages?: unknown } | null;
  const raw = b?.messages;
  if (!Array.isArray(raw) || raw.length === 0) {
    return { ok: false, error: "messages is required" };
  }
  if (raw.length > MAX_MESSAGES) {
    return { ok: false, error: `too many messages (max ${MAX_MESSAGES})` };
  }
  const messages: IncomingMessage[] = [];
  for (const m of raw) {
    const role = (m as { role?: unknown })?.role;
    const content = (m as { content?: unknown })?.content;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") {
      return { ok: false, error: "each message needs role and content" };
    }
    const trimmed = content.trim();
    if (!trimmed) continue;
    if (trimmed.length > MAX_INPUT_CHARS) {
      return { ok: false, error: `message exceeds ${MAX_INPUT_CHARS} characters` };
    }
    messages.push({ role, content: trimmed });
  }
  if (messages.length === 0) return { ok: false, error: "messages cannot be empty" };
  return { ok: true, messages };
}

function getOpenAI(req: Request, res: Response): OpenAI | null {
  const baseURL = process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"];
  const apiKey =
    process.env["AI_INTEGRATIONS_OPENAI_API_KEY"] ?? process.env["OPENAI_API_KEY"];
  if (!apiKey) {
    req.log.error("OpenAI credentials are not configured");
    res.status(500).json({ error: "Server is not configured for the assistant." });
    return null;
  }
  return new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) });
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

router.post("/chat", async (req, res) => {
  if (!passcodeOk(req, res)) return;
  if (!rateLimitOk(req, res)) return;

  const validation = validate(req.body);
  if (!validation.ok) {
    res.status(400).json({ error: validation.error });
    return;
  }

  const openai = getOpenAI(req, res);
  if (!openai) return;

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      max_completion_tokens: 1024,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...validation.messages,
      ],
    });

    const text = completion.choices?.[0]?.message?.content?.trim() ?? "";
    if (!text) {
      res.status(502).json({ error: "The assistant returned an empty response. Try again." });
      return;
    }
    res.json({ text });
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status;
    req.log.error({ err, status }, "Chat: OpenAI call failed");
    if (status === 429) {
      res.status(503).json({ error: "The assistant is busy right now. Please try again in a moment." });
      return;
    }
    res.status(502).json({ error: "Failed to reach the assistant. Please try again." });
  }
});

export default router;
