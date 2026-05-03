import { Router } from "express";
import OpenAI from "openai";

const router = Router();

const MODEL = "gpt-4o-mini-2024-07-18";
const MAX_MESSAGES = 60;
const MAX_CHARS_PER_MESSAGE = 8000;
const ALLOWED_ROLES = ["user", "assistant"] as const;

const systemInstruction = `You are a helpful, concise assistant. Keep replies clear and brief unless the user asks for more detail.`;

router.post("/chat", async (req, res) => {
  const body = req.body as {
    passcode?: string;
    messages?: { role: string; content: string }[];
  };

  const requiredPasscode = process.env["APP_PASSCODE"];
  if (requiredPasscode && body.passcode !== requiredPasscode) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) {
    req.log.error("OPENAI_API_KEY is not set");
    res.status(500).json({ error: "Server is not configured for chat." });
    return;
  }

  const rawMessages = body.messages;
  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    res.status(400).json({ error: "messages array required and must not be empty" });
    return;
  }
  if (rawMessages.length > MAX_MESSAGES) {
    res.status(400).json({ error: `At most ${MAX_MESSAGES} messages allowed per request` });
    return;
  }

  const messages: { role: "user" | "assistant" | "system"; content: string }[] = [];
  for (const m of rawMessages) {
    if (typeof m !== "object" || m === null) {
      res.status(400).json({ error: "Each message must be an object with role and content" });
      return;
    }
    const role = m.role;
    const content = typeof m.content === "string" ? m.content : String(m.content ?? "");
    if (!ALLOWED_ROLES.includes(role as "user" | "assistant")) {
      res.status(400).json({ error: "Only user and assistant roles allowed" });
      return;
    }
    if (content.length > MAX_CHARS_PER_MESSAGE) {
      res.status(400).json({ error: `Message exceeds ${MAX_CHARS_PER_MESSAGE} characters` });
      return;
    }
    messages.push({ role: role as "user" | "assistant", content });
  }

  const openai = new OpenAI({ apiKey });
  const apiMessages = [
    { role: "system" as const, content: systemInstruction },
    ...messages,
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: apiMessages,
      max_tokens: 1024,
    });
    const choice = completion.choices?.[0];
    const text = choice?.message?.content?.trim() ?? "";
    res.json({ text });
  } catch (err) {
    req.log.error({ err }, "OpenAI API error");
    res.status(500).json({ error: "Failed to get reply from assistant." });
  }
});

export default router;
