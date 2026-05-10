import type { RealityCheckRequest } from "@workspace/api-client-react";

import type { GeneratedArtifact, JsonValue, Loop } from "@/lib/loopModels";

export type RealityCheckPlatform = "ios" | "android" | "web";

export type BuildRealityCheckEnvelopeInput = {
  loop: Loop;
  requestText: string;
  platform?: RealityCheckPlatform;
};

type RealityCheckContext = NonNullable<RealityCheckRequest["context"]>;
type RealityCheckLoopContext = NonNullable<RealityCheckContext["loopContext"]>;
type RealityCheckLoopMessage = NonNullable<
  RealityCheckLoopContext["recentMessages"]
>[number];

export const REALITY_CHECK_REQUEST_TEXT_MAX = 4000;
export const REALITY_CHECK_ENVELOPE_TARGET_MAX = 10000;
export const REALITY_CHECK_RECENT_MESSAGES_MAX = 8;
export const REALITY_CHECK_RECENT_MESSAGES_PRUNED_MAX = 4;
export const REALITY_CHECK_RECENT_MESSAGE_CONTENT_MAX = 750;
export const REALITY_CHECK_PRIOR_ARTIFACTS_MAX = 2;
export const REALITY_CHECK_PRIOR_ARTIFACTS_SUMMARY_MAX = 1000;

const LOOP_FIELD_LIMITS = {
  loopId: 200,
  title: 500,
  relationshipProfileId: 200,
  relationshipType: 500,
  whatHappened: 2000,
  emotion: 500,
  interpretation: 1000,
  need: 500,
  consideringDoing: 500,
  nextStep: 300,
  outcome: 500,
} as const;

const LOOP_FIELD_PRUNE_LIMITS = {
  whatHappened: 1000,
  interpretation: 500,
  need: 300,
  consideringDoing: 300,
  nextStep: 200,
  outcome: 200,
} as const;

export function buildRealityCheckEnvelope(
  input: BuildRealityCheckEnvelopeInput,
): RealityCheckRequest {
  const requestText = trimToMax(
    input.requestText,
    REALITY_CHECK_REQUEST_TEXT_MAX,
  );

  if (!requestText) {
    throw new Error("Reality Check request text is required.");
  }

  const loopContext = buildLoopContext(input.loop);
  const context: RealityCheckContext = { loopContext };
  const envelope: RealityCheckRequest = {
    action: "reality-check",
    request: { text: requestText },
    context,
    clientMeta: {
      ...(input.platform ? { platform: input.platform } : {}),
      sourceSurface: "mobile",
      localContextVersion: 1,
    },
  };

  return pruneEnvelope(envelope);
}

function buildLoopContext(loop: Loop): RealityCheckLoopContext {
  const loopContext: RealityCheckLoopContext = {
    sourceTool: "reality-check",
    stage: loop.stage,
    status: loop.status,
  };

  setString(loopContext, "loopId", loop.id, LOOP_FIELD_LIMITS.loopId);
  setString(loopContext, "title", loop.title, LOOP_FIELD_LIMITS.title);
  setString(
    loopContext,
    "relationshipProfileId",
    loop.relationshipProfileId,
    LOOP_FIELD_LIMITS.relationshipProfileId,
  );
  setString(
    loopContext,
    "relationshipType",
    loop.relationshipType,
    LOOP_FIELD_LIMITS.relationshipType,
  );
  setString(
    loopContext,
    "whatHappened",
    loop.whatHappened,
    LOOP_FIELD_LIMITS.whatHappened,
  );
  setString(loopContext, "emotion", loop.emotion, LOOP_FIELD_LIMITS.emotion);
  setString(
    loopContext,
    "interpretation",
    loop.interpretation,
    LOOP_FIELD_LIMITS.interpretation,
  );
  setString(loopContext, "need", loop.need, LOOP_FIELD_LIMITS.need);
  setString(
    loopContext,
    "consideringDoing",
    loop.consideringDoing,
    LOOP_FIELD_LIMITS.consideringDoing,
  );
  setString(loopContext, "nextStep", loop.nextStep, LOOP_FIELD_LIMITS.nextStep);
  setString(loopContext, "outcome", loop.outcome, LOOP_FIELD_LIMITS.outcome);

  const recentMessages = buildRecentMessages(loop);
  if (recentMessages.length > 0) {
    loopContext.recentMessages = recentMessages;
  }

  const priorArtifactsSummary = buildPriorArtifactsSummary(loop);
  if (priorArtifactsSummary) {
    loopContext.priorArtifactsSummary = priorArtifactsSummary;
  }

  return loopContext;
}

