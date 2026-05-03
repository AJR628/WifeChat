import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useMemo } from "react";
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

import type { ComponentProps } from "react";

type FeatherIcon = ComponentProps<typeof Feather>["name"];

interface Ritual {
  key: string;
  label: string;
  outcome: string;
  icon: FeatherIcon;
  status: "available" | "soon";
  href?: string;
}

const RITUALS: Ritual[] = [
  {
    key: "daily",
    label: "Daily Check-In",
    outcome: "A two-minute moment to notice and reach.",
    icon: "sun",
    status: "available",
    href: "/coach/checkin",
  },
  {
    key: "weekly",
    label: "Weekly Reset",
    outcome: "What landed, what frayed, what to try next week.",
    icon: "refresh-cw",
    status: "soon",
  },
  {
    key: "appreciation",
    label: "Appreciation Prompt",
    outcome: "One specific thing you noticed and valued.",
    icon: "star",
    status: "soon",
  },
];

export default function RitualsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isWeb = Platform.OS === "web";

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
          marginBottom: 18,
        },
        card: {
          backgroundColor: colors.card,
          borderRadius: colors.radius,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          padding: 16,
          marginBottom: 12,
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 14,
        },
        cardSoon: { opacity: 0.6 },
        cardIcon: {
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: colors.accent,
          alignItems: "center",
          justifyContent: "center",
          marginTop: 2,
        },
        cardBody: { flex: 1 },
        cardTitleRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          marginBottom: 3,
        },
        cardTitle: {
          fontSize: 15,
          fontFamily: "Inter_600SemiBold",
          color: colors.foreground,
        },
        soonPill: {
          fontSize: 10,
          fontFamily: "Inter_500Medium",
          color: colors.mutedForeground,
          paddingHorizontal: 7,
          paddingVertical: 2,
          borderRadius: 999,
          backgroundColor: colors.muted,
          overflow: "hidden",
          letterSpacing: 0.4,
          textTransform: "uppercase",
        },
        cardOutcome: {
          fontSize: 13,
          lineHeight: 18,
          fontFamily: "Inter_400Regular",
          color: colors.mutedForeground,
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
        <Text style={styles.h1}>Rituals</Text>
        <Text style={styles.sub}>
          Small, repeatable moments that build the way you talk over time.
        </Text>

        {RITUALS.map((r) => {
          const soon = r.status === "soon";
          const onPress = () => {
            if (!soon && r.href) router.push(r.href as never);
          };
          return (
            <Pressable
              key={r.key}
              onPress={onPress}
              disabled={soon}
              style={({ pressed }) => [
                styles.card,
                soon && styles.cardSoon,
                { opacity: !soon && pressed ? 0.85 : soon ? 0.6 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityState={{ disabled: soon }}
              accessibilityLabel={`${r.label}. ${soon ? "Coming soon. " : ""}${r.outcome}`}
              testID={`ritual-${r.key}`}
            >
              <View style={styles.cardIcon}>
                <Feather name={r.icon} size={18} color={colors.primary} />
              </View>
              <View style={styles.cardBody}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.cardTitle}>{r.label}</Text>
                  {soon ? <Text style={styles.soonPill}>Soon</Text> : null}
                </View>
                <Text style={styles.cardOutcome}>{r.outcome}</Text>
              </View>
              {!soon ? (
                <Feather
                  name="chevron-right"
                  size={18}
                  color={colors.mutedForeground}
                  style={{ marginTop: 4 }}
                />
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
