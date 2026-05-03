import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const MODEL = "gpt-4o-mini-2024-07-18";
const MAX_MESSAGES = 60;
const MAX_CHARS_PER_MESSAGE = 8000;
const ALLOWED_ROLES = ["user", "assistant"] as const;

const systemInstruction = `You are a helpful, concise assistant. Keep replies clear and brief unless the user asks for more detail.`;

export async function POST(request: NextRequest) {
  let body: { passcode?: string; messages?: { role: string; content: string }[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON" },
      { status: 400 }
    );
  }

  const requiredPasscode = process.env.APP_PASSCODE;
  if (requiredPasscode && body.passcode !== requiredPasscode) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("OPENAI_API_KEY is not set");
    return NextResponse.json(
      { error: "Server is not configured for chat." },
      { status: 500 }
    );
  }

  const rawMessages = body.messages;
  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    return NextResponse.json(
      { error: "messages array required and must not be empty" },
      { status: 400 }
    );
  }
  if (rawMessages.length > MAX_MESSAGES) {
    return NextResponse.json(
      { error: `At most ${MAX_MESSAGES} messages allowed per request` },
      { status: 400 }
    );
  }

  const messages: { role: "user" | "assistant" | "system"; content: string }[] = [];
  for (const m of rawMessages) {
    if (typeof m !== "object" || m === null) {
      return NextResponse.json(
        { error: "Each message must be an object with role and content" },
        { status: 400 }
      );
    }
    const role = m.role;
    const content = typeof m.content === "string" ? m.content : String(m.content ?? "");
    if (!ALLOWED_ROLES.includes(role as "user" | "assistant")) {
      return NextResponse.json(
        { error: "Only user and assistant roles allowed" },
        { status: 400 }
      );
    }
    if (content.length > MAX_CHARS_PER_MESSAGE) {
      return NextResponse.json(
        { error: `Message exceeds ${MAX_CHARS_PER_MESSAGE} characters` },
        { status: 400 }
      );
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
    return NextResponse.json({ text });
  } catch (err) {
    console.error("OpenAI API error:", err);
    return NextResponse.json(
      { error: "Failed to get reply from assistant." },
      { status: 500 }
    );
  }
}
