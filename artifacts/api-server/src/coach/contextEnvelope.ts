import {
  RealityCheckBody,
  type RealityCheckRequest,
} from "@workspace/api-zod";

const MAX_ENVELOPE_CHARS = 12_000;

type ParseResult =
  | {
      ok: true;
      data: RealityCheckRequest;
      safetyTexts: string[];
      metadata: RealityCheckEnvelopeMetadata;
    }
  | { ok: false; error: string };

export type RealityCheckEnvelopeMetadata = {
  envelopeChars: number;
  hasUserCommunicationProfile: boolean;
  hasVoiceProfile: boolean;
  hasRelationshipProfile: boolean;
  hasLoopContext: boolean;
  savedLessonCount: number;
  recentMessageCount: number;
};

type Shape =
  | true
  | {
      keys: Record<string, Shape>;
    }
  | {
      arrayOf: Shape;
    };

const stringLeaf: Shape = true;

const shortStringArray: Shape = { arrayOf: stringLeaf };

const loopSourceTool = stringLeaf;

const strictShape: Shape = {
  keys: {
    action: stringLeaf,
    request: {
      keys: {
        text: stringLeaf,
      },
    },
    context: {
      keys: {
        userCommunicationProfile: {
          keys: {
            conflictPatterns: shortStringArray,
            growthGoals: shortStringArray,
            coachingPreferences: shortStringArray,
            userRules: shortStringArray,
          },
        },
        voiceProfile: {
          keys: {
            styleNotes: shortStringArray,
            messageLengthPreference: stringLeaf,
            warmthPreference: stringLeaf,
            phrasesToUse: shortStringArray,
            phrasesToAvoid: shortStringArray,
          },
        },
        relationshipProfile: {
          keys: {
            relationshipProfileId: stringLeaf,
            relationshipType: stringLeaf,
            preferredTone: stringLeaf,
            whatHelpsCommunication: shortStringArray,
            whatUsuallyMakesThingsWorse: shortStringArray,
            currentContext: stringLeaf,
            commonPatterns: shortStringArray,
            bestRepairStyle: stringLeaf,
            savedLessonSummaries: shortStringArray,
          },
        },
        loopContext: {
          keys: {
            loopId: stringLeaf,
            title: stringLeaf,
            relationshipProfileId: stringLeaf,
            relationshipType: stringLeaf,
            stage: stringLeaf,
            status: stringLeaf,
            sourceTool: loopSourceTool,
            whatHappened: stringLeaf,
            emotion: stringLeaf,
            interpretation: stringLeaf,
            need: stringLeaf,
            consideringDoing: stringLeaf,
            nextStep: stringLeaf,
            outcome: stringLeaf,
            recentMessages: {
              arrayOf: {
                keys: {
                  role: stringLeaf,
                  content: stringLeaf,
                  sourceTool: loopSourceTool,
                  createdAt: true,
                },
              },
            },
            priorArtifactsSummary: stringLeaf,
          },
        },
        savedLessons: {
          arrayOf: {
            keys: {
              text: stringLeaf,
              relationshipProfileId: stringLeaf,
              loopId: stringLeaf,
            },
          },
        },
      },
    },
    clientMeta: {
      keys: {
        platform: stringLeaf,
        sourceSurface: stringLeaf,
        localContextVersion: true,
      },
    },
  },
};

export function parseRealityCheckEnvelope(body: unknown): ParseResult {
  const unknownKey = findUnknownKey(body, strictShape, "body");
  if (unknownKey) {
    return { ok: false, error: `unknown field: ${unknownKey}` };
  }

  const normalized = normalizeStrings(body);
  const envelopeChars = JSON.stringify(normalized).length;
  if (envelopeChars > MAX_ENVELOPE_CHARS) {
    return { ok: false, error: `request envelope exceeds ${MAX_ENVELOPE_CHARS} characters` };
  }

  const parsed = RealityCheckBody.safeParse(normalized);
  if (!parsed.success) {
    return { ok: false, error: "invalid Reality Check request" };
  }

  if (
    parsed.data.clientMeta?.localContextVersion !== undefined
    && parsed.data.clientMeta.localContextVersion !== 1
  ) {
    return { ok: false, error: "clientMeta.localContextVersion must be 1" };
  }
  const data = parsed.data as RealityCheckRequest;

  return {
    ok: true,
    data,
    safetyTexts: extractRealityCheckSafetyTexts(data),
    metadata: buildMetadata(data, envelopeChars),
  };
}

