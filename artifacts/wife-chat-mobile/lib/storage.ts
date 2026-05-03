import AsyncStorage from "@react-native-async-storage/async-storage";

export type MessageRole = "user" | "assistant";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  ts: number;
}

const STORAGE_VERSION = 1;
const VERSION_KEY = "wife_chat_v";
const MESSAGES_KEY = "wife_chat_messages";
const MAX_MESSAGES = 200;

async function ensureVersion(): Promise<void> {
  const current = await AsyncStorage.getItem(VERSION_KEY);
  const v = current ? parseInt(current, 10) : 0;
  if (v < STORAGE_VERSION) {
    await AsyncStorage.removeItem(MESSAGES_KEY);
    await AsyncStorage.setItem(VERSION_KEY, String(STORAGE_VERSION));
  }
}

export async function loadMessages(): Promise<Message[]> {
  try {
    await ensureVersion();
    const raw = await AsyncStorage.getItem(MESSAGES_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as Message[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function saveMessages(messages: Message[]): Promise<void> {
  try {
    await ensureVersion();
    const trimmed =
      messages.length > MAX_MESSAGES
        ? messages.slice(-MAX_MESSAGES)
        : messages;
    await AsyncStorage.setItem(MESSAGES_KEY, JSON.stringify(trimmed));
  } catch {
    /* noop */
  }
}

export async function clearMessages(): Promise<void> {
  try {
    await AsyncStorage.removeItem(MESSAGES_KEY);
  } catch {
    /* noop */
  }
}

export function newMessageId(): string {
  return Date.now().toString() + Math.random().toString(36).substring(2, 11);
}
