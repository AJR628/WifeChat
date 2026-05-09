import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  LOOP_SOURCE_TOOLS,
  LOOP_STAGES,
  LOOP_STATUSES,
  type FollowUpReminder,
  type GeneratedArtifact,
  type JsonValue,
  type Loop,
  type LoopMessage,
  type LoopSourceTool,
  type LoopStage,
  type LoopStatus,
  type RelationshipProfile,
  type SavedLesson,
  type UserCommunicationProfile,
  type VoiceProfile,
} from "@/lib/loopModels";

export type MessageRole = "user" | "assistant";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  ts: number;
}

const STORAGE_VERSION = 2;
const VERSION_KEY = "wife_chat_v";
const LEGACY_MESSAGES_KEY = "wife_chat_messages";
const MESSAGES_KEY_PREFIX = "wife_chat_messages_";
const TONE_KEY = "wife_chat_tone";
const LOOPS_KEY = "wife_chat_loops_v1";
const RELATIONSHIP_PROFILES_KEY = "wife_chat_relationship_profiles_v1";
const USER_COMMUNICATION_PROFILE_KEY =
  "wife_chat_user_communication_profile_v1";
const VOICE_PROFILE_KEY = "wife_chat_voice_profile_v1";
const SAVED_LESSONS_KEY = "wife_chat_saved_lessons_v1";
const FOLLOW_UP_REMINDERS_KEY = "wife_chat_follow_up_reminders_v1";
const WIFECHAT_KEY_PREFIX = "wife_chat_";
const MAX_MESSAGES = 200;

export type Tone = "warmer" | "balanced" | "direct";

