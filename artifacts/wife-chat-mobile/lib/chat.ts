import type { Message } from "./storage";

const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN;

export class ChatError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function sendChat(messages: Message[]): Promise<string> {
  if (!DOMAIN) {
    throw new ChatError("App is not configured for the assistant.", 0);
  }
  const url = `https://${DOMAIN}/api/chat`;
  const payload = {
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  };

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new ChatError("Network error. Check your connection and try again.", 0);
  }

  let data: { text?: string; error?: string } = {};
  try {
    data = await res.json();
  } catch {
    /* noop */
  }

  if (!res.ok) {
    throw new ChatError(data.error || `Request failed (${res.status})`, res.status);
  }
  if (!data.text) {
    throw new ChatError("Empty response from server.", 502);
  }
  return data.text;
}
