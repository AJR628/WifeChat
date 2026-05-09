export const LOOP_STAGES = [
  "untangle",
  "decide",
  "prepare",
  "act",
  "close",
] as const;

export type LoopStage = (typeof LOOP_STAGES)[number];

export const LOOP_STATUSES = [
  "open",
  "paused",
  "needsFollowUp",
  "partlyResolved",
  "resolved",
  "letGo",
] as const;

export type LoopStatus = (typeof LOOP_STATUSES)[number];

export const LOOP_SOURCE_TOOLS = [
  "reality-check",
  "before-send",
  "repair",
  "planner",
  "checkin",
  "practice",
] as const;

export type LoopSourceTool = (typeof LOOP_SOURCE_TOOLS)[number];

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface GeneratedArtifact {
  id: string;
  loopId?: string;
  sourceTool: LoopSourceTool;
  createdAt: number;
  title: string;
  payload: JsonValue;
  saved?: boolean;
}

export type LoopMessageRole = "user" | "assistant";

export interface LoopMessage {
  id: string;
  role: LoopMessageRole;
  content: string;
  createdAt: number;
  sourceTool?: LoopSourceTool;
}

export interface SavedLesson {
  id: string;
  loopId?: string;
  relationshipProfileId?: string;
  createdAt: number;
  text: string;
  appliesToFutureCoaching: boolean;
}

export interface FollowUpReminder {
  id: string;
  loopId: string;
  createdAt: number;
  dueAt: number;
  label: string;
  completedAt?: number;
}

export interface Loop {
  id: string;
  title: string;
  relationshipProfileId?: string;
  relationshipType?: string;
  createdAt: number;
  updatedAt: number;
  stage: LoopStage;
  status: LoopStatus;
  sourceTool?: LoopSourceTool;
  whatHappened: string;
  emotion: string;
  interpretation: string;
  need: string;
  consideringDoing: string;
  nextStep: string;
  generatedArtifacts: GeneratedArtifact[];
  messages: LoopMessage[];
  followUpReminder?: FollowUpReminder;
  savedLesson?: SavedLesson;
  outcome?: string;
}

export interface UserCommunicationProfile {
  id: string;
  createdAt: number;
  updatedAt: number;
  conflictPatterns: string[];
  growthGoals: string[];
  coachingPreferences: string[];
  userRules: string[];
}

export interface VoiceProfile {
  id: string;
  createdAt: number;
  updatedAt: number;
  styleNotes: string[];
  messageLengthPreference?: "short" | "medium" | "detailed";
  warmthPreference?: "warmer" | "balanced" | "direct";
  phrasesToUse: string[];
  phrasesToAvoid: string[];
}

export interface RelationshipProfile {
  id: string;
  name: string;
  relationshipType: string;
  createdAt: number;
  updatedAt: number;
  preferredTone: string;
  whatHelpsCommunication: string[];
  whatUsuallyMakesThingsWorse: string[];
  currentContext: string;
  commonPatterns: string[];
  bestRepairStyle: string;
  savedLessonIds: string[];
}
