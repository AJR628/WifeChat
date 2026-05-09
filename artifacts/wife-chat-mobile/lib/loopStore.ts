import { loadLoops, saveLoops } from "@/lib/storage";
import type { Loop, LoopStatus } from "@/lib/loopModels";

function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

export type CreateLoopInput = {
  title: string;
  relationshipType?: string;
  whatHappened: string;
  emotion: string;
  interpretation: string;
  need: string;
  consideringDoing: string;
  nextStep: string;
};

export type UpdateLoopInput = Partial<
  Omit<Loop, "id" | "createdAt" | "updatedAt">
>;

export async function listLoops(): Promise<Loop[]> {
  return loadLoops();
}

export async function getLoop(id: string): Promise<Loop | null> {
  const loops = await loadLoops();
  return loops.find((l) => l.id === id) ?? null;
}

export async function createLoop(input: CreateLoopInput): Promise<Loop> {
  const now = Date.now();
  const loop: Loop = {
    id: newId(),
    title: input.title,
    relationshipType: input.relationshipType,
    createdAt: now,
    updatedAt: now,
    stage: "untangle",
    status: "open",
    whatHappened: input.whatHappened,
    emotion: input.emotion,
    interpretation: input.interpretation,
    need: input.need,
    consideringDoing: input.consideringDoing,
    nextStep: input.nextStep,
    generatedArtifacts: [],
    messages: [],
  };
  const loops = await loadLoops();
  await saveLoops([loop, ...loops]);
  return loop;
}

export async function updateLoop(
  id: string,
  input: UpdateLoopInput,
): Promise<Loop | null> {
  const loops = await loadLoops();
  const index = loops.findIndex((l) => l.id === id);
  if (index === -1) return null;
  const updated: Loop = { ...loops[index], ...input, updatedAt: Date.now() };
  const next = [...loops];
  next[index] = updated;
  await saveLoops(next);
  return updated;
}

export async function setLoopStatus(
  id: string,
  status: LoopStatus,
): Promise<Loop | null> {
  return updateLoop(id, { status });
}

export async function closeLoop(id: string): Promise<Loop | null> {
  return updateLoop(id, { status: "resolved", stage: "close" });
}

export async function letGoLoop(id: string): Promise<Loop | null> {
  return updateLoop(id, { status: "letGo", stage: "close" });
}

export async function pauseLoop(id: string): Promise<Loop | null> {
  return updateLoop(id, { status: "paused" });
}

export async function markNeedsFollowUp(id: string): Promise<Loop | null> {
  return updateLoop(id, { status: "needsFollowUp" });
}

export async function markPartlyResolved(id: string): Promise<Loop | null> {
  return updateLoop(id, { status: "partlyResolved", stage: "close" });
}

export const OPEN_STATUSES: LoopStatus[] = [
  "open",
  "paused",
  "needsFollowUp",
  "partlyResolved",
];

export function isOpenLoop(loop: Loop): boolean {
  return OPEN_STATUSES.includes(loop.status);
}

export function sortByUpdatedAtDesc(loops: Loop[]): Loop[] {
  return [...loops].sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getOpenLoops(loops: Loop[]): Loop[] {
  return sortByUpdatedAtDesc(loops.filter(isOpenLoop));
}

export function statusLabel(status: LoopStatus): string {
  switch (status) {
    case "open":
      return "Open";
    case "paused":
      return "Paused";
    case "needsFollowUp":
      return "Needs follow-up";
    case "partlyResolved":
      return "Partly resolved";
    case "resolved":
      return "Resolved";
    case "letGo":
      return "Let go";
  }
}

export function stageLabel(
  stage: Loop["stage"],
): string {
  switch (stage) {
    case "untangle":
      return "Untangle";
    case "decide":
      return "Decide";
    case "prepare":
      return "Prepare";
    case "act":
      return "Act";
    case "close":
      return "Close";
  }
}
