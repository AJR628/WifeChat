const BASE = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

export type CoachTool = "before-send" | "repair" | "planner" | "checkin";

export type BeforeSendResult = {
  better: string;
  softer: string;
  direct: string;
  shortText: string;
  howItMightLand: string;
  realNeed: string;
  oneThingToAvoid: string;
};

export type RepairResult = {
  neutralSummary: string;
  yourSideMayHaveFelt: string;
  partnerSideMayHaveFelt: string;
  whereItDerailed: string;
  repairMessage: string;
  questionToAskLater: string;
  nextBestAction: string;
};

export type PlannerResult = {
  opener: string;
  keyPoints: string[];
  sensitiveSpots: string[];
  calmResponses: { ifTheySay: string; youCanSay: string }[];
  closingRequest: string;
};

export type CheckInResult = {
  reflection: string;
  partnerMessage: string;
  connectionAction: string;
};

export class CoachError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function call<T>(path: CoachTool, body: unknown, passcode?: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/api/coach/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(passcode ? { "x-app-passcode": passcode } : {}),
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new CoachError("Network error. Check your connection and try again.", 0);
  }

  let data: { result?: T; error?: string } = {};
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
  return data.result;
}

export const coach = {
  beforeSend: (message: string, passcode?: string) =>
    call<BeforeSendResult>("before-send", { message }, passcode),
  repair: (description: string, passcode?: string) =>
    call<RepairResult>("repair", { description }, passcode),
  planner: (
    input: { topic: string; goal: string; fear: string; desiredOutcome: string },
    passcode?: string,
  ) => call<PlannerResult>("planner", input, passcode),
  checkin: (
    input: { mood: string; gratitude: string; friction: string; want: string },
    passcode?: string,
  ) => call<CheckInResult>("checkin", input, passcode),
};
