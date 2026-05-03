import AsyncStorage from "@react-native-async-storage/async-storage";

export type MessageRole = "user" | "assistant";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  ts: number;
}

const STORAGE_VERSION = 2;
const VERSION_KEY = "wife_chat_v";
const LEGACY_MESSAGES_KEY = "wife_chat_messages";
const MESSAGES_KEY_PREFIX = "wife_chat_messages_";
const TONE_KEY = "wife_chat_tone";
const MAX_MESSAGES = 200;

export type Tone = "warmer" | "balanced" | "direct";

function keyFor(tool: string): string {
  return `${MESSAGES_KEY_PREFIX}${tool}`;
}

async function ensureVersion(): Promise<void> {
  const current = await AsyncStorage.getItem(VERSION_KEY);
  const v = current ? parseInt(current, 10) : 0;
  if (v < STORAGE_VERSION) {
    await AsyncStorage.removeItem(LEGACY_MESSAGES_KEY);
    await AsyncStorage.setItem(VERSION_KEY, String(STORAGE_VERSION));
  }
}

export async function loadMessages(tool: string): Promise<Message[]> {
  try {
    await ensureVersion();
    const raw = await AsyncStorage.getItem(keyFor(tool));
    if (!raw) return [];
    const list = JSON.parse(raw) as Message[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function saveMessages(
  tool: string,
  messages: Message[],
): Promise<void> {
  try {
    await ensureVersion();
    const trimmed =
      messages.length > MAX_MESSAGES
        ? messages.slice(-MAX_MESSAGES)
        : messages;
    await AsyncStorage.setItem(keyFor(tool), JSON.stringify(trimmed));
  } catch {
    /* noop */
  }
}

export async function clearMessages(tool: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(keyFor(tool));
  } catch {
    /* noop */
  }
}

export async function loadTone(): Promise<Tone> {
  try {
    const raw = await AsyncStorage.getItem(TONE_KEY);
    if (raw === "warmer" || raw === "balanced" || raw === "direct") return raw;
    return "balanced";
  } catch {
    return "balanced";
  }
}

export async function saveTone(t: Tone): Promise<void> {
  try {
    await AsyncStorage.setItem(TONE_KEY, t);
  } catch {
    /* noop */
  }
}

export function newMessageId(): string {
  return Date.now().toString() + Math.random().toString(36).substring(2, 11);
}