function buildRecentMessages(loop: Loop): RealityCheckLoopMessage[] {
  const recentMessages: RealityCheckLoopMessage[] = [];

  for (const message of loop.messages.slice(-REALITY_CHECK_RECENT_MESSAGES_MAX)) {
    const content = trimToMax(
      message.content,
      REALITY_CHECK_RECENT_MESSAGE_CONTENT_MAX,
    );
    if (!content) continue;

    recentMessages.push({
      role: message.role,
      content,
      ...(message.sourceTool ? { sourceTool: message.sourceTool } : {}),
      createdAt: message.createdAt,
    });
  }

  return recentMessages;
}

function buildPriorArtifactsSummary(loop: Loop): string | undefined {
  const summaries = loop.generatedArtifacts
    .slice(-REALITY_CHECK_PRIOR_ARTIFACTS_MAX)
    .map(formatArtifactSummary)
    .filter((summary) => summary.length > 0);

  return trimOptional(
    summaries.join("\n"),
    REALITY_CHECK_PRIOR_ARTIFACTS_SUMMARY_MAX,
  );
}

function formatArtifactSummary(artifact: GeneratedArtifact): string {
  const parts = [
    artifact.sourceTool,
    trimOptional(artifact.title, 120),
    formatDate(artifact.createdAt),
  ].filter((part): part is string => Boolean(part));

  const text = getPayloadText(artifact.payload);
  const label = parts.join(" | ");
  if (!text) return label;
  return `${label}: ${trimToMax(text, 280)}`;
}

function getPayloadText(payload: JsonValue): string | undefined {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    return undefined;
  }

  const text = payload.text;
  return typeof text === "string" ? text : undefined;
}

function pruneEnvelope(envelope: RealityCheckRequest): RealityCheckRequest {
  if (serializedLength(envelope) <= REALITY_CHECK_ENVELOPE_TARGET_MAX) {
    return envelope;
  }

  const loopContext = envelope.context?.loopContext;
  if (!loopContext) return envelope;

  delete loopContext.priorArtifactsSummary;
  if (serializedLength(envelope) <= REALITY_CHECK_ENVELOPE_TARGET_MAX) {
    return envelope;
  }

  if (loopContext.recentMessages?.length) {
    loopContext.recentMessages = loopContext.recentMessages.slice(
      -REALITY_CHECK_RECENT_MESSAGES_PRUNED_MAX,
    );
  }
  if (serializedLength(envelope) <= REALITY_CHECK_ENVELOPE_TARGET_MAX) {
    return envelope;
  }

  delete loopContext.recentMessages;
  if (serializedLength(envelope) <= REALITY_CHECK_ENVELOPE_TARGET_MAX) {
    return envelope;
  }

  for (const [field, maxLength] of Object.entries(LOOP_FIELD_PRUNE_LIMITS)) {
    const key = field as keyof typeof LOOP_FIELD_PRUNE_LIMITS;
    const value = loopContext[key];
    if (typeof value === "string") {
      loopContext[key] = trimToMax(value, maxLength);
    }
    if (serializedLength(envelope) <= REALITY_CHECK_ENVELOPE_TARGET_MAX) {
      return envelope;
    }
  }

  if (serializedLength(envelope) > REALITY_CHECK_ENVELOPE_TARGET_MAX) {
    throw new Error("Reality Check context is too large to send safely.");
  }

  return envelope;
}

function setString<K extends keyof RealityCheckLoopContext>(
  target: RealityCheckLoopContext,
  key: K,
  value: string | undefined,
  maxLength: number,
): void {
  const trimmed = trimOptional(value, maxLength);
  if (trimmed) {
    target[key] = trimmed as RealityCheckLoopContext[K];
  }
}

function trimOptional(value: string | undefined, maxLength: number): string | undefined {
  const trimmed = trimToMax(value ?? "", maxLength);
  return trimmed || undefined;
}

function trimToMax(value: string, maxLength: number): string {
  const trimmed = value.trim();
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

function serializedLength(value: unknown): number {
  return JSON.stringify(value).length;
}

function formatDate(value: number): string | undefined {
  if (!Number.isFinite(value)) return undefined;
  return new Date(value).toISOString().slice(0, 10);
}
