import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useColors } from "@/hooks/useColors";
import type { GeneratedArtifact, Loop, LoopStage, LoopStatus } from "@/lib/loopModels";
import { LOOP_STAGES } from "@/lib/loopModels";
import {
  closeLoop,
  getLoop,
  letGoLoop,
  markNeedsFollowUp,
  markPartlyResolved,
  pauseLoop,
  stageLabel,
  statusLabel,
  updateLoop,
} from "@/lib/loopStore";

const OPEN_STATUSES: LoopStatus[] = [
  "open",
  "paused",
  "needsFollowUp",
  "partlyResolved",
];

const CLOSED_STATUSES: LoopStatus[] = ["resolved", "letGo"];

const COACH_ACTIONS = [
  {
    key: "before-send" as const,
    title: "Before You Send",
    desc: "Improve a draft — softer, clearer, or shorter.",
    icon: "send" as const,
  },
  {
    key: "repair" as const,
    title: "Repair After a Fight",
    desc: "Find a small honest message that opens the door again.",
    icon: "heart" as const,
  },
  {
    key: "checkin" as const,
    title: "Daily Check-In",
    desc: "A two-minute ritual to notice, appreciate, and reach.",
    icon: "sun" as const,
  },
] as const;

function artifactToolLabel(sourceTool: string): string {
  switch (sourceTool) {
    case "before-send":
      return "Before You Send";
    case "repair":
      return "Repair After a Fight";
    case "checkin":
      return "Daily Check-In";
    default:
      return sourceTool;
  }
}

function artifactPreview(artifact: GeneratedArtifact): string {
  const payload = artifact.payload;
  if (
    payload !== null &&
    typeof payload === "object" &&
    !Array.isArray(payload) &&
    typeof (payload as Record<string, unknown>).text === "string"
  ) {
    const text = (payload as Record<string, string>).text;
    return text.length > 160 ? text.slice(0, 157) + "…" : text;
  }
  return "";
}

