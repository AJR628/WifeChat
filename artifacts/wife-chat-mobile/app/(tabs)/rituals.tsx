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

interface MaintenanceCard {
  key: string;
  label: string;
  desc: string;
  icon: FeatherIcon;
  status: "available" | "soon";
  href?: string;
}

const MAINTENANCE_CARDS: MaintenanceCard[] = [
  {
    key: "checkin",
    label: "Daily Check-In",
    desc: "A two-minute ritual to notice, appreciate, and reach.",
    icon: "sun",
    status: "available",
    href: "/coach/checkin",
  },
  {
    key: "appreciation",
    label: "Appreciation Prompt",
    desc: "One specific thing you noticed and valued — worth saying out loud.",
    icon: "star",
    status: "soon",
  },
  {
    key: "followup",
    label: "Follow-Up",
    desc: "Check back on something you said you'd do or revisit.",
    icon: "bell",
    status: "soon",
  },
  {
    key: "lessons",
    label: "Saved Lessons",
    desc: "Phrases and moves that worked — so you remember them next time.",
    icon: "bookmark",
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
          paddingBottom: 40,
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
          marginBottom: 24,
        },
        modeBadge: {
          alignSelf: "flex-start",
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingHorizontal: 10,
          paddingVertical: 5,
          borderRadius: 999,
          backgroundColor: colors.accent,
          marginBottom: 20,
        },
        modeBadgeText: {
          fontSize: 11,
          fontFamily: "Inter_600SemiBold",
          color: colors.primary,
          letterSpacing: 0.3,
        },
        card: {
          backgroundColor: colors.card,
          borderRadius: 12,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          padding: 16,
          marginBottom: 12,
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 14,
        },
        cardSoon: { opacity: 0.55 },
        cardIcon: {
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: colors.accent,
          alignItems: "center",
          justifyContent: "center",
          marginTop: 1,
          flexShrink: 0,
        },
        cardBody: { flex: 1 },
        cardTitleRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          marginBottom: 3,
          flexWrap: "wrap",
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
        cardDesc: {
          fontSize: 13,
          lineHeight: 18,
          fontFamily: "Inter_400Regular",
          color: colors.mutedForeground,
        },
        footer: {
          marginTop: 12,
          padding: 14,
          borderRadius: 12,
          backgroundColor: colors.muted,
        },
        footerText: {
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
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.h1}>Maintenance Mode</Text>
        <Text style={styles.sub}>
          Keep relationships tended when nothing is burning.
        </Text>

        <View style={styles.modeBadge}>
          <Feather name="activity" size={11} color={colors.primary} />
          <Text style={styles.modeBadgeText}>Maintenance Mode</Text>
        </View>

        {MAINTENANCE_CARDS.map((card) => {
          const soon = card.status === "soon";
          return (
            <Pressable
              key={card.key}
              onPress={() => {
                if (!soon && card.href) router.push(card.href as never);
              }}
              disabled={soon}
              style={({ pressed }) => [
                styles.card,
                soon && styles.cardSoon,
                { opacity: !soon && pressed ? 0.85 : soon ? 0.55 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityState={{ disabled: soon }}
              accessibilityLabel={`${card.label}. ${soon ? "Coming soon. " : ""}${card.desc}`}
              testID={`maintenance-${card.key}`}
            >
              <View style={styles.cardIcon}>
                <Feather name={card.icon} size={18} color={colors.primary} />
              </View>
              <View style={styles.cardBody}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.cardTitle}>{card.label}</Text>
                  {soon ? (
                    <Text style={styles.soonPill}>Soon</Text>
                  ) : null}
                </View>
                <Text style={styles.cardDesc}>{card.desc}</Text>
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

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Maintenance Mode is for keeping things good when there is no active
            loop to work through. Relationship profiles and saved lessons are
            coming in a future build.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
