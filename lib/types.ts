export type MessageRole = "user" | "assistant";

export interface Message {
  role: MessageRole;
  content: string;
  ts: number;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
}

export interface ChatRequest {
  passcode?: string;
  messages: { role: MessageRole; content: string }[];
}

export interface ChatResponse {
  text: string;
}
