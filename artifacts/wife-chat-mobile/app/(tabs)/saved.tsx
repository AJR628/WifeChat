import { Feather } from "@expo/vector-icons";
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

import { useColors } from "@/hooks/useColors";
import type { GeneratedArtifact, Loop } from "@/lib/loopModels";
import { isOpenLoop, listLoops, statusLabel } from "@/lib/loopStore";

type ArtifactWithMeta = GeneratedArtifact & { loopTitle: string };

function toolLabel(sourceTool: string): string {
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
    return text.length > 120 ? text.slice(0, 117) + "…" : text;
  }
  return "";
}

export default function SavedScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isWeb = Platform.OS === "web";

  const [loops, setLoops] = useState<Loop[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      listLoops().then((all) => {
        if (cancelled) return;
        setLoops(all);
        setLoading(false);
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const openLoops = useMemo(
    () =>
      loops
        .filter(isOpenLoop)
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [loops],
  );

  const closedLoops = useMemo(
    () =>
      loops
        .filter((l) => !isOpenLoop(l))
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [loops],
  );

  const recentArtifacts = useMemo<ArtifactWithMeta[]>(
    () =>
      loops
        .flatMap((l) =>
          l.generatedArtifacts.map((a) => ({ ...a, loopTitle: l.title })),
        )
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 8),
    [loops],
  );

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
          marginBottom: 24,
        },
        deviceTagText: {
          fontSize: 11,
          fontFamily: "Inter_500Medium",
          color: colors.mutedForeground,
        },
        sectionLabel: {
          fontSize: 11,
          fontFamily: "Inter_500Medium",
          color: colors.mutedForeground,
          letterSpacing: 0.6,
          textTransform: "uppercase",
          marginBottom: 12,
        },
        sectionGap: { marginBottom: 28 },
        loopCard: {
          backgroundColor: colors.card,
          borderRadius: 12,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          padding: 14,
          marginBottom: 10,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        },
        loopCardBody: { flex: 1 },
        loopCardTitle: {
          fontSize: 14,
          fontFamily: "Inter_600SemiBold",
          color: colors.foreground,
          marginBottom: 4,
        },
        loopCardMeta: {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          flexWrap: "wrap",
        },
        badge: {
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: 20,
          backgroundColor: colors.accent,
        },
        badgeMuted: {
          backgroundColor: colors.muted,
        },
        badgeText: {
          fontSize: 11,
          fontFamily: "Inter_500Medium",
          color: colors.primary,
        },
        badgeTextMuted: {
          color: colors.mutedForeground,
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
          marginBottom: 6,
          flexWrap: "wrap",
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
        artifactLoopName: {
          fontSize: 11,
          fontFamily: "Inter_400Regular",
          color: colors.mutedForeground,
          flexShrink: 1,
        },
        artifactPreview: {
          fontSize: 13,
          fontFamily: "Inter_400Regular",
          color: colors.foreground,
          lineHeight: 18,
        },
        emptyBox: {
          padding: 20,
          borderRadius: 12,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          borderStyle: "dashed",
          alignItems: "center",
          gap: 8,
          marginBottom: 4,
        },
        emptyText: {
          fontSize: 13,
          fontFamily: "Inter_400Regular",
          color: colors.mutedForeground,
          textAlign: "center",
          lineHeight: 18,
        },
        footer: {
          marginTop: 8,
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
        centered: {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingTop: 80,
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
          Your loops and coach results, kept on this device.
        </Text>

        <View style={styles.deviceTag}>
          <Feather name="smartphone" size={11} color={colors.mutedForeground} />
          <Text style={styles.deviceTagText}>Stored on this device only</Text>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <>
            <Text style={styles.sectionLabel}>Open loops</Text>
            {openLoops.length === 0 ? (
              <View style={[styles.emptyBox, styles.sectionGap]}>
                <Feather name="circle" size={20} color={colors.mutedForeground} />
                <Text style={styles.emptyText}>
                  No open loops yet. Start one from the Studio tab when something
                  feels unresolved.
                </Text>
              </View>
            ) : (
              <View style={styles.sectionGap}>
                {openLoops.map((loop) => (
                  <Pressable
                    key={loop.id}
                    style={({ pressed }) => [
                      styles.loopCard,
                      { opacity: pressed ? 0.85 : 1 },
                    ]}
                    onPress={() => router.push(`/loop/${loop.id}` as never)}
                    accessibilityRole="button"
                    accessibilityLabel={`Loop: ${loop.title}. ${statusLabel(loop.status)}.`}
                  >
                    <View style={styles.loopCardBody}>
                      <Text style={styles.loopCardTitle} numberOfLines={1}>
                        {loop.title}
                      </Text>
                      <View style={styles.loopCardMeta}>
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>
                            {statusLabel(loop.status)}
                          </Text>
                        </View>
                        {loop.generatedArtifacts.length > 0 && (
                          <View style={[styles.badge, styles.badgeMuted]}>
                            <Text style={[styles.badgeText, styles.badgeTextMuted]}>
                              {loop.generatedArtifacts.length}{" "}
                              {loop.generatedArtifacts.length === 1
                                ? "result"
                                : "results"}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <Feather
                      name="chevron-right"
                      size={16}
                      color={colors.mutedForeground}
                    />
                  </Pressable>
                ))}
              </View>
            )}

            <Text style={styles.sectionLabel}>Closed loops</Text>
            {closedLoops.length === 0 ? (
              <View style={[styles.emptyBox, styles.sectionGap]}>
                <Feather name="check-circle" size={20} color={colors.mutedForeground} />
                <Text style={styles.emptyText}>
                  Resolved and let-go loops will appear here.
                </Text>
              </View>
            ) : (
              <View style={styles.sectionGap}>
                {closedLoops.map((loop) => (
                  <Pressable
                    key={loop.id}
                    style={({ pressed }) => [
                      styles.loopCard,
                      { opacity: pressed ? 0.85 : 1 },
                    ]}
                    onPress={() => router.push(`/loop/${loop.id}` as never)}
                    accessibilityRole="button"
                    accessibilityLabel={`Loop: ${loop.title}. ${statusLabel(loop.status)}.`}
                  >
                    <View style={styles.loopCardBody}>
                      <Text style={styles.loopCardTitle} numberOfLines={1}>
                        {loop.title}
                      </Text>
                      <View style={styles.loopCardMeta}>
                        <View style={[styles.badge, styles.badgeMuted]}>
                          <Text style={[styles.badgeText, styles.badgeTextMuted]}>
                            {statusLabel(loop.status)}
                          </Text>
                        </View>
                        {loop.generatedArtifacts.length > 0 && (
                          <View style={[styles.badge, styles.badgeMuted]}>
                            <Text style={[styles.badgeText, styles.badgeTextMuted]}>
                              {loop.generatedArtifacts.length}{" "}
                              {loop.generatedArtifacts.length === 1
                                ? "result"
                                : "results"}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <Feather
                      name="chevron-right"
                      size={16}
                      color={colors.mutedForeground}
                    />
                  </Pressable>
                ))}
              </View>
            )}

            <Text style={styles.sectionLabel}>Recent coach results</Text>
            {recentArtifacts.length === 0 ? (
              <View style={[styles.emptyBox, styles.sectionGap]}>
                <Feather name="layers" size={20} color={colors.mutedForeground} />
                <Text style={styles.emptyText}>
                  Coach results from loop actions will be saved here
                  automatically.
                </Text>
              </View>
            ) : (
              <View style={styles.sectionGap}>
                {recentArtifacts.map((artifact) => (
                  <View key={artifact.id} style={styles.artifactCard}>
                    <View style={styles.artifactCardHeader}>
                      <View style={styles.artifactBadge}>
                        <Text style={styles.artifactBadgeText}>
                          {toolLabel(artifact.sourceTool)}
                        </Text>
                      </View>
                      <Text style={styles.artifactLoopName} numberOfLines={1}>
                        {artifact.loopTitle}
                      </Text>
                    </View>
                    <Text style={styles.artifactPreview}>
                      {artifactPreview(artifact)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Loops, messages, and results are stored on this device only.
                WifeChat does not sync them to a cloud account. When you use a
                coach action, your text is sent to the WifeChat API and OpenAI
                to generate a response.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
