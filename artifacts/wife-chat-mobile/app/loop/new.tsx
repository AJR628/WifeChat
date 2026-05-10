import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { RealityCheckResult } from "@workspace/api-client-react";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useColors } from "@/hooks/useColors";
import { buildRealityCheckEnvelope } from "@/lib/coachContext";
import { CoachError, sendRealityCheck } from "@/lib/coach";
import type { GeneratedArtifact, LoopMessage } from "@/lib/loopModels";
import {
  appendLoopInteraction,
  createLoop,
  getLoop,
  updateLoop,
} from "@/lib/loopStore";
import type { UpdateLoopInput } from "@/lib/loopStore";
import { newMessageId } from "@/lib/storage";

const RELATIONSHIP_TYPES = [
  "Partner / Spouse",
  "Family",
  "Friend",
  "Coworker",
  "Other",
];

function localId(): string {
  return newMessageId();
}

function formatShortDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString("en-US", { month: "short", day: "numeric" });
}

function formatRealityCheckText(result: RealityCheckResult): string {
  const parts: string[] = [
    `What seems understandable:\n${result.whatSeemsUnderstandable}`,
    `Where to slow down:\n${result.whatToSlowDownOn}`,
  ];
  if (result.factsVsAssumptions.length > 0) {
    const items = result.factsVsAssumptions.map((s) => `• ${s}`).join("\n");
    parts.push(`Facts vs. assumptions:\n${items}`);
  }
  parts.push(
    `Boundary or safety check:\n${result.boundaryOrSafetyCheck}`,
    `What you likely need:\n${result.likelyNeed}`,
    `Next best step:\n${result.nextBestStep}`,
    `Suggested path: ${result.suggestedPath}`,
  );
  if (result.optionalDraft) {
    parts.push(`A possible message:\n${result.optionalDraft}`);
  }
  return parts.join("\n\n");
}

function safeUserFacingError(err: unknown): string {
  if (err instanceof CoachError) {
    if (err.status === 0)
      return "Network error. Check your connection and try again.";
    if (err.status === 429)
      return "Too many requests. Please wait a moment and try again.";
    if (err.status === 503)
      return "The assistant is temporarily unavailable. Please try again later.";
  }
  return "Couldn't reach the assistant. Your loop is saved — tap Get perspective to try again, or continue without AI.";
}

