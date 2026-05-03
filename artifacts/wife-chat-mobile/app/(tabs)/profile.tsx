import { Feather } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { loadTone, saveTone, type Tone } from "@/lib/storage";

const TONES: { key: Tone; label: string; sub: string }[] = [
  { key: "warmer", label: "Warmer", sub: "Lean toward gentle." },
  { key: "balanced", label: "Balanced", sub: "Default — kind and clear." },
  { key: "direct", label: "More direct", sub: "Less softening, still respectful." },
];

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const [tone, setTone] = useState<Tone>("balanced");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    loadTone().then((t) => {
      setTone(t);
      setHydrated(true);
    });
  }, []);

  const onPick = (t: Tone) => {
    setTone(t);
    saveTone(t);
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, backgroundColor: colors.background },
        scroll: { flex: 1 },
        scrollContent: {
          paddingTop: (isWeb ? 67 : insets.top) + 8,
          paddingBottom: 32,
          paddingHorizontal: 20,
        },
        h1: {
          fontSize: 24,
          lineHeight: 30,
          fontFamily: "Inter_700Bold",
          color: colors.foreground,
          marginBottom: 4,
        },
        sub: {
          fontSize: 13,
          lineHeight: 19,
          fontFamily: "Inter_400Regular",
          color: colors.mutedForeground,
          marginBottom: 22,
        },
        sectionLabel: {
          fontSize: 11,
          fontFamily: "Inter_500Medium",
          color: colors.mutedForeground,
          letterSpacing: 0.6,
          textTransform: "uppercase",
          marginBottom: 10,
        },
        toneRow: {
          backgroundColor: colors.card,
          borderRadius: colors.radius,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          overflow: "hidden",
          marginBottom: 10,
        },
        toneOption: {
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 14,
          paddingVertical: 13,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
        toneOptionLast: { borderBottomWidth: 0 },
        toneText: { flex: 1 },
        toneLabel: {
          fontSize: 14,
          fontFamily: "Inter_600SemiBold",
          color: colors.foreground,
          marginBottom: 2,
        },
        toneSub: {
          fontSize: 12,
          fontFamily: "Inter_400Regular",
          color: colors.mutedForeground,
        },
        radioOuter: {
          width: 20,
          height: 20,
          borderRadius: 10,
          borderWidth: 1.5,
          borderColor: colors.border,
          alignItems: "center",
          justifyContent: "center",
        },
        radioOuterActive: { borderColor: colors.primary },
        radioInner: {
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: colors.primary,
        },
        toneNote: {
          marginTop: 4,
          marginBottom: 24,
          fontSize: 11,
          fontFamily: "Inter_400Regular",
          color: colors.mutedForeground,
          fontStyle: "italic",
        },
        privacyCard: {
          backgroundColor: colors.card,
          borderRadius: colors.radius,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          padding: 14,
          marginBottom: 22,
        },
        privacyTitleRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
        },
        privacyTitle: {
          fontSize: 13,
          fontFamily: "Inter_600SemiBold",
          color: colors.foreground,
        },
        privacyText: {
          fontSize: 12,
          lineHeight: 18,
          fontFamily: "Inter_400Regular",
          color: colors.mutedForeground,
        },
        meta: {
          fontSize: 11,
          fontFamily: "Inter_400Regular",
          color: colors.mutedForeground,
          textAlign: "center",
          marginTop: 8,
        },
      }),
    [colors, insets.top, isWeb],
  );

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.h1}>Profile</Text>
        <Text style={styles.sub}>
          Tune the experience and review what this app is — and is not.
        </Text>

        <Text style={styles.sectionLabel}>Communication preferences</Text>
        <View style={styles.toneRow}>
          {TONES.map((t, i) => {
            const active = hydrated && tone === t.key;
            return (
              <Pressable
                key={t.key}
                onPress={() => onPick(t.key)}
                style={({ pressed }) => [
                  styles.toneOption,
                  i === TONES.length - 1 && styles.toneOptionLast,
                  { opacity: pressed ? 0.85 : 1 },
                ]}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${t.label}. ${t.sub}`}
                testID={`tone-${t.key}`}
              >
                <View style={styles.toneText}>
                  <Text style={styles.toneLabel}>{t.label}</Text>
                  <Text style={styles.toneSub}>{t.sub}</Text>
                </View>
                <View style={[styles.radioOuter, active && styles.radioOuterActive]}>
                  {active ? <View style={styles.radioInner} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.toneNote}>
          Saved on this device. Tone shaping does not affect responses yet.
        </Text>

        <Text style={styles.sectionLabel}>Privacy</Text>
        <View style={styles.privacyCard}>
          <View style={styles.privacyTitleRow}>
            <Feather name="shield" size={14} color={colors.mutedForeground} />
            <Text style={styles.privacyTitle}>What this app is</Text>
          </View>
          <Text style={styles.privacyText}>
            A communication coach. Not therapy, not crisis support, not a way to
            track, score, or diagnose your partner. Drafts and conversations
            are stored on this device. When you ask the assistant for help,
            your text is sent to the WifeChat API and on to OpenAI to generate
            a reply. WifeChat does not sync this to a cloud account in this
            prototype. Crisis numbers shown are US defaults; if you are
            elsewhere, please use your local emergency or crisis resources.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>About</Text>
        <View style={styles.privacyCard}>
          <Text style={styles.privacyText}>
            Relationship Studio · prototype build. If you are in danger or in
            crisis, please reach a qualified professional. In the US: 988
            (Suicide & Crisis Lifeline) or 1-800-799-7233 (National Domestic
            Violence Hotline).
          </Text>
        </View>

        <Text style={styles.meta}>WifeChat · Relationship Studio</Text>
      </ScrollView>
    </View>
  );
}
