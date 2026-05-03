import { Feather } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import React, { useMemo } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

import type { ComponentProps } from "react";

type FeatherIcon = ComponentProps<typeof Feather>["name"];

const CATEGORIES: { key: string; label: string; icon: FeatherIcon; hint: string }[] = [
  { key: "drafts", label: "Drafts", icon: "edit-3", hint: "Messages you started writing." },
  { key: "repair", label: "Repair Messages", icon: "heart", hint: "Words that helped you reconnect." },
  { key: "checkins", label: "Check-Ins", icon: "sun", hint: "How you have been feeling, day to day." },
  { key: "hard", label: "Hard Conversations", icon: "message-square", hint: "Plans for the talks that matter." },
  { key: "worked", label: "Things That Worked", icon: "bookmark", hint: "Phrases and moves to remember." },
];

export default function SavedScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
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
          marginBottom: 20,
        },
        deviceTag: {
          alignSelf: "flex-start",
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingHorizontal: 10,
          paddingVertical: 5,
          borderRadius: 999,
          backgroundColor: colors.muted,
          marginBottom: 16,
        },
        deviceTagText: {
          fontSize: 11,
          fontFamily: "Inter_500Medium",
          color: colors.mutedForeground,
        },
        card: {
          backgroundColor: colors.card,
          borderRadius: colors.radius,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          padding: 14,
          marginBottom: 10,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        },
        cardIcon: {
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: colors.accent,
          alignItems: "center",
          justifyContent: "center",
        },
        cardBody: { flex: 1 },
        cardTitle: {
          fontSize: 14,
          fontFamily: "Inter_600SemiBold",
          color: colors.foreground,
          marginBottom: 2,
        },
        cardHint: {
          fontSize: 12,
          fontFamily: "Inter_400Regular",
          color: colors.mutedForeground,
        },
        emptyTag: {
          fontSize: 11,
          fontFamily: "Inter_500Medium",
          color: colors.mutedForeground,
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: 999,
          backgroundColor: colors.muted,
          overflow: "hidden",
        },
        footer: {
          marginTop: 18,
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
        <Text style={styles.h1}>Saved</Text>
        <Text style={styles.sub}>
          Drafts, repair messages, and small wins worth keeping.
        </Text>

        <View style={styles.deviceTag}>
          <Feather name="smartphone" size={11} color={colors.mutedForeground} />
          <Text style={styles.deviceTagText}>Saved on this device</Text>
        </View>

        {CATEGORIES.map((c) => (
          <View key={c.key} style={styles.card}>
            <View style={styles.cardIcon}>
              <Feather name={c.icon} size={16} color={colors.primary} />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{c.label}</Text>
              <Text style={styles.cardHint}>{c.hint}</Text>
            </View>
            <Text style={styles.emptyTag}>Empty</Text>
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Saving items is coming soon. Drafts and conversations stay on this
            device — WifeChat does not sync them to a cloud account in this
            prototype. When you ask the assistant for help, your text is sent
            to the WifeChat API and OpenAI to generate a response.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
