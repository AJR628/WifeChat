"use client";

import { useCallback, useEffect, useState } from "react";
import type { Message } from "@/lib/types";
import {
  getConversations,
  saveConversations,
  getLastConversationId,
  setLastConversationId,
} from "@/lib/storage";

const DEFAULT_TITLE = "New chat";
const SEND_LIMIT = 60;

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function ClientShell({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConversation = useCallback((id: string) => {
    const list = getConversations();
    const convo = list.find((c) => c.id === id);
    if (convo) {
      setMessages(convo.messages);
      setCurrentId(id);
      setLastConversationId(id);
    }
  }, []);

  useEffect(() => {
    let list = getConversations();
    const lastId = getLastConversationId();
    if (list.length === 0) {
      const id = generateId();
      const convo = {
        id,
        title: DEFAULT_TITLE,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
      };
      list = [convo];
      saveConversations(list);
      setLastConversationId(id);
      setCurrentId(id);
      setMessages([]);
      return;
    }
    if (lastId && list.some((c) => c.id === lastId)) {
      loadConversation(lastId);
    } else {
      const first = list[list.length - 1];
      loadConversation(first.id);
    }
  }, [loadConversation]);

  const persistMessages = useCallback(
    (next: Message[]) => {
      if (!currentId) return;
      const list = getConversations();
      const idx = list.findIndex((c) => c.id === currentId);
      if (idx === -1) return;
      list[idx] = {
        ...list[idx],
        messages: next,
        updatedAt: Date.now(),
      };
      saveConversations(list);
    },
    [currentId]
  );

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading || !currentId) return;
    setInput("");
    setError(null);
    const userMessage: Message = {
      role: "user",
      content: text,
      ts: Date.now(),
    };
    const next = [...messages, userMessage];
    setMessages(next);
    persistMessages(next);
    setLoading(true);

    const payload = next.slice(-SEND_LIMIT).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          data?.error ?? (res.status === 500 ? "Server is not configured for chat. Check OPENAI_API_KEY." : "Request failed.");
        setError(msg);
        setLoading(false);
        return;
      }
      const assistantMessage: Message = {
        role: "assistant",
        content: data.text ?? "",
        ts: Date.now(),
      };
      const final = [...next, assistantMessage];
      setMessages(final);
      persistMessages(final);
    } catch (e) {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }, [input, loading, currentId, messages, persistMessages]);

  return (
    <>
      {children}
      <main
        style={{
          maxWidth: 640,
          margin: "0 auto",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          paddingBottom: 80,
        }}
      >
        <header
          style={{
            padding: "12px 16px",
            background: "#fff",
            borderBottom: "1px solid #e0e0e0",
          }}
        >
          <h1 style={{ margin: 0, fontSize: "1.25rem" }}>Wife Chat</h1>
        </header>
        {error && (
          <div
            style={{
              padding: "12px 16px",
              background: "#ffebee",
              color: "#c62828",
              fontSize: "0.9rem",
            }}
          >
            {error}
          </div>
        )}
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 16,
            flex: 1,
          }}
        >
          {messages.map((m) => (
            <li
              key={m.ts}
              style={{
                marginBottom: 12,
                textAlign: m.role === "user" ? "right" : "left",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  maxWidth: "85%",
                  padding: "10px 14px",
                  borderRadius: 12,
                  background: m.role === "user" ? "#1976d2" : "#e0e0e0",
                  color: m.role === "user" ? "#fff" : "#1a1a1a",
                }}
              >
                {m.content}
              </span>
            </li>
          ))}
        </ul>
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            maxWidth: 640,
            margin: "0 auto",
            padding: "12px 16px",
            background: "#fff",
            borderTop: "1px solid #e0e0e0",
            display: "flex",
            gap: 8,
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="Message..."
            disabled={loading}
            style={{
              flex: 1,
              padding: "10px 12px",
              border: "1px solid #ccc",
              borderRadius: 8,
            }}
          />
          <button
            type="button"
            onClick={send}
            disabled={loading || !input.trim()}
            style={{
              padding: "10px 16px",
              background: loading ? "#ccc" : "#1976d2",
              color: "#fff",
              border: "none",
              borderRadius: 8,
            }}
          >
            Send
          </button>
        </div>
      </main>
    </>
  );
}