export default function LoopDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const [loop, setLoop] = useState<Loop | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [title, setTitle] = useState("");
  const [whatHappened, setWhatHappened] = useState("");
  const [emotion, setEmotion] = useState("");
  const [interpretation, setInterpretation] = useState("");
  const [need, setNeed] = useState("");
  const [consideringDoing, setConsideringDoing] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [outcome, setOutcome] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const loadLoop = useCallback(async () => {
    if (!id) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    const found = await getLoop(id);
    if (!found) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setLoop(found);
    setTitle(found.title);
    setWhatHappened(found.whatHappened);
    setEmotion(found.emotion);
    setInterpretation(found.interpretation);
    setNeed(found.need);
    setConsideringDoing(found.consideringDoing);
    setNextStep(found.nextStep);
    setOutcome(found.outcome ?? "");
    setDirty(false);
    setLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadLoop();
    }, [loadLoop]),
  );

  const handleSave = useCallback(async () => {
    if (!loop || !dirty || saving) return;
    setSaving(true);
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const updated = await updateLoop(loop.id, {
      title: title.trim() || loop.title,
      whatHappened: whatHappened.trim(),
      emotion: emotion.trim(),
      interpretation: interpretation.trim(),
      need: need.trim(),
      consideringDoing: consideringDoing.trim(),
      nextStep: nextStep.trim(),
      outcome: outcome.trim() || undefined,
    });
    if (updated) {
      setLoop(updated);
      setDirty(false);
    }
    setSaving(false);
  }, [
    loop,
    dirty,
    saving,
    title,
    whatHappened,
    emotion,
    interpretation,
    need,
    consideringDoing,
    nextStep,
    outcome,
  ]);

  const handleStageChange = useCallback(
    async (stage: LoopStage) => {
      if (!loop) return;
      if (Platform.OS !== "web") {
        await Haptics.selectionAsync();
      }
      const updated = await updateLoop(loop.id, { stage });
      if (updated) setLoop(updated);
    },
    [loop],
  );

  const handleAction = useCallback(
    async (action: "pause" | "needsFollowUp" | "partlyResolved" | "resolve" | "letGo") => {
      if (!loop) return;
      if (Platform.OS !== "web") {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      let updated: Loop | null = null;
      switch (action) {
        case "pause":
          updated = await pauseLoop(loop.id);
          break;
        case "needsFollowUp":
          updated = await markNeedsFollowUp(loop.id);
          break;
        case "partlyResolved":
          updated = await markPartlyResolved(loop.id);
          break;
        case "resolve":
          updated = await closeLoop(loop.id);
          break;
        case "letGo":
          updated = await letGoLoop(loop.id);
          break;
      }
      if (updated) {
        setLoop(updated);
        if (CLOSED_STATUSES.includes(updated.status)) {
          router.back();
        }
      }
    },
    [loop, router],
  );

  const confirmAction = useCallback(
    (
      label: string,
      message: string,
      action: "pause" | "needsFollowUp" | "partlyResolved" | "resolve" | "letGo",
    ) => {
      Alert.alert(label, message, [
        { text: "Cancel", style: "cancel" },
        {
          text: label,
          style: action === "letGo" ? "destructive" : "default",
          onPress: () => handleAction(action),
        },
      ]);
    },
    [handleAction],
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, backgroundColor: colors.background },
        centered: {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 32,
        },
        centeredText: {
          fontSize: 15,
          fontFamily: "Inter_400Regular",
          color: colors.mutedForeground,
          textAlign: "center",
          marginTop: 12,
        },
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
          fontSize: 15,
          fontFamily: "Inter_600SemiBold",
          color: colors.foreground,
          marginHorizontal: 8,
        },
        saveBtn: {
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: 10,
          backgroundColor: colors.primary,
          minWidth: 56,
          alignItems: "center",
        },
        saveBtnDisabled: {
          backgroundColor: colors.muted,
        },
        saveBtnText: {
          fontSize: 13,
          fontFamily: "Inter_600SemiBold",
          color: colors.primaryForeground,
        },
        scroll: { flex: 1 },
        scrollContent: {
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 48,
        },
        statusRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          marginBottom: 20,
          flexWrap: "wrap",
        },
        badge: {
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 20,
          backgroundColor: colors.accent,
        },
        badgeText: {
          fontSize: 12,
          fontFamily: "Inter_500Medium",
          color: colors.primary,
        },
        badgeMuted: {
          backgroundColor: colors.muted,
        },
        badgeMutedText: {
          color: colors.mutedForeground,
        },
        sectionLabel: {
          fontSize: 11,
          fontFamily: "Inter_500Medium",
          color: colors.mutedForeground,
          letterSpacing: 0.6,
          textTransform: "uppercase",
          marginBottom: 14,
          marginTop: 8,
        },
        fieldGroup: {
          marginBottom: 18,
        },
        label: {
          fontSize: 13,
          fontFamily: "Inter_600SemiBold",
          color: colors.foreground,
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
          minHeight: 80,
          textAlignVertical: "top",
        },
        divider: {
          height: StyleSheet.hairlineWidth,
          backgroundColor: colors.border,
          marginVertical: 20,
        },
        stageRow: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 4,
        },
        stageChip: {
          paddingHorizontal: 12,
          paddingVertical: 7,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.card,
        },
        stageChipActive: {
          backgroundColor: colors.accent,
          borderColor: colors.primary,
        },
        stageChipText: {
          fontSize: 13,
          fontFamily: "Inter_400Regular",
          color: colors.foreground,
        },
        stageChipTextActive: {
          fontFamily: "Inter_600SemiBold",
          color: colors.primary,
        },
        artifactCard: {
          backgroundColor: colors.card,
          borderRadius: 12,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          padding: 14,
          marginBottom: 10,
        },
        artifactCardHeader: {
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
        },
        artifactBadge: {
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: 10,
          backgroundColor: colors.accent,
        },
        artifactBadgeText: {
          fontSize: 11,
          fontFamily: "Inter_500Medium",
          color: colors.primary,
        },
        artifactTitle: {
          flex: 1,
          fontSize: 12,
          fontFamily: "Inter_400Regular",
          color: colors.mutedForeground,
        },
        artifactPreview: {
          fontSize: 13,
          fontFamily: "Inter_400Regular",
          color: colors.foreground,
          lineHeight: 19,
        },
        artifactsPlaceholder: {
          padding: 20,
          borderRadius: 12,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          borderStyle: "dashed",
          alignItems: "center",
          gap: 8,
          marginBottom: 4,
        },
        artifactsPlaceholderText: {
          fontSize: 13,
          fontFamily: "Inter_400Regular",
          color: colors.mutedForeground,
          textAlign: "center",
          lineHeight: 18,
        },
        coachActionCard: {
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          padding: 14,
          borderRadius: 12,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          backgroundColor: colors.card,
          marginBottom: 10,
        },
        coachActionIcon: {
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: colors.accent,
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        },
        coachActionBody: { flex: 1 },
        coachActionTitle: {
          fontSize: 14,
          fontFamily: "Inter_600SemiBold",
          color: colors.foreground,
          marginBottom: 2,
        },
        coachActionDesc: {
          fontSize: 12,
          fontFamily: "Inter_400Regular",
          color: colors.mutedForeground,
          lineHeight: 17,
        },
        actionsSection: {
          gap: 10,
        },
        actionBtn: {
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          padding: 14,
          borderRadius: 12,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          backgroundColor: colors.card,
        },
        actionBtnText: {
          fontSize: 14,
          fontFamily: "Inter_500Medium",
          color: colors.foreground,
          flex: 1,
        },
        actionBtnDestructive: {
          borderColor: colors.destructive,
          backgroundColor: colors.background,
        },
        actionBtnDestructiveText: {
          color: colors.destructive,
        },
        closedBanner: {
          padding: 14,
          borderRadius: 12,
          backgroundColor: colors.muted,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          marginBottom: 20,
        },
        closedBannerText: {
          flex: 1,
          fontSize: 13,
          fontFamily: "Inter_400Regular",
          color: colors.mutedForeground,
        },
      }),
    [colors, insets.top, isWeb],
  );

  if (loading) {
    return (
      <View style={[styles.root, styles.centered]}>
        <StatusBar style="dark" />
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (notFound || !loop) {
    return (
      <View style={[styles.root, styles.centered]}>
        <StatusBar style="dark" />
        <Feather name="alert-circle" size={32} color={colors.mutedForeground} />
        <Text style={styles.centeredText}>
          This loop wasn't found. It may have been removed.
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, marginTop: 20 })}
          accessibilityRole="button"
        >
          <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
            Go back
          </Text>
        </Pressable>
      </View>
    );
  }

  const isClosed = CLOSED_STATUSES.includes(loop.status);
  const isOpen = OPEN_STATUSES.includes(loop.status);
  const hasArtifacts = loop.generatedArtifacts.length > 0;

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
          <Feather name="chevron-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {loop.title}
        </Text>
        {dirty ? (
          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            accessibilityRole="button"
            accessibilityLabel="Save changes"
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.mutedForeground} />
            ) : (
              <Text style={styles.saveBtnText}>Save</Text>
            )}
          </Pressable>
        ) : (
          <View style={{ width: 56 }} />
        )}
      </View>

      <KeyboardAwareScrollViewCompat
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statusRow}>
          <View style={[styles.badge, isClosed && styles.badgeMuted]}>
            <Text style={[styles.badgeText, isClosed && styles.badgeMutedText]}>
              {statusLabel(loop.status)}
            </Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{stageLabel(loop.stage)}</Text>
          </View>
          {loop.relationshipType ? (
            <View style={[styles.badge, styles.badgeMuted]}>
              <Text style={[styles.badgeText, styles.badgeMutedText]}>
                {loop.relationshipType}
              </Text>
            </View>
          ) : null}
        </View>

        {isClosed && (
          <View style={styles.closedBanner}>
            <Feather name="check-circle" size={16} color={colors.mutedForeground} />
            <Text style={styles.closedBannerText}>
              This loop is closed. You can still review and edit what you wrote.
            </Text>
          </View>
        )}

        <Text style={styles.sectionLabel}>Loop details</Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={(v) => { setTitle(v); setDirty(true); }}
            placeholder="Loop title"
            placeholderTextColor={colors.mutedForeground}
            returnKeyType="next"
            maxLength={120}
            editable={!saving}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>What happened</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={whatHappened}
            onChangeText={(v) => { setWhatHappened(v); setDirty(true); }}
            placeholder="Describe the moment…"
            placeholderTextColor={colors.mutedForeground}
            multiline
            maxLength={2000}
            editable={!saving}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>How you're feeling</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={emotion}
            onChangeText={(v) => { setEmotion(v); setDirty(true); }}
            placeholder="I'm feeling…"
            placeholderTextColor={colors.mutedForeground}
            multiline
            maxLength={500}
            editable={!saving}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Your interpretation</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={interpretation}
            onChangeText={(v) => { setInterpretation(v); setDirty(true); }}
            placeholder="My interpretation is…"
            placeholderTextColor={colors.mutedForeground}
            multiline
            maxLength={1000}
            editable={!saving}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>What you need</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={need}
            onChangeText={(v) => { setNeed(v); setDirty(true); }}
            placeholder="What I need is…"
            placeholderTextColor={colors.mutedForeground}
            multiline
            maxLength={500}
            editable={!saving}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>What you're considering doing</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={consideringDoing}
            onChangeText={(v) => { setConsideringDoing(v); setDirty(true); }}
            placeholder="I'm thinking about…"
            placeholderTextColor={colors.mutedForeground}
            multiline
            maxLength={500}
            editable={!saving}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Next step</Text>
          <TextInput
            style={styles.input}
            value={nextStep}
            onChangeText={(v) => { setNextStep(v); setDirty(true); }}
            placeholder="My next step is…"
            placeholderTextColor={colors.mutedForeground}
            returnKeyType="next"
            maxLength={300}
            editable={!saving}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Outcome</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={outcome}
            onChangeText={(v) => { setOutcome(v); setDirty(true); }}
            placeholder="How did it go? (optional)"
            placeholderTextColor={colors.mutedForeground}
            multiline
            maxLength={500}
            editable={!saving}
          />
        </View>

        <View style={styles.divider} />
        <Text style={styles.sectionLabel}>Stage</Text>
        <View style={styles.stageRow}>
          {LOOP_STAGES.map((s) => {
            const active = loop.stage === s;
            return (
              <Pressable
                key={s}
                onPress={() => handleStageChange(s)}
                style={[styles.stageChip, active && styles.stageChipActive]}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={stageLabel(s)}
              >
                <Text
                  style={[
                    styles.stageChipText,
                    active && styles.stageChipTextActive,
                  ]}
                >
                  {stageLabel(s)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.divider} />
        <Text style={styles.sectionLabel}>Coach results</Text>

        {hasArtifacts ? (
          loop.generatedArtifacts.map((artifact) => (
            <View key={artifact.id} style={styles.artifactCard}>
              <View style={styles.artifactCardHeader}>
                <View style={styles.artifactBadge}>
                  <Text style={styles.artifactBadgeText}>
                    {artifactToolLabel(artifact.sourceTool)}
                  </Text>
                </View>
                <Text style={styles.artifactTitle} numberOfLines={1}>
                  {artifact.title}
                </Text>
              </View>
              <Text style={styles.artifactPreview}>
                {artifactPreview(artifact)}
              </Text>
            </View>
          ))
        ) : (
          <View style={styles.artifactsPlaceholder}>
            <Feather name="layers" size={22} color={colors.mutedForeground} />
            <Text style={styles.artifactsPlaceholderText}>
              Use a coach action below to get perspective, draft a message, or
              plan a conversation. Results are saved here automatically — based
              on what you wrote, not what the app assumes.
            </Text>
          </View>
        )}

        {isOpen && (
          <>
            <View style={styles.divider} />
            <Text style={styles.sectionLabel}>Coach actions</Text>

            {COACH_ACTIONS.map((action) => (
              <Pressable
                key={action.key}
                style={({ pressed }) => [
                  styles.coachActionCard,
                  { opacity: pressed ? 0.85 : 1 },
                ]}
                onPress={() => {
                  if (Platform.OS !== "web") {
                    Haptics.selectionAsync();
                  }
                  router.push(
                    `/coach/${action.key}?loopId=${loop.id}`,
                  );
                }}
                accessibilityRole="button"
                accessibilityLabel={`${action.title}. ${action.desc}`}
              >
                <View style={styles.coachActionIcon}>
                  <Feather name={action.icon} size={16} color={colors.primary} />
                </View>
                <View style={styles.coachActionBody}>
                  <Text style={styles.coachActionTitle}>{action.title}</Text>
                  <Text style={styles.coachActionDesc}>{action.desc}</Text>
                </View>
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
              </Pressable>
            ))}

            <View style={styles.divider} />
            <Text style={styles.sectionLabel}>Loop actions</Text>
            <View style={styles.actionsSection}>
              {loop.status !== "paused" && (
                <Pressable
                  style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.8 : 1 }]}
                  onPress={() =>
                    confirmAction(
                      "Pause loop",
                      "Park this loop for now. It will stay in your list until you return to it.",
                      "pause",
                    )
                  }
                  accessibilityRole="button"
                >
                  <Feather name="pause-circle" size={18} color={colors.foreground} />
                  <Text style={styles.actionBtnText}>Pause — come back later</Text>
                  <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                </Pressable>
              )}

              {loop.status !== "needsFollowUp" && (
                <Pressable
                  style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.8 : 1 }]}
                  onPress={() =>
                    confirmAction(
                      "Mark needs follow-up",
                      "Flag this loop as having a pending real-life next step.",
                      "needsFollowUp",
                    )
                  }
                  accessibilityRole="button"
                >
                  <Feather name="bell" size={18} color={colors.foreground} />
                  <Text style={styles.actionBtnText}>Needs follow-up</Text>
                  <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                </Pressable>
              )}

              <Pressable
                style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.8 : 1 }]}
                onPress={() =>
                  confirmAction(
                    "Partly resolved",
                    "Progress happened but the loop isn't fully closed yet.",
                    "partlyResolved",
                  )
                }
                accessibilityRole="button"
              >
                <Feather name="check" size={18} color={colors.foreground} />
                <Text style={styles.actionBtnText}>Partly resolved</Text>
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.8 : 1 }]}
                onPress={() =>
                  confirmAction(
                    "Mark resolved",
                    "Close this loop. It will be moved out of Open Loops.",
                    "resolve",
                  )
                }
                accessibilityRole="button"
              >
                <Feather name="check-circle" size={18} color={colors.foreground} />
                <Text style={styles.actionBtnText}>Mark resolved — loop closed</Text>
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.actionBtn,
                  styles.actionBtnDestructive,
                  { opacity: pressed ? 0.8 : 1 },
                ]}
                onPress={() =>
                  confirmAction(
                    "Let go",
                    "Choose not to keep working this loop. It will be archived but not deleted.",
                    "letGo",
                  )
                }
                accessibilityRole="button"
              >
                <Feather name="wind" size={18} color={colors.destructive} />
                <Text style={[styles.actionBtnText, styles.actionBtnDestructiveText]}>
                  Let go — not worth pursuing
                </Text>
                <Feather name="chevron-right" size={16} color={colors.destructive} />
              </Pressable>
            </View>
          </>
        )}
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}
