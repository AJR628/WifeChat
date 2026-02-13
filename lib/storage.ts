import type { Conversation, Message } from "./types";

const STORAGE_VERSION = 1;
const VERSION_KEY = "wife_chat_v";
const CONVERSATIONS_KEY = "wife_chat_conversations";
const LAST_CONVO_KEY = "wife_chat_last_conversation_id";
const MAX_CONVERSATIONS = 25;
const MAX_MESSAGES_PER_CONVO = 200;

function ensureVersion() {
  if (typeof window === "undefined") return;
  const current = localStorage.getItem(VERSION_KEY);
  const v = current ? parseInt(current, 10) : 0;
  if (v < STORAGE_VERSION) {
    localStorage.removeItem(CONVERSATIONS_KEY);
    localStorage.removeItem(LAST_CONVO_KEY);
    localStorage.setItem(VERSION_KEY, String(STORAGE_VERSION));
  }
}

export function getConversations(): Conversation[] {
  if (typeof window === "undefined") return [];
  ensureVersion();
  try {
    const raw = localStorage.getItem(CONVERSATIONS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as Conversation[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function trimMessages(messages: Message[]): Message[] {
  if (messages.length <= MAX_MESSAGES_PER_CONVO) return messages;
  return messages.slice(-MAX_MESSAGES_PER_CONVO);
}

export function saveConversations(conversations: Conversation[]): void {
  if (typeof window === "undefined") return;
  ensureVersion();
  let list = conversations
    .map((c) => ({
      ...c,
      messages: trimMessages(c.messages),
    }))
    .sort((a, b) => a.updatedAt - b.updatedAt);
  if (list.length > MAX_CONVERSATIONS) {
    list = list.slice(-MAX_CONVERSATIONS);
  }
  localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(list));
}

export function getLastConversationId(): string | null {
  if (typeof window === "undefined") return null;
  ensureVersion();
  return localStorage.getItem(LAST_CONVO_KEY);
}

export function setLastConversationId(id: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAST_CONVO_KEY, id);
}
