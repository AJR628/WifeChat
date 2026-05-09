import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import type { Loop } from "@/lib/loopModels";
import { getOpenLoops, listLoops, statusLabel } from "@/lib/loopStore";

export default function StudioScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isWeb = Platform.OS === "web";

  const [openLoops, setOpenLoops] = useState<Loop[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setHydrated(false);
      listLoops().then((all) => {
        if (cancelled) return;
        setOpenLoops(getOpenLoops(all));
        setHydrated(true);
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

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
        sectionHeader: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
          marginTop: 4,
        },
        sectionLabel: {
          fontSize: 11,
          fontFamily: "Inter_500Medium",
          color: colors.mutedForeground,
          letterSpacing: 0.6,
          textTransform: "uppercase",
        },
        newLoopBtn: {
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          paddingHorizontal: 10,
          paddingVertical: 5,
          borderRadius: 20,
          backgroundColor: colors.primary,
        },
        newLoopBtnText: {
          fontSize: 12,
          fontFamily: "Inter_600SemiBold",
          color: colors.primaryForeground,
        },
        loopsLoadingRow: {
          alignItems: "center",
          paddingVertical: 24,
        },
        emptyLoops: {
          padding: 20,
          borderRadius: 14,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          backgroundColor: colors.card,
          alignItems: "center",
          gap: 10,
          marginBottom: 8,
        },
        emptyLoopsTitle: {
          fontSize: 15,
          fontFamily: "Inter_600SemiBold",
          color: colors.foreground,
          textAlign: "center",
        },
        emptyLoopsSub: {
          fontSize: 13,
          fontFamily: "Inter_400Regular",
          color: colors.mutedForeground,
          textAlign: "center",
          lineHeight: 19,
        },
        startLoopCta: {
          marginTop: 4,
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingHorizontal: 18,
          paddingVertical: 10,
          borderRadius: 22,
          backgroundColor: colors.primary,
        },
        startLoopCtaText: {
          fontSize: 14,
          fontFamily: "Inter_600SemiBold",
          color: colors.primaryForeground,
        },
        loopCard: {
          backgroundColor: colors.card,
          borderRadius: colors.radius,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          padding: 14,
          marginBottom: 10,
        },
        loopCardRow: {
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 12,
        },
        loopCardIcon: {
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: colors.accent,
          alignItems: "center",
          justifyContent: "center",
          marginTop: 1,
          flexShrink: 0,
        },
        loopCardBody: { flex: 1 },
        loopCardTitle: {
          fontSize: 14,
          fontFamily: "Inter_600SemiBold",
          color: colors.foreground,
          marginBottom: 3,
        },
        loopCardMeta: {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          flexWrap: "wrap",
        },
        loopCardBadge: {
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: 10,
          backgroundColor: colors.accent,
        },
        loopCardBadgeText: {
          fontSize: 11,
          fontFamily: "Inter_500Medium",
          color: colors.primary,
        },
        loopCardBadgeMuted: {
          backgroundColor: colors.muted,
        },
        loopCardBadgeMutedText: {
          color: colors.mutedForeground,
        },
        loopCardChevron: {
          marginTop: 6,
        },
        divider: {
          height: StyleSheet.hairlineWidth,
          backgroundColor: colors.border,
          marginVertical: 20,
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
        toolsSectionLabel: {
          fontSize: 11,
          fontFamily: "Inter_500Medium",
          color: colors.mutedForeground,
          letterSpacing: 0.6,
          textTransform: "uppercase",
          marginBottom: 10,
          marginTop: 4,
        },
      }),
    [colors, insets.top, isWeb],
  );

  function handleStartLoop() {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push("/loop/new");
  }

  function handleOpenLoop(loop: Loop) {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    router.push(`/loop/${loop.id}`);
  }

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

        {/* Open Loops section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>Open loops</Text>
          <Pressable
            onPress={handleStartLoop}
            style={({ pressed }) => [
              styles.newLoopBtn,
              { opacity: pressed ? 0.8 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Start a new loop"
          >
            <Feather name="plus" size={12} color={colors.primaryForeground} />
            <Text style={styles.newLoopBtnText}>Start a loop</Text>
          </Pressable>
        </View>

        {!hydrated ? (
          <View style={styles.loopsLoadingRow}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : openLoops.length === 0 ? (
          <View style={styles.emptyLoops}>
            <Feather name="circle" size={28} color={colors.mutedForeground} />
            <Text style={styles.emptyLoopsTitle}>No open loops</Text>
            <Text style={styles.emptyLoopsSub}>
              See it clearly. Say it well. Close the loop.{"\n"}Start one when
              something feels unresolved.
            </Text>
            <Pressable
              onPress={handleStartLoop}
              style={({ pressed }) => [
                styles.startLoopCta,
                { opacity: pressed ? 0.8 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Start a Loop"
            >
              <Feather name="plus-circle" size={16} color={colors.primaryForeground} />
              <Text style={styles.startLoopCtaText}>Start a Loop</Text>
            </Pressable>
          </View>
        ) : (
          openLoops.map((loop) => (
            <Pressable
              key={loop.id}
              onPress={() => handleOpenLoop(loop)}
              style={({ pressed }) => [
                styles.loopCard,
                { opacity: pressed ? 0.85 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Loop: ${loop.title}. Status: ${statusLabel(loop.status)}`}
            >
              <View style={styles.loopCardRow}>
                <View style={styles.loopCardIcon}>
                  <Feather name="circle" size={16} color={colors.primary} />
                </View>
                <View style={styles.loopCardBody}>
                  <Text style={styles.loopCardTitle} numberOfLines={2}>
                    {loop.title}
                  </Text>
                  <View style={styles.loopCardMeta}>
                    <View style={styles.loopCardBadge}>
                      <Text style={styles.loopCardBadgeText}>
                        {statusLabel(loop.status)}
                      </Text>
                    </View>
                    {loop.relationshipType ? (
                      <View
                        style={[
                          styles.loopCardBadge,
                          styles.loopCardBadgeMuted,
                        ]}
                      >
                        <Text
                          style={[
                            styles.loopCardBadgeText,
                            styles.loopCardBadgeMutedText,
                          ]}
                        >
                          {loop.relationshipType}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
                <Feather
                  name="chevron-right"
                  size={18}
                  color={colors.mutedForeground}
                  style={styles.loopCardChevron}
                />
              </View>
            </Pressable>
          ))
        )}

        <View style={styles.divider} />

        {/* Quick tools — secondary */}
        <Text style={styles.toolsSectionLabel}>Quick tools</Text>

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
            This is a communication tool, not therapy or emergency support.
            Drafts are stored on this device. When you ask the assistant for
            help, your text is sent to the WifeChat API and OpenAI to generate
            a response. We never claim to know what your partner thinks.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
