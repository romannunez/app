import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../lib/store";
import type { DbMessage } from "../../lib/types";

export default function ChatRoom() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<DbMessage[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [eventTitle, setEventTitle] = useState("Chat del evento");

  // Fetch event title
  useEffect(() => {
    if (!eventId) return;
    supabase
      .from("events")
      .select("title")
      .eq("id", Number(eventId))
      .single()
      .then(({ data }) => {
        if (data?.title) setEventTitle(data.title);
      });
  }, [eventId]);

  // Fetch history
  useEffect(() => {
    if (!eventId) return;

    async function fetchMessages() {
      const { data, error } = await supabase
        .from("messages")
        .select("*, sender:profiles!sender_id(id, name, avatar)")
        .eq("event_id", Number(eventId))
        .order("created_at", { ascending: true })
        .limit(200);

      if (!error && data) {
        setMessages(data as DbMessage[]);
      }
      setLoading(false);
    }

    fetchMessages();
  }, [eventId]);

  // Realtime subscription
  useEffect(() => {
    if (!eventId) return;

    const channel = supabase
      .channel(`chat-${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `event_id=eq.${eventId}`,
        },
        async (payload) => {
          // Fetch full message with sender info
          const { data } = await supabase
            .from("messages")
            .select("*, sender:profiles!sender_id(id, name, avatar)")
            .eq("id", payload.new.id)
            .single();

          if (data) {
            setMessages((prev) => [...prev, data as DbMessage]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const sendMessage = useCallback(async () => {
    if (!newMsg.trim() || !user || !eventId) return;

    const text = newMsg.trim();
    setNewMsg("");

    await supabase.from("messages").insert({
      event_id: Number(eventId),
      sender_id: user.id,
      content: text,
      message_type: "text",
    });
  }, [newMsg, user, eventId]);

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  };

  const isOwnMessage = (msg: DbMessage) =>
    user && String(msg.sender_id) === user.id;

  const renderMessage = ({ item }: { item: DbMessage }) => {
    const isOwn = isOwnMessage(item);
    const senderName = (item.sender as any)?.name ?? "Usuario";

    return (
      <View style={[styles.messageContainer, isOwn ? styles.messageRight : styles.messageLeft]}>
        {!isOwn && (
          <Text style={styles.senderName}>{senderName}</Text>
        )}
        <View
          style={[
            styles.messageBubble,
            isOwn ? styles.ownBubble : styles.otherBubble,
          ]}
        >
          <Text style={[styles.messageText, isOwn ? styles.ownMessageText : styles.otherMessageText]}>
            {item.content}
          </Text>
          <Text style={[styles.messageTime, isOwn ? styles.ownTime : styles.otherTime]}>
            {formatTime(item.created_at)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#1A1A1A" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {eventTitle}
          </Text>
          <Text style={styles.headerSubtitle}>Chat del evento</Text>
        </View>
        <TouchableOpacity onPress={() => router.push(`/event/${eventId}`)}>
          <Ionicons name="information-circle-outline" size={24} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#ffd500ff" size="large" />
          <Text style={styles.loadingText}>Cargando mensajes...</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingVertical: 16 }}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: false })
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>
                No hay mensajes aún. ¡Sé el primero en escribir!
              </Text>
            </View>
          }
        />
      )}

      {/* Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <View
          style={[
            styles.inputContainer,
            { paddingBottom: Math.max(insets.bottom, 8) },
          ]}
        >
          <View style={styles.inputWrapper}>
            <TextInput
              placeholder="Escribí un mensaje..."
              placeholderTextColor="#9CA3AF"
              style={styles.input}
              value={newMsg}
              onChangeText={setNewMsg}
              multiline
              editable={!!user}
              onSubmitEditing={sendMessage}
            />
          </View>
          <TouchableOpacity
            onPress={sendMessage}
            disabled={!newMsg.trim() || !user}
            style={[
              styles.sendButton,
              newMsg.trim() ? styles.sendButtonActive : styles.sendButtonInactive,
            ]}
          >
            <Ionicons
              name="send"
              size={18}
              color={newMsg.trim() ? "#1A1A1A" : "#D1D5DB"}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 1,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "#9CA3AF",
    marginTop: 12,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyText: {
    color: "#9CA3AF",
    fontSize: 14,
    marginTop: 12,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  messageContainer: {
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  messageLeft: {
    alignItems: "flex-start",
  },
  messageRight: {
    alignItems: "flex-end",
  },
  senderName: {
    color: "#ffd500ff",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 2,
  },
  messageBubble: {
    maxWidth: "80%",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  ownBubble: {
    backgroundColor: "#ffd500ff",
    borderTopRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderTopLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  ownMessageText: {
    color: "#1A1A1A",
  },
  otherMessageText: {
    color: "#374151",
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
    textAlign: "right",
  },
  ownTime: {
    color: "rgba(26,26,26,0.5)",
  },
  otherTime: {
    color: "#9CA3AF",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    maxHeight: 96,
  },
  input: {
    color: "#1A1A1A",
    fontSize: 14,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonActive: {
    backgroundColor: "#ffd500ff",
  },
  sendButtonInactive: {
    backgroundColor: "#F3F4F6",
  },
});
