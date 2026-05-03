import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { sendChat, ChatError } from "@/lib/chat";
import {
  clearMessages,
  loadMessages,
  newMessageId,
  saveMessages,
  type Message,
} from "@/lib/storage";

const HEADER_HEIGHT = 56;

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);
  const [hydrated, setHydrated] = useState<boolean>(false);

  const messagesRef = useRef<Message[]>([]);
  messagesRef.current = messages;

  useEffect(() => {
    loadMessages().then((loaded) => {
      setMessages(loaded);
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (hydrated) {
      saveMessages(messages);
    }
  }, [messages, hydrated]);

  const canSend = input.trim().length > 0 && !sending;

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

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
      const replyText = await sendChat(next);
      const reply: Message = {
        id: newMessageId(),
        role: "assistant",
        content: replyText,
        ts: Date.now(),
      };
      setMessages((prev) => [...prev, reply]);
    } catch (err) {
      const message =
        err instanceof ChatError ? err.message : "Something went wrong. Please try again.";
      Alert.alert("Couldn't send", message);
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
      setInput(text);
    } finally {
      setSending(false);
    }
  }, [input, sending]);

  const handleClear = useCallback(() => {
    if (messagesRef.current.length === 0) return;
    const doClear = () => {
      setMessages([]);
      clearMessages();
    };
    if (Platform.OS === "web") {
      doClear();
      return;
    }
    Alert.alert("Start a new chat?", "This will clear the current conversation.", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: doClear },
    ]);
  }, []);

  const inverted = useMemo(() => [...messages].reverse(), [messages]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
          backgroundColor: colors.background,
        },
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
          justifyContent: "space-between",
          paddingHorizontal: 16,
        },
        brandRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
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
        clearBtn: {
          width: 36,
          height: 36,
          borderRadius: 18,
          alignItems: "center",
          justifyContent: "center",
        },
        list: {
          flex: 1,
        },
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
          <View style={styles.brandRow}>
            <View style={styles.brandBadge}>
              <Feather name="heart" size={16} color={colors.primaryForeground} />
            </View>
            <View>
              <Text style={styles.brandTitle}>WifeChat</Text>
              <Text style={styles.brandSub}>Private · Not therapy</Text>
            </View>
          </View>
          <Pressable
            onPress={handleClear}
            style={({ pressed }) => [
              styles.clearBtn,
              { opacity: messages.length === 0 ? 0.3 : pressed ? 0.6 : 1 },
            ]}
            disabled={messages.length === 0}
            accessibilityLabel="Clear conversation"
            testID="clear-button"
          >
            <Feather name="edit" size={20} color={colors.mutedForeground} />
          </Pressable>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        {messages.length === 0 && hydrated ? (
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              <Feather name="message-circle" size={26} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Say the hard thing, well.</Text>
            <Text style={styles.emptySub}>
              A calm coach to help you write the next message, repair after a fight, or plan a hard talk.
            </Text>
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

        <View style={styles.inputBar}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.inputField}
              value={input}
              onChangeText={setInput}
              placeholder="Message your coach…"
              placeholderTextColor={colors.mutedForeground}
              multiline
              editable={!sending}
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
              accessibilityLabel="Send message"
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