export default function NewLoopScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isWeb = Platform.OS === "web";

  const [title, setTitle] = useState("");
  const [whatHappened, setWhatHappened] = useState("");
  const [emotion, setEmotion] = useState("");
  const [interpretation, setInterpretation] = useState("");
  const [need, setNeed] = useState("");
  const [consideringDoing, setConsideringDoing] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [relationshipType, setRelationshipType] = useState("");
  const [showMore, setShowMore] = useState(false);

  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [savedLoopId, setSavedLoopId] = useState<string | null>(null);

  const canProceed =
    whatHappened.trim().length > 0 && !aiLoading && !saving;

  async function saveCurrentLoopDraft() {
    const fields = {
      whatHappened: whatHappened.trim(),
      emotion: emotion.trim(),
      interpretation: interpretation.trim(),
      need: need.trim(),
      consideringDoing: consideringDoing.trim(),
      nextStep: nextStep.trim(),
      relationshipType: relationshipType || undefined,
    };

    if (savedLoopId) {
      const updateData: UpdateLoopInput = { ...fields };
      if (title.trim()) {
        updateData.title = title.trim();
      }
      const updated = await updateLoop(savedLoopId, updateData);
      if (!updated) throw new Error("Could not update loop.");
      return updated;
    } else {
      const loop = await createLoop({
        title: title.trim() || undefined,
        ...fields,
      });
      setSavedLoopId(loop.id);
      return loop;
    }
  }

  async function handleGetPerspective() {
    if (!canProceed) return;
    setAiLoading(true);
    setAiError(null);
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    try {
      const loop = await saveCurrentLoopDraft();

      const platform: "ios" | "android" | "web" =
        Platform.OS === "ios"
          ? "ios"
          : Platform.OS === "android"
            ? "android"
            : "web";

      const envelope = buildRealityCheckEnvelope({
        loop,
        requestText: loop.whatHappened,
        platform,
      });

      const response = await sendRealityCheck(envelope);
      const now = Date.now();
      const resultText = formatRealityCheckText(response.result);

      const userMsg: LoopMessage = {
        id: localId(),
        role: "user",
        content: loop.whatHappened.slice(0, 750),
        createdAt: now,
        sourceTool: "reality-check",
      };

      const assistantMsg: LoopMessage = {
        id: localId(),
        role: "assistant",
        content: resultText,
        createdAt: now + 1,
        sourceTool: "reality-check",
      };

      const artifact: GeneratedArtifact = {
        id: localId(),
        loopId: loop.id,
        sourceTool: "reality-check",
        createdAt: now,
        title: `Reality Check – ${formatShortDate(now)}`,
        payload: {
          whatSeemsUnderstandable: response.result.whatSeemsUnderstandable,
          whatToSlowDownOn: response.result.whatToSlowDownOn,
          factsVsAssumptions: response.result.factsVsAssumptions,
          boundaryOrSafetyCheck: response.result.boundaryOrSafetyCheck,
          likelyNeed: response.result.likelyNeed,
          nextBestStep: response.result.nextBestStep,
          suggestedPath: response.result.suggestedPath,
          ...(response.result.optionalDraft
            ? { optionalDraft: response.result.optionalDraft }
            : {}),
          text: resultText,
        },
      };

      await appendLoopInteraction(loop.id, userMsg, assistantMsg, artifact);
      router.replace(`/loop/${loop.id}`);
    } catch (err) {
      setAiError(safeUserFacingError(err));
      setAiLoading(false);
    }
  }

  async function handleSaveWithoutAI() {
    if (!canProceed) return;
    setSaving(true);
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    try {
      const loop = await saveCurrentLoopDraft();
      router.replace(`/loop/${loop.id}`);
    } finally {
      setSaving(false);
    }
  }

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, backgroundColor: colors.background },
        header: {
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingTop: (isWeb ? 0 : insets.top) + 12,
          paddingBottom: 12,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
          backgroundColor: colors.background,
        },
        backBtn: {
          width: 36,
          height: 36,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 10,
        },
        headerTitle: {
          flex: 1,
          textAlign: "center",
          fontSize: 16,
          fontFamily: "Inter_600SemiBold",
          color: colors.foreground,
        },
        scroll: { flex: 1 },
        scrollContent: {
          paddingHorizontal: 20,
          paddingTop: 24,
          paddingBottom: 40,
        },
        eyebrow: {
          fontSize: 12,
          fontFamily: "Inter_500Medium",
          color: colors.primary,
          letterSpacing: 0.4,
          textTransform: "uppercase",
          marginBottom: 6,
        },
        pageTitle: {
          fontSize: 22,
          fontFamily: "Inter_700Bold",
          color: colors.foreground,
          marginBottom: 4,
        },
        pageSub: {
          fontSize: 14,
          fontFamily: "Inter_400Regular",
          color: colors.mutedForeground,
          lineHeight: 20,
          marginBottom: 28,
        },
        fieldGroup: {
          marginBottom: 20,
        },
        label: {
          fontSize: 13,
          fontFamily: "Inter_600SemiBold",
          color: colors.foreground,
          marginBottom: 6,
        },
        labelOptional: {
          fontSize: 13,
          fontFamily: "Inter_400Regular",
          color: colors.mutedForeground,
        },
        hint: {
          fontSize: 12,
          fontFamily: "Inter_400Regular",
          color: colors.mutedForeground,
          marginBottom: 6,
        },
        input: {
          backgroundColor: colors.card,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          borderRadius: 10,
          paddingHorizontal: 14,
          paddingVertical: 12,
          fontSize: 15,
          fontFamily: "Inter_400Regular",
          color: colors.foreground,
        },
        inputMultiline: {
          minHeight: 90,
          textAlignVertical: "top",
        },
        showMoreRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingVertical: 10,
          marginBottom: 8,
        },
        showMoreText: {
          fontSize: 13,
          fontFamily: "Inter_500Medium",
          color: colors.primary,
        },
        divider: {
          height: StyleSheet.hairlineWidth,
          backgroundColor: colors.border,
          marginVertical: 16,
        },
        chipRow: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
        },
        chip: {
          paddingHorizontal: 12,
          paddingVertical: 7,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.card,
        },
        chipSelected: {
          backgroundColor: colors.accent,
          borderColor: colors.primary,
        },
        chipText: {
          fontSize: 13,
          fontFamily: "Inter_400Regular",
          color: colors.foreground,
        },
        chipTextSelected: {
          fontFamily: "Inter_600SemiBold",
          color: colors.primary,
        },
        errorBanner: {
          marginTop: 16,
          padding: 12,
          borderRadius: 10,
          backgroundColor: colors.muted,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 8,
        },
        errorBannerText: {
          flex: 1,
          fontSize: 13,
          fontFamily: "Inter_400Regular",
          color: colors.foreground,
          lineHeight: 18,
        },
        primaryBtn: {
          marginTop: 20,
          paddingVertical: 15,
          borderRadius: 12,
          backgroundColor: colors.primary,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 8,
        },
        primaryBtnDisabled: {
          backgroundColor: colors.muted,
        },
        primaryBtnText: {
          fontSize: 16,
          fontFamily: "Inter_600SemiBold",
          color: colors.primaryForeground,
        },
        primaryBtnTextDisabled: {
          color: colors.mutedForeground,
        },
        secondaryBtn: {
          marginTop: 10,
          paddingVertical: 13,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.background,
          alignItems: "center",
          justifyContent: "center",
        },
        secondaryBtnDisabled: {
          opacity: 0.5,
        },
        secondaryBtnText: {
          fontSize: 15,
          fontFamily: "Inter_500Medium",
          color: colors.foreground,
        },
        privacyNote: {
          marginTop: 20,
          padding: 14,
          borderRadius: 12,
          backgroundColor: colors.muted,
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 10,
        },
        privacyText: {
          flex: 1,
          fontSize: 12,
          lineHeight: 17,
          fontFamily: "Inter_400Regular",
          color: colors.mutedForeground,
        },
      }),
    [colors, insets.top, isWeb],
  );

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Feather name="x" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={styles.headerTitle}>Start a Loop</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAwareScrollViewCompat
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow}>New Loop</Text>
        <Text style={styles.pageTitle}>What's going on?</Text>
        <Text style={styles.pageSub}>
          Describe what happened. That's all you need to get perspective.
        </Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>What happened</Text>
          <Text style={styles.hint}>
            Describe the moment — just the facts, as best you can
          </Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={whatHappened}
            onChangeText={setWhatHappened}
            placeholder="Tell me what happened…"
            placeholderTextColor={colors.mutedForeground}
            multiline
            maxLength={2000}
            editable={!aiLoading && !saving}
          />
        </View>

        <Pressable
          onPress={() => setShowMore((v) => !v)}
          style={styles.showMoreRow}
          accessibilityRole="button"
          accessibilityLabel={showMore ? "Hide optional details" : "Add more context"}
        >
          <Feather
            name={showMore ? "chevron-up" : "chevron-down"}
            size={16}
            color={colors.primary}
          />
          <Text style={styles.showMoreText}>
            {showMore ? "Hide optional details" : "Add more context"}
          </Text>
        </Pressable>

        {showMore && (
          <>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Title{" "}
                <Text style={styles.labelOptional}>(optional)</Text>
              </Text>
              <Text style={styles.hint}>
                A short name — or leave blank to auto-generate
              </Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. The text that felt dismissive"
                placeholderTextColor={colors.mutedForeground}
                returnKeyType="next"
                maxLength={120}
                editable={!aiLoading && !saving}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>How are you feeling?</Text>
              <Text style={styles.hint}>
                Hurt, confused, frustrated, scared, uncertain…
              </Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={emotion}
                onChangeText={setEmotion}
                placeholder="I'm feeling…"
                placeholderTextColor={colors.mutedForeground}
                multiline
                maxLength={500}
                editable={!aiLoading && !saving}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>How are you interpreting it?</Text>
              <Text style={styles.hint}>
                What story are you telling yourself about this?
              </Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={interpretation}
                onChangeText={setInterpretation}
                placeholder="My interpretation is…"
                placeholderTextColor={colors.mutedForeground}
                multiline
                maxLength={1000}
                editable={!aiLoading && !saving}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>What do you need?</Text>
              <Text style={styles.hint}>
                Acknowledgment, space, clarity, an apology…
              </Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={need}
                onChangeText={setNeed}
                placeholder="What I need is…"
                placeholderTextColor={colors.mutedForeground}
                multiline
                maxLength={500}
                editable={!aiLoading && !saving}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>What are you considering doing?</Text>
              <Text style={styles.hint}>
                Texting them, waiting, apologizing, setting a boundary…
              </Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={consideringDoing}
                onChangeText={setConsideringDoing}
                placeholder="I'm thinking about…"
                placeholderTextColor={colors.mutedForeground}
                multiline
                maxLength={500}
                editable={!aiLoading && !saving}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Next step</Text>
              <Text style={styles.hint}>
                What's the one thing you'll do after closing this app?
              </Text>
              <TextInput
                style={styles.input}
                value={nextStep}
                onChangeText={setNextStep}
                placeholder="My next step is…"
                placeholderTextColor={colors.mutedForeground}
                returnKeyType="done"
                maxLength={300}
                editable={!aiLoading && !saving}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Relationship type</Text>
              <Text style={styles.hint}>Helps frame perspective</Text>
              <View style={styles.chipRow}>
                {RELATIONSHIP_TYPES.map((type) => {
                  const selected = relationshipType === type;
                  return (
                    <Pressable
                      key={type}
                      onPress={() => {
                        setRelationshipType(selected ? "" : type);
                        if (Platform.OS !== "web") {
                          Haptics.selectionAsync();
                        }
                      }}
                      style={[styles.chip, selected && styles.chipSelected]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      accessibilityLabel={type}
                      disabled={aiLoading || saving}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          selected && styles.chipTextSelected,
                        ]}
                      >
                        {type}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </>
        )}

        {aiError !== null && (
          <View style={styles.errorBanner}>
            <Feather
              name="alert-circle"
              size={14}
              color={colors.foreground}
              style={{ marginTop: 2 }}
            />
            <Text style={styles.errorBannerText}>{aiError}</Text>
          </View>
        )}

        <Pressable
          onPress={handleGetPerspective}
          disabled={!canProceed}
          style={[styles.primaryBtn, !canProceed && styles.primaryBtnDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Get perspective"
        >
          {aiLoading ? (
            <ActivityIndicator size="small" color={colors.mutedForeground} />
          ) : (
            <Text
              style={[
                styles.primaryBtnText,
                !canProceed && styles.primaryBtnTextDisabled,
              ]}
            >
              Get perspective
            </Text>
          )}
        </Pressable>

        <Pressable
          onPress={handleSaveWithoutAI}
          disabled={!canProceed}
          style={[styles.secondaryBtn, !canProceed && styles.secondaryBtnDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Save without AI"
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.mutedForeground} />
          ) : (
            <Text style={styles.secondaryBtnText}>Save without AI</Text>
          )}
        </Pressable>

        <View style={styles.privacyNote}>
          <Feather
            name="shield"
            size={14}
            color={colors.mutedForeground}
            style={{ marginTop: 1 }}
          />
          <Text style={styles.privacyText}>
            Saved on this device. When you tap Get perspective, the relevant
            text is sent to the WifeChat API and AI provider.
          </Text>
        </View>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}
