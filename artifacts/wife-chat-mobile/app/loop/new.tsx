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

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useColors } from "@/hooks/useColors";
import { createLoop } from "@/lib/loopStore";

const RELATIONSHIP_TYPES = [
  "Partner / Spouse",
  "Family",
  "Friend",
  "Coworker",
  "Other",
];

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
  const [saving, setSaving] = useState(false);

  const canSave =
    !saving && title.trim().length > 0 && whatHappened.trim().length > 0;

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
        saveBtn: {
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderRadius: 10,
          backgroundColor: colors.primary,
          minWidth: 60,
          alignItems: "center",
        },
        saveBtnDisabled: {
          backgroundColor: colors.muted,
        },
        saveBtnText: {
          fontSize: 14,
          fontFamily: "Inter_600SemiBold",
          color: colors.primaryForeground,
        },
        saveBtnTextDisabled: {
          color: colors.mutedForeground,
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
        required: {
          color: colors.primary,
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
        divider: {
          height: StyleSheet.hairlineWidth,
          backgroundColor: colors.border,
          marginVertical: 20,
        },
        sectionLabel: {
          fontSize: 11,
          fontFamily: "Inter_500Medium",
          color: colors.mutedForeground,
          letterSpacing: 0.6,
          textTransform: "uppercase",
          marginBottom: 16,
        },
        privacyNote: {
          marginTop: 24,
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

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    try {
      const loop = await createLoop({
        title: title.trim(),
        whatHappened: whatHappened.trim(),
        emotion: emotion.trim(),
        interpretation: interpretation.trim(),
        need: need.trim(),
        consideringDoing: consideringDoing.trim(),
        nextStep: nextStep.trim(),
        relationshipType: relationshipType || undefined,
      });
      router.replace(`/loop/${loop.id}`);
    } finally {
      setSaving(false);
    }
  }

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
        <Pressable
          onPress={handleSave}
          disabled={!canSave}
          style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Save loop"
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.mutedForeground} />
          ) : (
            <Text
              style={[
                styles.saveBtnText,
                !canSave && styles.saveBtnTextDisabled,
              ]}
            >
              Save
            </Text>
          )}
        </Pressable>
      </View>

      <KeyboardAwareScrollViewCompat
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow}>New Loop</Text>
        <Text style={styles.pageTitle}>What's going on?</Text>
        <Text style={styles.pageSub}>
          Name the moment you want to untangle. Based on what you write, we can
          help you see it clearly, decide what to do, and close the loop.
        </Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            Title <Text style={styles.required}>*</Text>
          </Text>
          <Text style={styles.hint}>A short name you'll recognize later</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. The text that felt dismissive"
            placeholderTextColor={colors.mutedForeground}
            returnKeyType="next"
            maxLength={120}
          />
        </View>

        <View style={styles.divider} />
        <Text style={styles.sectionLabel}>What happened</Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            What happened <Text style={styles.required}>*</Text>
          </Text>
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
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>How are you feeling?</Text>
          <Text style={styles.hint}>
            Name the emotion — hurt, confused, frustrated, scared, uncertain…
          </Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={emotion}
            onChangeText={setEmotion}
            placeholder="I'm feeling…"
            placeholderTextColor={colors.mutedForeground}
            multiline
            maxLength={500}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>How are you interpreting it?</Text>
          <Text style={styles.hint}>
            What does this mean to you — what story are you telling yourself?
          </Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={interpretation}
            onChangeText={setInterpretation}
            placeholder="My interpretation is…"
            placeholderTextColor={colors.mutedForeground}
            multiline
            maxLength={1000}
          />
        </View>

        <View style={styles.divider} />
        <Text style={styles.sectionLabel}>What you need</Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>What do you need?</Text>
          <Text style={styles.hint}>
            Acknowledgment, space, clarity, an apology, a conversation…
          </Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={need}
            onChangeText={setNeed}
            placeholder="What I need is…"
            placeholderTextColor={colors.mutedForeground}
            multiline
            maxLength={500}
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
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Next step</Text>
          <Text style={styles.hint}>
            What's the one thing you'll do after you close this app?
          </Text>
          <TextInput
            style={styles.input}
            value={nextStep}
            onChangeText={setNextStep}
            placeholder="My next step is…"
            placeholderTextColor={colors.mutedForeground}
            returnKeyType="done"
            maxLength={300}
          />
        </View>

        <View style={styles.divider} />
        <Text style={styles.sectionLabel}>Relationship context</Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Relationship type</Text>
          <Text style={styles.hint}>
            Optional — helps frame perspective
          </Text>
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

        <View style={styles.privacyNote}>
          <Feather
            name="shield"
            size={14}
            color={colors.mutedForeground}
            style={{ marginTop: 1 }}
          />
          <Text style={styles.privacyText}>
            What you write here stays on this device only. Text is only sent to
            the WifeChat API and OpenAI when you ask the assistant for help
            inside this loop.
          </Text>
        </View>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}
