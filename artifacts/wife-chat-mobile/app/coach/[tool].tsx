import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TOOLS, isToolKey, type ToolKey } from "@/constants/tools";
import { useColors } from "@/hooks/useColors";
import { sendCoach, isSupportedCoachTool, CoachError } from "@/lib/coach";
import type { GeneratedArtifact, LoopMessage } from "@/lib/loopModels";
import { appendLoopInteraction, getLoop } from "@/lib/loopStore";
import {
  clearMessages,
  loadMessages,
  newMessageId,
  saveMessages,
  type Message,
} from "@/lib/storage";

const HEADER_HEIGHT = 56;

export default function CoachScreen() {
  const params = useLocalSearchParams<{ tool?: string; loopId?: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const toolKey: ToolKey = isToolKey(params.tool) ? params.tool : "before-send";
  const tool = TOOLS[toolKey];

  const loopId: string | undefined =
    typeof params.loopId === "string" && params.loopId.length > 0
      ? params.loopId
      : undefined;
  const loopMode = loopId !== undefined;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);
  const [hydrated, setHydrated] = useState<boolean>(false);

  const messagesRef = useRef<Message[]>([]);
  messagesRef.current = messages;

  useEffect(() => {
    let cancelled = false;
    setHydrated(false);

    if (loopMode && loopId) {
      getLoop(loopId).then((found) => {
        if (cancelled) return;
        if (found && isSupportedCoachTool(toolKey)) {
          const loopMsgs: Message[] = found.messages
            .filter((m) => m.sourceTool === toolKey)
            .map((m) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              ts: m.createdAt,
            }));
          setMessages(loopMsgs);
        }
        setHydrated(true);
      });
    } else {
      loadMessages(toolKey).then((loaded) => {
        if (cancelled) return;
        setMessages(loaded);
        setHydrated(true);
      });
    }

    return () => {
      cancelled = true;
    };
  }, [toolKey, loopId, loopMode]);

  useEffect(() => {
    if (hydrated && !loopMode) {
      saveMessages(toolKey, messages);
    }
  }, [toolKey, messages, hydrated, loopMode]);

  const isComingSoon = !!tool.comingSoon;
  const canSend = input.trim().length > 0 && !sending && !isComingSoon;

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending || isComingSoon) return;
    if (!isSupportedCoachTool(toolKey)) return;

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }

    const userMsg: Message = {
      id: newMessageId(),
      role: "user",
      content: text,
      ts: Date.now(),
    };
    const next = [...messagesRef.current, userMsg];
    setMessages(next);
    setInput("");
    setSending(true);

    try {
      const replyText = await sendCoach(toolKey, text);
      const reply: Message = {
        id: newMessageId(),
        role: "assistant",
        content: replyText,
        ts: Date.now(),
      };
      setMessages((prev) => [...prev, reply]);

      if (loopMode && loopId) {
        const now = Date.now();
        const userLoopMsg: LoopMessage = {
          id: userMsg.id,
          role: "user",
          content: text,
          createdAt: userMsg.ts,
          sourceTool: toolKey,
        };
        const assistantLoopMsg: LoopMessage = {
          id: reply.id,
          role: "assistant",
          content: replyText,
          createdAt: reply.ts,
          sourceTool: toolKey,
        };
        const artifact: GeneratedArtifact = {
          id: newMessageId(),
          loopId,
          sourceTool: toolKey,
          createdAt: now,
          title: `${tool.title} · ${new Date(now).toLocaleDateString()}`,
          payload: { text: replyText },
          saved: true,
        };
        await appendLoopInteraction(loopId, userLoopMsg, assistantLoopMsg, artifact);
      }
    } catch (err) {
      const message =
        err instanceof CoachError ? err.message : "Something went wrong. Please try again.";
      Alert.alert("Couldn't send", message);
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
      setInput(text);
    } finally {
      setSending(false);
    }
  }, [input, sending, isComingSoon, toolKey, loopMode, loopId, tool.title]);

  const handleClear = useCallback(() => {
    if (messagesRef.current.length === 0) return;
    const doClear = () => {
      setMessages([]);
      clearMessages(toolKey);
    };
    if (Platform.OS === "web") {
      doClear();
      return;
    }
    Alert.alert("Start over?", "This clears the current session for this tool.", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: doClear },
    ]);
  }, [toolKey]);

  const handleChip = useCallback((chipText: string) => {
    setInput((prev) => {
      if (!prev.trim()) return chipText;
      return `${prev.trim()} — ${chipText.toLowerCase()}`;
    });
  }, []);

  const inverted = useMemo(() => [...messages].reverse(), [messages]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, backgroundColor: colors.background },
        flex: { flex: 1 },
        header: {
          paddingTop: isWeb ? 67 : insets.top,
          backgroundColor: colors.card,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
        headerInner: {
          height: HEADER_HEIGHT,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 8,
        },
        iconBtn: {
          width: 40,
          height: 40,
          borderRadius: 20,
          alignItems: "center",
          justifyContent: "center",
        },
        headerCenter: {
          flex: 1,
          alignItems: "center",
          paddingHorizontal: 4,
        },
        headerTitle: {
          fontSize: 15,
          fontFamily: "Inter_600SemiBold",
          color: colors.foreground,
          lineHeight: 18,
        },
        headerSub: {
          fontSize: 11,
          fontFamily: "Inter_400Regular",
          color: colors.mutedForeground,
          marginTop: 1,
        },
        goalBanner: {
          backgroundColor: colors.accent,
          paddingHorizontal: 16,
          paddingVertical: 10,
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 10,
        },
        loopBanner: {
          backgroundColor: colors.muted,
          paddingHorizontal: 16,
          paddingVertical: 10,
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 10,
        },
        goalIcon: {
          width: 26,
          height: 26,
          borderRadius: 8,
          backgroundColor: colors.card,
          alignItems: "center",
          justifyContent: "center",
          marginTop: 1,
        },
        goalText: {
          flex: 1,
          fontSize: 12,
          lineHeight: 17,
          fontFamily: "Inter_500Medium",
          color: colors.accentForeground,
        },
        loopBannerText: {
          flex: 1,
          fontSize: 12,
          lineHeight: 17,
          fontFamily: "Inter_500Medium",
          color: colors.mutedForeground,
        },
        list: { flex: 1 },
        listContent: {
          paddingHorizontal: 14,
          paddingTop: 14,
          paddingBottom: 12,
        },
        bubbleRow: {
          flexDirection: "row",
          marginBottom: 10,
        },
        bubbleRowUser: { justifyContent: "flex-end" },
        bubbleRowAssistant: { justifyContent: "flex-start" },
        bubble: {
          maxWidth: "82%",
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderRadius: 18,
        },
        bubbleUser: {
          backgroundColor: colors.primary,
          borderBottomRightRadius: 6,
        },
        bubbleAssistant: {
          backgroundColor: colors.card,
          borderBottomLeftRadius: 6,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
        },
        textUser: {
          color: colors.primaryForeground,
          fontSize: 15,
          lineHeight: 21,
          fontFamily: "Inter_400Regular",
        },
        textAssistant: {
          color: colors.foreground,
          fontSize: 15,
          lineHeight: 21,
          fontFamily: "Inter_400Regular",
        },
        typing: {
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          alignSelf: "flex-start",
          backgroundColor: colors.card,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          borderBottomLeftRadius: 6,
          borderRadius: 18,
          paddingVertical: 10,
          paddingHorizontal: 14,
          marginBottom: 10,
        },
        typingText: {
          color: colors.mutedForeground,
          fontSize: 13,
          fontFamily: "Inter_400Regular",
        },
        empty: {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 32,
          paddingBottom: 80,
        },
        emptyIconWrap: {
          width: 56,
          height: 56,
          borderRadius: 16,
          backgroundColor: colors.accent,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
        },
        emptyTitle: {
          fontSize: 20,
          fontFamily: "Inter_600SemiBold",
          color: colors.foreground,
          textAlign: "center",
          marginBottom: 6,
        },
        emptySub: {
          fontSize: 14,
          color: colors.mutedForeground,
          textAlign: "center",
          fontFamily: "Inter_400Regular",
          lineHeight: 20,
        },
        chipsBar: {
          backgroundColor: colors.background,
        },
        chipsContent: {
          paddingHorizontal: 12,
          paddingTop: 8,
          paddingBottom: 6,
          gap: 8,
          flexDirection: "row",
        },
        chip: {
          paddingHorizontal: 12,
          paddingVertical: 7,
          borderRadius: 999,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          backgroundColor: colors.card,
        },
        chipText: {
          fontSize: 12,
          fontFamily: "Inter_500Medium",
          color: colors.foreground,
        },
        inputBar: {
          backgroundColor: colors.card,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          paddingHorizontal: 12,
          paddingTop: 10,
          paddingBottom: Math.max(insets.bottom, isWeb ? 34 : 10),
        },
        inputRow: {
          flexDirection: "row",
          alignItems: "flex-end",
          gap: 8,
        },
        inputField: {
          flex: 1,
          minHeight: 44,
          maxHeight: 140,
          paddingHorizontal: 14,
          paddingVertical: Platform.OS === "ios" ? 12 : 8,
          backgroundColor: colors.muted,
          borderRadius: 22,
          fontSize: 15,
          fontFamily: "Inter_400Regular",
          color: colors.foreground,
        },
        sendBtn: {
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.primary,
        },
        sendBtnDisabled: {
          backgroundColor: colors.border,
        },
      }),
    [colors, insets.top, insets.bottom, isWeb],
  );

  const renderItem = useCallback(
    ({ item }: { item: Message }) => {
      const isUser = item.role === "user";
      return (
        <View style={[styles.bubbleRow, isUser ? styles.bubbleRowUser : styles.bubbleRowAssistant]}>
          <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
            <Text style={isUser ? styles.textUser : styles.textAssistant} selectable>
              {item.content}
            </Text>
          </View>
        </View>
      );
    },
    [styles],
  );

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <View style={styles.headerInner}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.6 : 1 }]}
            accessibilityLabel="Back"
            testID="back-button"
          >
            <Feather name="chevron-left" size={24} color={colors.foreground} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{tool.title}</Text>
            <Text style={styles.headerSub}>
              {loopMode ? "Inside a loop" : "Guided mode"}
            </Text>
          </View>
          {loopMode ? (
            <View style={styles.iconBtn} />
          ) : (
            <Pressable
              onPress={handleClear}
              style={({ pressed }) => [
                styles.iconBtn,
                { opacity: messages.length === 0 ? 0.3 : pressed ? 0.6 : 1 },
              ]}
              disabled={messages.length === 0}
              accessibilityLabel="Clear this session"
              testID="clear-button"
            >
              <Feather name="rotate-ccw" size={18} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>

        {loopMode ? (
          <View style={styles.loopBanner}>
            <View style={styles.goalIcon}>
              <Feather name={tool.icon} size={14} color={colors.mutedForeground} />
            </View>
            <Text style={styles.loopBannerText}>
              Working inside this loop — results are saved back to it automatically.
              Final sending is always up to you.
            </Text>
          </View>
        ) : (
          <View style={styles.goalBanner}>
            <View style={styles.goalIcon}>
              <Feather name={tool.icon} size={14} color={colors.primary} />
            </View>
            <Text style={styles.goalText}>{tool.outcome}</Text>
          </View>
        )}
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        {messages.length === 0 && hydrated ? (
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              <Feather name={tool.icon} size={26} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>{tool.empty.title}</Text>
            <Text style={styles.emptySub}>{tool.empty.sub}</Text>
          </View>
        ) : (
          <FlatList
            style={styles.list}
            contentContainerStyle={styles.listContent}
            data={inverted}
            keyExtractor={(m) => m.id}
            renderItem={renderItem}
            inverted
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            scrollEnabled={inverted.length > 0}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              sending ? (
                <View style={styles.typing}>
                  <ActivityIndicator size="small" color={colors.mutedForeground} />
                  <Text style={styles.typingText}>thinking…</Text>
                </View>
              ) : null
            }
          />
        )}

        <View style={styles.chipsBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsContent}
            keyboardShouldPersistTaps="handled"
          >
            {tool.chips.map((c) => (
              <Pressable
                key={c}
                onPress={() => handleChip(c)}
                style={({ pressed }) => [styles.chip, { opacity: pressed ? 0.7 : 1 }]}
                accessibilityRole="button"
                accessibilityLabel={`Suggestion: ${c}`}
                testID={`chip-${c}`}
              >
                <Text style={styles.chipText}>{c}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={styles.inputBar}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.inputField}
              value={input}
              onChangeText={setInput}
              placeholder={
                isComingSoon
                  ? "Guided form coming soon — try Before You Send, Repair, or Daily Check-In."
                  : tool.placeholder
              }
              placeholderTextColor={colors.mutedForeground}
              multiline
              editable={!sending && !isComingSoon}
              testID="chat-input"
            />
            <Pressable
              onPress={handleSend}
              disabled={!canSend}
              style={({ pressed }) => [
                styles.sendBtn,
                !canSend && styles.sendBtnDisabled,
                { opacity: pressed && canSend ? 0.85 : 1 },
              ]}
              accessibilityLabel="Send"
              testID="send-button"
            >
              {sending ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <Feather
                  name="arrow-up"
                  size={20}
                  color={canSend ? colors.primaryForeground : colors.mutedForeground}
                />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