export function extractRealityCheckSafetyTexts(data: RealityCheckRequest): string[] {
  const texts: string[] = [];
  const add = (value: unknown): void => {
    if (typeof value === "string" && value.trim().length > 0) texts.push(value);
  };
  const addArray = (values: unknown): void => {
    if (Array.isArray(values)) {
      for (const value of values) add(value);
    }
  };

  add(data.request.text);

  const userProfile = data.context?.userCommunicationProfile;
  addArray(userProfile?.conflictPatterns);
  addArray(userProfile?.growthGoals);
  addArray(userProfile?.coachingPreferences);
  addArray(userProfile?.userRules);

  const voiceProfile = data.context?.voiceProfile;
  addArray(voiceProfile?.styleNotes);
  add(voiceProfile?.messageLengthPreference);
  add(voiceProfile?.warmthPreference);
  addArray(voiceProfile?.phrasesToUse);
  addArray(voiceProfile?.phrasesToAvoid);

  const relationshipProfile = data.context?.relationshipProfile;
  add(relationshipProfile?.relationshipType);
  add(relationshipProfile?.preferredTone);
  addArray(relationshipProfile?.whatHelpsCommunication);
  addArray(relationshipProfile?.whatUsuallyMakesThingsWorse);
  add(relationshipProfile?.currentContext);
  addArray(relationshipProfile?.commonPatterns);
  add(relationshipProfile?.bestRepairStyle);
  addArray(relationshipProfile?.savedLessonSummaries);

  const loopContext = data.context?.loopContext;
  add(loopContext?.title);
  add(loopContext?.relationshipType);
  add(loopContext?.whatHappened);
  add(loopContext?.emotion);
  add(loopContext?.interpretation);
  add(loopContext?.need);
  add(loopContext?.consideringDoing);
  add(loopContext?.nextStep);
  add(loopContext?.outcome);
  add(loopContext?.priorArtifactsSummary);
  for (const message of loopContext?.recentMessages ?? []) {
    add(message.content);
  }

  for (const lesson of data.context?.savedLessons ?? []) {
    add(lesson.text);
  }

  return texts;
}

function buildMetadata(
  data: RealityCheckRequest,
  envelopeChars: number,
): RealityCheckEnvelopeMetadata {
  return {
    envelopeChars,
    hasUserCommunicationProfile: data.context?.userCommunicationProfile !== undefined,
    hasVoiceProfile: data.context?.voiceProfile !== undefined,
    hasRelationshipProfile: data.context?.relationshipProfile !== undefined,
    hasLoopContext: data.context?.loopContext !== undefined,
    savedLessonCount: data.context?.savedLessons?.length ?? 0,
    recentMessageCount: data.context?.loopContext?.recentMessages?.length ?? 0,
  };
}

function normalizeStrings(value: unknown): unknown {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return value.map((item) => normalizeStrings(item));
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      out[key] = normalizeStrings(child);
    }
    return out;
  }
  return value;
}

function findUnknownKey(value: unknown, shape: Shape, path: string): string | null {
  if (shape === true) return null;

  if ("arrayOf" in shape) {
    if (!Array.isArray(value)) return null;
    for (let i = 0; i < value.length; i += 1) {
      const found = findUnknownKey(value[i], shape.arrayOf, `${path}[${i}]`);
      if (found) return found;
    }
    return null;
  }

  if (!isPlainObject(value)) return null;

  for (const key of Object.keys(value)) {
    if (!(key in shape.keys)) return `${path}.${key}`;
  }

  for (const [key, childShape] of Object.entries(shape.keys)) {
    if (key in value) {
      const found = findUnknownKey(value[key], childShape, `${path}.${key}`);
      if (found) return found;
    }
  }

  return null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