function keyFor(tool: string): string {
  return `${MESSAGES_KEY_PREFIX}${tool}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

function isOptionalNumber(value: unknown): value is number | undefined {
  return value === undefined || typeof value === "number";
}

function isLoopStage(value: unknown): value is LoopStage {
  return LOOP_STAGES.includes(value as LoopStage);
}

function isLoopStatus(value: unknown): value is LoopStatus {
  return LOOP_STATUSES.includes(value as LoopStatus);
}

function isLoopSourceTool(value: unknown): value is LoopSourceTool {
  return LOOP_SOURCE_TOOLS.includes(value as LoopSourceTool);
}

function isOptionalLoopSourceTool(
  value: unknown,
): value is LoopSourceTool | undefined {
  return value === undefined || isLoopSourceTool(value);
}

function isJsonValue(value: unknown): value is JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return true;
  }
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (!isRecord(value)) return false;
  return Object.values(value).every(isJsonValue);
}

function isGeneratedArtifact(value: unknown): value is GeneratedArtifact {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    isOptionalString(value.loopId) &&
    isLoopSourceTool(value.sourceTool) &&
    typeof value.createdAt === "number" &&
    typeof value.title === "string" &&
    isJsonValue(value.payload) &&
    (value.saved === undefined || typeof value.saved === "boolean")
  );
}

function isLoopMessage(value: unknown): value is LoopMessage {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    (value.role === "user" || value.role === "assistant") &&
    typeof value.content === "string" &&
    typeof value.createdAt === "number" &&
    isOptionalLoopSourceTool(value.sourceTool)
  );
}

function isSavedLesson(value: unknown): value is SavedLesson {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    isOptionalString(value.loopId) &&
    isOptionalString(value.relationshipProfileId) &&
    typeof value.createdAt === "number" &&
    typeof value.text === "string" &&
    typeof value.appliesToFutureCoaching === "boolean"
  );
}

function isFollowUpReminder(value: unknown): value is FollowUpReminder {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.loopId === "string" &&
    typeof value.createdAt === "number" &&
    typeof value.dueAt === "number" &&
    typeof value.label === "string" &&
    isOptionalNumber(value.completedAt)
  );
}

function isLoop(value: unknown): value is Loop {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    isOptionalString(value.relationshipProfileId) &&
    isOptionalString(value.relationshipType) &&
    typeof value.createdAt === "number" &&
    typeof value.updatedAt === "number" &&
    isLoopStage(value.stage) &&
    isLoopStatus(value.status) &&
    isOptionalLoopSourceTool(value.sourceTool) &&
    typeof value.whatHappened === "string" &&
    typeof value.emotion === "string" &&
    typeof value.interpretation === "string" &&
    typeof value.need === "string" &&
    typeof value.consideringDoing === "string" &&
    typeof value.nextStep === "string" &&
    Array.isArray(value.generatedArtifacts) &&
    value.generatedArtifacts.every(isGeneratedArtifact) &&
    Array.isArray(value.messages) &&
    value.messages.every(isLoopMessage) &&
    (value.followUpReminder === undefined ||
      isFollowUpReminder(value.followUpReminder)) &&
    (value.savedLesson === undefined || isSavedLesson(value.savedLesson)) &&
    isOptionalString(value.outcome)
  );
}

function isUserCommunicationProfile(
  value: unknown,
): value is UserCommunicationProfile {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.createdAt === "number" &&
    typeof value.updatedAt === "number" &&
    isStringArray(value.conflictPatterns) &&
    isStringArray(value.growthGoals) &&
    isStringArray(value.coachingPreferences) &&
    isStringArray(value.userRules)
  );
}

function isVoiceProfile(value: unknown): value is VoiceProfile {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.createdAt === "number" &&
    typeof value.updatedAt === "number" &&
    isStringArray(value.styleNotes) &&
    (value.messageLengthPreference === undefined ||
      value.messageLengthPreference === "short" ||
      value.messageLengthPreference === "medium" ||
      value.messageLengthPreference === "detailed") &&
    (value.warmthPreference === undefined ||
      value.warmthPreference === "warmer" ||
      value.warmthPreference === "balanced" ||
      value.warmthPreference === "direct") &&
    isStringArray(value.phrasesToUse) &&
    isStringArray(value.phrasesToAvoid)
  );
}

function isRelationshipProfile(value: unknown): value is RelationshipProfile {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.relationshipType === "string" &&
    typeof value.createdAt === "number" &&
    typeof value.updatedAt === "number" &&
    typeof value.preferredTone === "string" &&
    isStringArray(value.whatHelpsCommunication) &&
    isStringArray(value.whatUsuallyMakesThingsWorse) &&
    typeof value.currentContext === "string" &&
    isStringArray(value.commonPatterns) &&
    typeof value.bestRepairStyle === "string" &&
    isStringArray(value.savedLessonIds)
  );
}

function parseArray<T>(
  raw: string | null,
  itemGuard: (value: unknown) => value is T,
): T[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(itemGuard);
  } catch {
    return [];
  }
}

function parseNullable<T>(
  raw: string | null,
  guard: (value: unknown) => value is T,
): T | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return guard(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function loadArray<T>(
  key: string,
  itemGuard: (value: unknown) => value is T,
): Promise<T[]> {
  try {
    await ensureVersion();
    return parseArray(await AsyncStorage.getItem(key), itemGuard);
  } catch {
    return [];
  }
}

async function saveJson(key: string, value: unknown): Promise<void> {
  try {
    await ensureVersion();
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* noop */
  }
}

async function loadNullable<T>(
  key: string,
  guard: (value: unknown) => value is T,
): Promise<T | null> {
  try {
    await ensureVersion();
    return parseNullable(await AsyncStorage.getItem(key), guard);
  } catch {
    return null;
  }
}

async function saveNullable(key: string, value: unknown | null): Promise<void> {
  try {
    await ensureVersion();
    if (value === null) {
      await AsyncStorage.removeItem(key);
      return;
    }
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* noop */
  }
}

async function ensureVersion(): Promise<void> {
  const current = await AsyncStorage.getItem(VERSION_KEY);
  const v = current ? parseInt(current, 10) : 0;
  if (v < STORAGE_VERSION) {
    await AsyncStorage.removeItem(LEGACY_MESSAGES_KEY);
    await AsyncStorage.setItem(VERSION_KEY, String(STORAGE_VERSION));
  }
}

export async function loadMessages(tool: string): Promise<Message[]> {
  try {
    await ensureVersion();
    const raw = await AsyncStorage.getItem(keyFor(tool));
    if (!raw) return [];
    const list = JSON.parse(raw) as Message[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function saveMessages(
  tool: string,
  messages: Message[],
): Promise<void> {
  try {
    await ensureVersion();
    const trimmed =
      messages.length > MAX_MESSAGES
        ? messages.slice(-MAX_MESSAGES)
        : messages;
    await AsyncStorage.setItem(keyFor(tool), JSON.stringify(trimmed));
  } catch {
    /* noop */
  }
}

export async function clearMessages(tool: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(keyFor(tool));
  } catch {
    /* noop */
  }
}

export async function loadTone(): Promise<Tone> {
  try {
    const raw = await AsyncStorage.getItem(TONE_KEY);
    if (raw === "warmer" || raw === "balanced" || raw === "direct") return raw;
    return "balanced";
  } catch {
    return "balanced";
  }
}

export async function saveTone(t: Tone): Promise<void> {
  try {
    await AsyncStorage.setItem(TONE_KEY, t);
  } catch {
    /* noop */
  }
}

export function loadLoops(): Promise<Loop[]> {
  return loadArray(LOOPS_KEY, isLoop);
}

export function saveLoops(loops: Loop[]): Promise<void> {
  return saveJson(LOOPS_KEY, loops);
}

export function loadRelationshipProfiles(): Promise<RelationshipProfile[]> {
  return loadArray(RELATIONSHIP_PROFILES_KEY, isRelationshipProfile);
}

export function saveRelationshipProfiles(
  profiles: RelationshipProfile[],
): Promise<void> {
  return saveJson(RELATIONSHIP_PROFILES_KEY, profiles);
}

export function loadUserCommunicationProfile(): Promise<UserCommunicationProfile | null> {
  return loadNullable(
    USER_COMMUNICATION_PROFILE_KEY,
    isUserCommunicationProfile,
  );
}

export function saveUserCommunicationProfile(
  profile: UserCommunicationProfile | null,
): Promise<void> {
  return saveNullable(USER_COMMUNICATION_PROFILE_KEY, profile);
}

export function loadVoiceProfile(): Promise<VoiceProfile | null> {
  return loadNullable(VOICE_PROFILE_KEY, isVoiceProfile);
}

export function saveVoiceProfile(profile: VoiceProfile | null): Promise<void> {
  return saveNullable(VOICE_PROFILE_KEY, profile);
}

export function loadSavedLessons(): Promise<SavedLesson[]> {
  return loadArray(SAVED_LESSONS_KEY, isSavedLesson);
}

export function saveSavedLessons(lessons: SavedLesson[]): Promise<void> {
  return saveJson(SAVED_LESSONS_KEY, lessons);
}

export function loadFollowUpReminders(): Promise<FollowUpReminder[]> {
  return loadArray(FOLLOW_UP_REMINDERS_KEY, isFollowUpReminder);
}

export function saveFollowUpReminders(
  reminders: FollowUpReminder[],
): Promise<void> {
  return saveJson(FOLLOW_UP_REMINDERS_KEY, reminders);
}

export async function clearAllWifeChatLocalData(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const wifeChatKeys = keys.filter((key) =>
      key.startsWith(WIFECHAT_KEY_PREFIX),
    );
    if (wifeChatKeys.length > 0) {
      await AsyncStorage.multiRemove(wifeChatKeys);
    }
  } catch {
    /* noop */
  }
}

export function newMessageId(): string {
  return Date.now().toString() + Math.random().toString(36).substring(2, 11);
}
