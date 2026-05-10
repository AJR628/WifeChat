import type { ToolKey } from "@/constants/tools";
import type {
  RealityCheckEnvelope,
  RealityCheckRequest,
} from "@workspace/api-client-react";

const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN;

export class CoachError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export type SupportedCoachTool = "before-send" | "repair" | "checkin";

export function isSupportedCoachTool(tool: ToolKey): tool is SupportedCoachTool {
  return tool === "before-send" || tool === "repair" || tool === "checkin";
}

type BeforeSendResult = {
  better: string;
  softer: string;
  direct: string;
  shortText: string;
  howItMightLand: string;
  realNeed: string;
  oneThingToAvoid: string;
};

type RepairResult = {
  neutralSummary: string;
  yourSideMayHaveFelt: string;
  partnerSideMayHaveFelt: string;
  whereItDerailed: string;
  repairMessage: string;
  questionToAskLater: string;
  nextBestAction: string;
};

type CheckInResult = {
  reflection: string;
  partnerMessage: string;
  connectionAction: string;
};

type CoachResult = BeforeSendResult | RepairResult | CheckInResult;
type RealityCheckResponseData = {
  tool?: string;
  result?: RealityCheckEnvelope["result"];
  safety?: RealityCheckEnvelope["safety"];
  error?: string;
};

function buildBody(tool: SupportedCoachTool, text: string): Record<string, string> {
  switch (tool) {
    case "before-send":
      return { message: text };
    case "repair":
      return { description: text };
    case "checkin":
      return { mood: text };
  }
}

function formatBeforeSend(r: BeforeSendResult): string {
  return [
    `Better:\n${r.better}`,
    `Softer:\n${r.softer}`,
    `More direct:\n${r.direct}`,
    `Short version:\n${r.shortText}`,
    `How it might land:\n${r.howItMightLand}`,
    `Underneath this:\n${r.realNeed}`,
    `One thing to avoid:\n${r.oneThingToAvoid}`,
  ].join("\n\n");
}

function formatRepair(r: RepairResult): string {
  return [
    `What happened:\n${r.neutralSummary}`,
    `Your side (one read):\n${r.yourSideMayHaveFelt}`,
    `Their side (one read):\n${r.partnerSideMayHaveFelt}`,
    `Where it derailed:\n${r.whereItDerailed}`,
    `A repair message:\n${r.repairMessage}`,
    `Ask later:\n${r.questionToAskLater}`,
    `Next small step:\n${r.nextBestAction}`,
  ].join("\n\n");
}

function formatCheckin(r: CheckInResult): string {
  return [
    `Reflection:\n${r.reflection}`,
    `A message you could send:\n${r.partnerMessage}`,
    `One small connection action:\n${r.connectionAction}`,
  ].join("\n\n");
}

function formatResult(tool: SupportedCoachTool, result: CoachResult): string {
  switch (tool) {
    case "before-send":
      return formatBeforeSend(result as BeforeSendResult);
    case "repair":
      return formatRepair(result as RepairResult);
    case "checkin":
      return formatCheckin(result as CheckInResult);
  }
}

export async function sendCoach(tool: SupportedCoachTool, text: string): Promise<string> {
  if (!DOMAIN) {
    throw new CoachError("App is not configured for the assistant.", 0);
  }
  const url = `https://${DOMAIN}/api/coach/${tool}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildBody(tool, text)),
    });
  } catch {
    throw new CoachError("Network error. Check your connection and try again.", 0);
  }

  let data: { result?: CoachResult; error?: string } = {};
  try {
    data = await res.json();
  } catch {
    /* noop */
  }

  if (!res.ok) {
    throw new CoachError(data.error || `Request failed (${res.status})`, res.status);
  }
  if (!data.result) {
    throw new CoachError("Empty response from server.", 502);
  }
  return formatResult(tool, data.result);
}

export async function sendRealityCheck(
  envelope: RealityCheckRequest,
): Promise<RealityCheckEnvelope> {
  if (!DOMAIN) {
    throw new CoachError("App is not configured for the assistant.", 0);
  }
  const url = `https://${DOMAIN}/api/coach/reality-check`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(envelope),
    });
  } catch {
    throw new CoachError("Network error. Check your connection and try again.", 0);
  }

  let data: RealityCheckResponseData = {};
  try {
    data = await res.json();
  } catch {
    /* noop */
  }

  if (!res.ok) {
    throw new CoachError(data.error || `Request failed (${res.status})`, res.status);
  }
  if (data.tool !== "reality-check" || !data.result) {
    throw new CoachError("Empty response from server.", 502);
  }

  return {
    tool: "reality-check",
    result: data.result,
    ...(data.safety ? { safety: data.safety } : {}),
  };
}
