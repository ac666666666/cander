import SafeAreaThemedView from "@/components/safe-area-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useAppThemeStore } from "@/hooks/use-app-theme";
import {
  ChecklistItem,
  Priority,
  useChecklistStore,
} from "@/hooks/useChecklist";
import dayjs from "dayjs";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import ConfettiCannon from "react-native-confetti-cannon";

export default function TodoListScreen() {
  const router = useRouter();
  const theme = useAppThemeStore((s) => s.theme);
  const palette = Colors[theme ?? "light"];

  const items = useChecklistStore((s) => s.items);
  const addItem = useChecklistStore((s) => s.addItem);
  const updateItem = useChecklistStore((s) => s.updateItem);
  const removeItem = useChecklistStore((s) => s.removeItem);
  const toggleDone = useChecklistStore((s) => s.toggleDone);

  const fetchItems = useChecklistStore((s) => s.fetchItems);

  // Confetti ref
  const explosion = useRef<ConfettiCannon>(null);

  useEffect(() => {
    fetchItems();
  }, []);

  const handleToggleDone = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (item && !item.done) {
      // 如果是从未完成变为完成，触发撒花
      explosion.current?.start();
    }
    toggleDone(id);
  };

  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [deadline, setDeadline] = useState(""); // YYYY-MM-DD format for input

  const openAdd = () => {
    setEditingId(null);
    setTitle("");
    setPriority("medium");
    setDeadline(dayjs().add(1, "day").format("YYYY-MM-DD"));
    setModalVisible(true);
  };

  const openEdit = (item: ChecklistItem) => {
    setEditingId(item.id);
    setTitle(item.title);
    setPriority(item.priority ?? "medium");
    setDeadline(item.deadline ? dayjs(item.deadline).format("YYYY-MM-DD") : "");
    setModalVisible(true);
  };

  const handleSave = () => {
    if (!title.trim()) return;

    let deadlineIso: string | undefined = undefined;
    if (deadline.trim()) {
      const d = dayjs(deadline);
      if (d.isValid()) {
        deadlineIso = d.toISOString();
      }
    }

    if (editingId) {
      updateItem(editingId, { title, priority, deadline: deadlineIso });
    } else {
      addItem(title, priority, deadlineIso);
    }
    setModalVisible(false);
  };

  const handleDelete = () => {
    if (editingId) {
      removeItem(editingId);
      setModalVisible(false);
    }
  };

  const pendingItems = items.filter((i) => !i.done);
  const completedItems = items.filter((i) => i.done);

  const getPriorityColor = (p?: Priority) => {
    switch (p) {
      case "high":
        return "#ef4444"; // red
      case "medium":
        return "#f59e0b"; // amber
      case "low":
        return "#3b82f6"; // blue
      default:
        return "#9ca3af"; // gray
    }
  };

  const getPriorityLabel = (p?: Priority) => {
    switch (p) {
      case "high":
        return "高";
      case "medium":
        return "中";
      case "low":
        return "低";
      default:
        return "无";
    }
  };

  const renderItem = ({ item }: { item: ChecklistItem }) => (
    <Pressable
      style={[
        styles.card,
        {
          backgroundColor: theme === "dark" ? "#1f2937" : "#fff",
          borderColor: theme === "dark" ? "#374151" : "#e5e7eb",
        },
      ]}
      onPress={() => openEdit(item)}
    >
      <Pressable
        style={[
          styles.checkbox,
          {
            borderColor: item.done ? palette.tint : "#9ca3af",
            backgroundColor: item.done ? palette.tint : "transparent",
          },
        ]}
        onPress={() => handleToggleDone(item.id)}
      >
        {item.done && <IconSymbol name="checkmark" size={14} color="#fff" />}
      </Pressable>

      <View style={{ flex: 1, gap: 4 }}>
        <ThemedText style={[item.done && styles.doneText]}>
          {item.title}
        </ThemedText>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          {item.priority && (
            <View
              style={[
                styles.badge,
                { backgroundColor: getPriorityColor(item.priority) + "20" },
              ]}
            >
              <ThemedText
                style={{
                  fontSize: 10,
                  color: getPriorityColor(item.priority),
                  fontWeight: "600",
                }}
              >
                {getPriorityLabel(item.priority)}
              </ThemedText>
            </View>
          )}
          {item.deadline && (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 2 }}
            >
              <IconSymbol name="calendar" size={12} color="#9ca3af" />
              <ThemedText style={{ fontSize: 11, color: "#6b7280" }}>
                {dayjs(item.deadline).format("MM-DD")}
              </ThemedText>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );

  return (
    <SafeAreaThemedView style={styles.container}>
      <View style={styles.header}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <ThemedText type="title">待办清单</ThemedText>
          <Pressable
            onPress={() => router.push("/stats")}
            style={{ padding: 8 }}
          >
            <IconSymbol name="chart.bar.fill" size={24} color={palette.text} />
          </Pressable>
        </View>
        <ThemedText style={{ fontSize: 14, color: "#6b7280" }}>
          {pendingItems.length} 个待办
        </ThemedText>
      </View>

      <FlatList
        data={[...pendingItems, ...completedItems]}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 80, gap: 12 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={{ alignItems: "center", marginTop: 60 }}>
            <ThemedText style={{ opacity: 0.5 }}>
              暂无任务，点击右下角添加
            </ThemedText>
          </View>
        }
      />

      <Pressable
        style={[styles.fab, { backgroundColor: palette.tint }]}
        onPress={openAdd}
        android_ripple={{ color: "#ffffff55", borderless: true }}
      >
        <ThemedText style={{ fontSize: 32, color: "#fff", lineHeight: 32 }}>
          +
        </ThemedText>
      </Pressable>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme === "dark" ? "#1f2937" : "#fff" },
            ]}
          >
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">
                {editingId ? "编辑任务" : "新建任务"}
              </ThemedText>
              <Pressable onPress={() => setModalVisible(false)}>
                <ThemedText style={{ color: "#9ca3af" }}>取消</ThemedText>
              </Pressable>
            </View>

            <View style={{ gap: 16 }}>
              <View>
                <ThemedText style={styles.label}>任务名称</ThemedText>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="输入任务名称"
                  placeholderTextColor="#9ca3af"
                  style={[
                    styles.input,
                    {
                      color: theme === "dark" ? "#fff" : "#000",
                      borderColor: theme === "dark" ? "#374151" : "#e5e7eb",
                    },
                  ]}
                />
              </View>

              <View>
                <ThemedText style={styles.label}>优先级</ThemedText>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  {(["high", "medium", "low"] as Priority[]).map((p) => (
                    <Pressable
                      key={p}
                      onPress={() => setPriority(p)}
                      style={[
                        styles.priorityChip,
                        {
                          borderColor:
                            priority === p
                              ? getPriorityColor(p)
                              : theme === "dark"
                              ? "#374151"
                              : "#e5e7eb",
                        },
                        priority === p && {
                          backgroundColor: getPriorityColor(p) + "15",
                        },
                      ]}
                    >
                      <ThemedText
                        style={{
                          color:
                            priority === p ? getPriorityColor(p) : "#9ca3af",
                        }}
                      >
                        {getPriorityLabel(p)}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View>
                <ThemedText style={styles.label}>
                  截止日期 (YYYY-MM-DD)
                </ThemedText>
                <TextInput
                  value={deadline}
                  onChangeText={setDeadline}
                  placeholder="例如: 2025-01-01"
                  placeholderTextColor="#9ca3af"
                  style={[
                    styles.input,
                    {
                      color: theme === "dark" ? "#fff" : "#000",
                      borderColor: theme === "dark" ? "#374151" : "#e5e7eb",
                    },
                  ]}
                />
                <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                  <Pressable
                    style={styles.quickDateBtn}
                    onPress={() => setDeadline(dayjs().format("YYYY-MM-DD"))}
                  >
                    <ThemedText style={{ fontSize: 12 }}>今天</ThemedText>
                  </Pressable>
                  <Pressable
                    style={styles.quickDateBtn}
                    onPress={() =>
                      setDeadline(dayjs().add(1, "day").format("YYYY-MM-DD"))
                    }
                  >
                    <ThemedText style={{ fontSize: 12 }}>明天</ThemedText>
                  </Pressable>
                  <Pressable
                    style={styles.quickDateBtn}
                    onPress={() =>
                      setDeadline(dayjs().add(7, "day").format("YYYY-MM-DD"))
                    }
                  >
                    <ThemedText style={{ fontSize: 12 }}>下周</ThemedText>
                  </Pressable>
                </View>
              </View>

              <Pressable
                style={[styles.saveBtn, { backgroundColor: palette.tint }]}
                onPress={handleSave}
              >
                <ThemedText
                  style={{
                    color: "#fff",
                    fontWeight: "600",
                    textAlign: "center",
                  }}
                >
                  保存
                </ThemedText>
              </Pressable>

              {editingId && (
                <Pressable
                  style={[
                    styles.saveBtn,
                    { backgroundColor: "#ef4444", marginTop: 0 },
                  ]}
                  onPress={handleDelete}
                >
                  <ThemedText
                    style={{
                      color: "#fff",
                      fontWeight: "600",
                      textAlign: "center",
                    }}
                  >
                    删除
                  </ThemedText>
                </Pressable>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <ConfettiCannon
        count={200}
        origin={{ x: -10, y: 0 }}
        autoStart={false}
        ref={explosion}
        fadeOut={true}
      />
    </SafeAreaThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { marginBottom: 20 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  doneText: { textDecorationLine: "line-through", opacity: 0.5 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  fab: {
    position: "absolute",
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "#00000066",
    justifyContent: "flex-end",
  },
  modalContent: {
    padding: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  label: { fontSize: 14, color: "#6b7280", marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 16 },
  priorityChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 60,
    alignItems: "center",
  },
  quickDateBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
  },
  saveBtn: { padding: 14, borderRadius: 12, marginTop: 8 },
});
