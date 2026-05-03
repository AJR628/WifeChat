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

import { TOOL_LIST, type Tool } from "@/constants/tools";
import { useColors } from "@/hooks/useColors";

export default function StudioScreen() {
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
        brandRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          marginBottom: 22,
        },
        brandBadge: {
          width: 32,
          height: 32,
          borderRadius: 10,
          backgroundColor: colors.primary,
          alignItems: "center",
          justifyContent: "center",
        },
        brandTitle: {
          fontSize: 16,
          fontFamily: "Inter_600SemiBold",
          color: colors.foreground,
          lineHeight: 18,
        },
        brandSub: {
          fontSize: 11,
          fontFamily: "Inter_400Regular",
          color: colors.mutedForeground,
          marginTop: 1,
        },
        hero: {
          marginBottom: 22,
        },
        heroEyebrow: {
          fontSize: 12,
          fontFamily: "Inter_500Medium",
          color: colors.primary,
          letterSpacing: 0.4,
          textTransform: "uppercase",
          marginBottom: 8,
        },
        heroTitle: {
          fontSize: 26,
          lineHeight: 32,
          fontFamily: "Inter_700Bold",
          color: colors.foreground,
          marginBottom: 6,
        },
        heroSub: {
          fontSize: 14,
          lineHeight: 20,
          fontFamily: "Inter_400Regular",
          color: colors.mutedForeground,
        },
        sectionLabel: {
          fontSize: 11,
          fontFamily: "Inter_500Medium",
          color: colors.mutedForeground,
          letterSpacing: 0.6,
          textTransform: "uppercase",
          marginBottom: 10,
          marginTop: 4,
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
        cardTitle: {
          fontSize: 15,
          fontFamily: "Inter_600SemiBold",
          color: colors.foreground,
          marginBottom: 3,
        },
        cardOutcome: {
          fontSize: 13,
          lineHeight: 18,
          fontFamily: "Inter_400Regular",
          color: colors.mutedForeground,
        },
        chevron: {
          marginTop: 4,
        },
        privacy: {
          marginTop: 14,
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
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandRow}>
          <View style={styles.brandBadge}>
            <Feather name="heart" size={16} color={colors.primaryForeground} />
          </View>
          <View>
            <Text style={styles.brandTitle}>Relationship Studio</Text>
            <Text style={styles.brandSub}>by WifeChat</Text>
          </View>
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>What do you need help with?</Text>
          <Text style={styles.heroTitle}>Pick a moment.</Text>
          <Text style={styles.heroSub}>
            Five small tools for the moments that actually matter — before you
            send, after a fight, before a hard talk.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>Choose a moment</Text>

        {TOOL_LIST.map((tool: Tool) => (
          <Pressable
            key={tool.key}
            onPress={() => router.push(`/coach/${tool.key}`)}
            style={({ pressed }) => [
              styles.card,
              { opacity: pressed ? 0.85 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`${tool.title}. ${tool.outcome}`}
            testID={`tool-card-${tool.key}`}
          >
            <View style={styles.cardIcon}>
              <Feather name={tool.icon} size={18} color={colors.primary} />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{tool.title}</Text>
              <Text style={styles.cardOutcome}>{tool.outcome}</Text>
            </View>
            <Feather
              name="chevron-right"
              size={18}
              color={colors.mutedForeground}
              style={styles.chevron}
            />
          </Pressable>
        ))}

        <View style={styles.privacy}>
          <Feather
            name="shield"
            size={14}
            color={colors.mutedForeground}
            style={{ marginTop: 1 }}
          />
          <Text style={styles.privacyText}>
            This is a communication tool, not therapy or emergency support. Your
            drafts are stored on this device only. We never claim to know what
            your partner thinks.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
