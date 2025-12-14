import bgc3 from "@/assets/images/bgc3.png";
import BornIcon from "@/assets/images/born.svg";
import DaoIcon from "@/assets/images/dao.svg";
import JiIcon from "@/assets/images/ji.svg";
import RcIcon from "@/assets/images/rc.svg";
import DayView from "@/components/calendar/DayView";
import EventList from "@/components/calendar/EventList";
import MonthView from "@/components/calendar/MonthView";
import { EventItem } from "@/components/calendar/types";
import WeekView from "@/components/calendar/WeekView";
import SafeAreaThemedView from "@/components/safe-area-view";
import AnniversaryScheduleForm from "@/components/schedule/AnniversaryScheduleForm";
import BornScheduleForm from "@/components/schedule/BornScheduleForm";
import CountdownScheduleForm from "@/components/schedule/CountdownScheduleForm";
import RcScheduleForm from "@/components/schedule/RcScheduleForm";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import DateJump from "@/components/tools/DateJump";
import LunarTools from "@/components/tools/LunarTools";
import SearchSchedule from "@/components/tools/SearchSchedule";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useAppThemeStore } from "@/hooks/use-app-theme";
import { useChecklistStore } from "@/hooks/useChecklist";
import { expandEventInRange, useEventsStore } from "@/hooks/useEvents";
import { generateIcs, parseIcs } from "@/utils/ics";
import dayjs from "dayjs";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as Speech from "expo-speech";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  ImageBackground,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, {
  Defs,
  Rect,
  Stop,
  LinearGradient as SvgLinearGradient,
} from "react-native-svg";

export default function CalendarTab() {
  const [view, setView] = useState<"month" | "week" | "day">("month");
  const [anchorDate, setAnchorDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const appTheme = useAppThemeStore((s) => s.theme) ?? "light";
  const palette = Colors[appTheme];
  const { height, width } = useWindowDimensions();
  const { addEvent, updateEvent, removeEvent, fetchEvents } = useEventsStore();
  const rawEvents = useEventsStore((s) => s.events);

  const todos = useChecklistStore((s) => s.items);
  const fetchTodos = useChecklistStore((s) => s.fetchItems);

  useEffect(() => {
    fetchEvents();
    fetchTodos();
  }, []);

  // 合并 Event 和有 deadline 的 Todos
  const events = useMemo(() => {
    const todoEvents: EventItem[] = todos
      .filter((t) => t.deadline && !t.done) // 只显示未完成且有日期的
      .map((t) => {
        const d = dayjs(t.deadline).startOf("day");
        return {
          id: `todo_${t.id}`,
          title: `[待办] ${t.title}`,
          start: d.toISOString(),
          end: d.add(1, "day").toISOString(),
          allDay: true,
          // 可以给个特殊颜色标识
          description: `优先级: ${t.priority}`,
        };
      });
    return [...rawEvents, ...todoEvents];
  }, [rawEvents, todos]);

  // 折叠/展开
  const [expanded, setExpanded] = useState(false);
  const anim = useRef(new Animated.Value(0)).current; // 0: 折叠, 1: 展开
  const collapsedHeight = Math.max(280, Math.floor(height * 0.46));
  const expandedHeight = Math.floor(height * 0.66);
  const calHeight = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [collapsedHeight, expandedHeight],
  });
  const slideX = useRef(new Animated.Value(0)).current; // 视图左右滑动动画

  useEffect(() => {
    Animated.timing(anim, {
      toValue: expanded ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [expanded]);

  // 左右滑动切换 月/周/日
  const swipeResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (_evt, _gesture) => false,
      onMoveShouldSetPanResponder: (_evt, gesture) => {
        const { dx, dy } = gesture;
        return Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10; // 明显水平滑动
      },
      onStartShouldSetPanResponderCapture: (_evt, _gesture) => false,
      onMoveShouldSetPanResponderCapture: (_evt, gesture) => {
        const { dx, dy } = gesture;
        return Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10;
      },
      onPanResponderMove: (_evt, gesture) => {
        slideX.setValue(gesture.dx * 0.6); // 拖动时跟随，稍微减弱位移
      },
      onPanResponderRelease: (_evt, gesture) => {
        const { dx, vx } = gesture;
        const shouldSwitch = Math.abs(dx) > 60 || Math.abs(vx) > 0.3;
        if (!shouldSwitch) {
          Animated.timing(slideX, {
            toValue: 0,
            duration: 180,
            useNativeDriver: true,
          }).start();
          return;
        }
        const forward = dx < 0; // 左滑: 前进，右滑: 后退
        const outTo = forward ? -width : width;
        const inFrom = forward ? width : -width;
        const unit: "month" | "week" | "day" =
          view === "month" ? "month" : view === "week" ? "week" : "day";
        Animated.timing(slideX, {
          toValue: outTo,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          // 切换日期范围
          const nextDate = dayjs(anchorDate)
            .add(forward ? 1 : -1, unit)
            .toDate();
          setAnchorDate(nextDate);
          // 从另一侧滑入新内容
          slideX.setValue(inFrom);
          Animated.timing(slideX, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start();
        });
      },
      onPanResponderTerminate: () => {
        Animated.timing(slideX, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  // 弹窗：新建/编辑/查看
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit" | "view">(
    "create"
  );
  const [sheetAtTop, setSheetAtTop] = useState(false); // 点击横线将弹窗移动到顶部

  // 右上角三点菜单 & 工具弹窗
  const [moreMenuVisible, setMoreMenuVisible] = useState(false);
  const [toolModalVisible, setToolModalVisible] = useState(false);
  const [toolMode, setToolMode] = useState<"search" | "jump" | "lunar" | null>(
    null
  );
  const [showLunar, setShowLunar] = useState(true);
  const [scheduleType, setScheduleType] = useState<
    "rc" | "born" | "ji" | "dao"
  >("rc");
  const [form, setForm] = useState<{
    id?: string;
    title: string;
    allDay: boolean;
    start: Date;
    end: Date;
    alarmMinutes?: number; // 开始前提醒分钟数
  }>({
    title: "",
    allDay: false,
    start: new Date(),
    end: dayjs().add(1, "hour").toDate(),
  });

  // 生日/纪念日/倒数日 表单
  type BornForm = { title: string; dateStr: string; alarmMinutes?: number };
  type JiForm = {
    title: string;
    dateStr: string;
    yearly: boolean;
    alarmMinutes?: number;
  };
  type DaoForm = {
    title: string;
    targetDateStr: string;
    alarmMinutes?: number;
  };
  const [bornForm, setBornForm] = useState<BornForm>({
    title: "",
    dateStr: dayjs(selectedDate).format("YYYY/MM/DD"),
    alarmMinutes: 0,
  });
  const [jiForm, setJiForm] = useState<JiForm>({
    title: "",
    dateStr: dayjs(selectedDate).format("YYYY/MM/DD"),
    yearly: true,
    alarmMinutes: 0,
  });
  const [daoForm, setDaoForm] = useState<DaoForm>({
    title: "",
    targetDateStr: dayjs(selectedDate).format("YYYY/MM/DD"),
    alarmMinutes: 0,
  });

  const openCreate = () => {
    const baseStart = dayjs(selectedDate)
      .hour(dayjs().hour())
      .minute(0)
      .second(0)
      .toDate();
    const baseEnd = dayjs(baseStart).add(1, "hour").toDate();
    setForm({
      title: "",
      allDay: false,
      start: baseStart,
      end: baseEnd,
      alarmMinutes: 0,
    });
    setModalMode("create");
    setScheduleType("rc");
    setModalVisible(true);
  };

  const openViewEdit = (e: EventItem) => {
    // 如果是 Todo 转换来的，不支持在日历里编辑，提示去清单修改
    if (e.id.startsWith("todo_")) {
      Alert.alert("提示", "这是一个待办事项，请前往“清单”页面进行编辑。");
      return;
    }

    setForm({
      id: e.id,
      title: e.title,
      allDay: !!e.allDay,
      start: dayjs(e.start).toDate(),
      end: dayjs(e.end).toDate(),
      alarmMinutes: e.alarms?.[0]?.offsetMinutes ?? 0,
    });
    setModalMode("view");
    setModalVisible(true);
  };

  const saveEvent = () => {
    const id = form.id ?? `e_${Date.now()}`;
    const payload: EventItem = {
      id,
      title: form.title || "未命名日程",
      start: dayjs(form.start).utc().toISOString(),
      end: dayjs(form.end).utc().toISOString(),
      allDay: form.allDay,
      alarms:
        form.alarmMinutes && form.alarmMinutes > 0
          ? [{ offsetMinutes: form.alarmMinutes }]
          : undefined,
    };
    if (form.id) {
      updateEvent(form.id, payload);
    } else {
      addEvent(payload);
    }
    // 简易本地提醒（原生端）：在事件开始前 offsetMinutes 调度一次
    scheduleReminderSafe(payload);
    setModalVisible(false);
  };

  const saveBorn = () => {
    const d = dayjs(bornForm.dateStr, "YYYY/MM/DD", true);
    if (!d.isValid()) return;
    const id = `born_${Date.now()}`;
    const payload: EventItem = {
      id,
      title: bornForm.title || "生日",
      start: d.utc().startOf("day").toISOString(),
      end: d.utc().startOf("day").add(1, "day").toISOString(),
      allDay: true,
      recurrence: { rrule: "FREQ=YEARLY;INTERVAL=1" },
      alarms:
        bornForm.alarmMinutes && bornForm.alarmMinutes > 0
          ? [{ offsetMinutes: bornForm.alarmMinutes }]
          : undefined,
    };
    addEvent(payload);
    scheduleReminderSafe(payload);
    setModalVisible(false);
  };

  const saveJi = () => {
    const d = dayjs(jiForm.dateStr, "YYYY/MM/DD", true);
    if (!d.isValid()) return;
    const id = `ann_${Date.now()}`;
    const payload: EventItem = {
      id,
      title: jiForm.title || "纪念日",
      start: d.utc().startOf("day").toISOString(),
      end: d.utc().startOf("day").add(1, "day").toISOString(),
      allDay: true,
      recurrence: jiForm.yearly
        ? { rrule: "FREQ=YEARLY;INTERVAL=1" }
        : undefined,
      alarms:
        jiForm.alarmMinutes && jiForm.alarmMinutes > 0
          ? [{ offsetMinutes: jiForm.alarmMinutes }]
          : undefined,
    };
    addEvent(payload);
    scheduleReminderSafe(payload);
    setModalVisible(false);
  };

  const saveDao = () => {
    const d = dayjs(daoForm.targetDateStr, "YYYY/MM/DD", true);
    if (!d.isValid()) return;
    const id = `dao_${Date.now()}`;
    const payload: EventItem = {
      id,
      title: daoForm.title || "倒数日",
      start: d.utc().startOf("day").toISOString(),
      end: d.utc().startOf("day").add(1, "day").toISOString(),
      allDay: true,
      alarms:
        daoForm.alarmMinutes && daoForm.alarmMinutes > 0
          ? [{ offsetMinutes: daoForm.alarmMinutes }]
          : undefined,
    };
    addEvent(payload);
    scheduleReminderSafe(payload);
    setModalVisible(false);
  };

  const deleteEvent = () => {
    if (form.id) {
      removeEvent(form.id);
      cancelReminderSafe(form.id);
    }
    setModalVisible(false);
  };

  const [banner, setBanner] = useState<{
    title: string;
    trigger: Date;
    event: EventItem;
  } | null>(null);

  useEffect(() => {
    const compute = () => {
      const now = dayjs();
      const end = now.add(1, "hour").toDate();
      let best: {
        title: string;
        trigger: Date;
        event: EventItem;
      } | null = null;
      for (const e of events) {
        if (!e.alarms || e.alarms.length === 0) continue;
        const offset = e.alarms[0].offsetMinutes ?? 0;
        const occs = expandEventInRange(e, { start: now.toDate(), end });
        for (const o of occs) {
          const t = dayjs(o.start).subtract(offset, "minute");
          if (t.isAfter(now) && t.isBefore(end)) {
            if (!best || t.isBefore(best.trigger)) {
              best = { title: e.title, trigger: t.toDate(), event: e };
            }
          }
        }
      }
      setBanner(best);
    };
    compute();
    const id = setInterval(compute, 60000);
    return () => clearInterval(id);
  }, [events]);

  // 平台安全的提醒封装（Web 跳过）
  const scheduleReminderSafe = async (event: EventItem) => {
    try {
      if (process.env.EXPO_OS === "web" || Platform.OS === "web") return;
      const Notifications = await import("expo-notifications");

      const { status } = await Notifications.getPermissionsAsync();
      if (status !== "granted") {
        const { status: newStatus } =
          await Notifications.requestPermissionsAsync();
        if (newStatus !== "granted") {
          Alert.alert("权限提示", "请在设置中开启通知权限，否则无法接收提醒");
          return;
        }
      }

      // Android: 建立高优先级“闹钟”通道（一次性）
      if (process.env.EXPO_OS === "android" || Platform.OS === "android") {
        try {
          await Notifications.setNotificationChannelAsync("alarm", {
            name: "闹钟提醒",
            importance: Notifications.AndroidImportance.MAX,
            sound: "default",
            enableVibrate: true,
            vibrationPattern: [0, 500, 200, 500], // 震动更强烈一点
            lockscreenVisibility:
              Notifications.AndroidNotificationVisibility.PUBLIC,
          });
        } catch {}
      }

      if (event.alarms && event.alarms.length > 0) {
        const offset = event.alarms[0].offsetMinutes ?? 0;
        const now = dayjs();
        const end = now.add(3, "month").toDate();
        const occs = expandEventInRange(event, { start: now.toDate(), end });
        const ids: string[] = [];

        // 限制最多 5 个未来提醒，避免刷屏
        for (const o of occs.slice(0, 5)) {
          const triggerDate = dayjs(o.start)
            .subtract(offset, "minute")
            .toDate();

          // 如果触发时间已经过去了，就跳过
          if (triggerDate.getTime() <= Date.now()) continue;

          const id = await Notifications.scheduleNotificationAsync({
            content: {
              title: "日程提醒",
              body: `${event.title} 将在 ${offset} 分钟后开始`,
              sound: "default", // 确保 iOS 也有声音
              channelId: "alarm",
              data: { eventId: event.id },
            },
            trigger: triggerDate,
          });
          ids.push(id);
        }

        // 只有当有新 ID 生成时才更新，避免无限循环更新
        if (ids.length > 0) {
          // 这里我们不直接调用 updateEvent 触发网络请求，因为这会导致死循环（saveEvent -> schedule -> update -> save...）
          // 而是静默更新 store 中的本地状态，或者只有当 ID 列表真正变化很大时才更新
          // 为了简单起见，这里暂不回写 ID 到后端，因为本地提醒 ID 重启后其实也没用了（系统接管了）
          // 但为了能取消，还是需要存。
          // 改进策略：scheduleReminderSafe 应该返回 ids，由 saveEvent 统一决定是否更新
        }
        // 临时方案：直接在这里更新，但要注意 saveEvent 里不要重复调用 update
        if (ids.length > 0) {
          // 仅更新 notificationIds 字段
          updateEvent(event.id, { notificationIds: ids });
        }
      }
    } catch (e) {
      console.log("Schedule error:", e);
    }
  };

  const cancelReminderSafe = async (_eventId: string) => {
    try {
      if (process.env.EXPO_OS === "web") return;
      const Notifications = await import("expo-notifications");
      const target = (useEventsStore.getState().events || []).find(
        (e) => e.id === _eventId
      );
      if (target?.notificationIds?.length) {
        for (const nid of target.notificationIds) {
          try {
            await Notifications.cancelScheduledNotificationAsync(nid);
          } catch {}
        }
        updateEvent(_eventId, { notificationIds: [] });
      }
    } catch {}
  };

  const handleExport = async () => {
    setMoreMenuVisible(false);
    try {
      const ics = generateIcs(events);

      if (process.env.EXPO_OS === "web" || Platform.OS === "web") {
        const blob = new Blob([ics], { type: "text/calendar" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `calendar_export_${dayjs().format("YYYYMMDD")}.ics`;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }

      const fileUri = FileSystem.documentDirectory + "calendar_export.ics";
      await FileSystem.writeAsStringAsync(fileUri, ics);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert("提示", "无法分享文件");
      }
    } catch (e: any) {
      console.error("Export failed:", e);
      Alert.alert("导出错误", e.message || "未知错误");
    }
  };

  const handleImport = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: "text/calendar", // or application/octet-stream or */*
        copyToCacheDirectory: true,
      });
      if (res.canceled) return;

      let content = "";
      if (process.env.EXPO_OS === "web") {
        // @ts-ignore
        const file = res.assets[0].file;
        if (file) {
          content = await file.text();
        } else {
          const response = await fetch(res.assets[0].uri);
          content = await response.text();
        }
      } else {
        const file = res.assets[0];
        content = await FileSystem.readAsStringAsync(file.uri);
      }

      const importedEvents = parseIcs(content);

      let count = 0;
      for (const ie of importedEvents) {
        if (ie.title && ie.start && ie.end) {
          addEvent({
            id: ie.id || `import_${Date.now()}_${count}`,
            title: ie.title,
            start: ie.start,
            end: ie.end,
            allDay: false,
            recurrence: ie.recurrence,
            description: ie.description,
            location: ie.location,
          });
          count++;
        }
      }
      Alert.alert("成功", `已导入 ${count} 条日程`);
      setMoreMenuVisible(false);
    } catch (e) {
      console.error(e);
      Alert.alert("错误", "导入失败");
    }
  };

  return (
    <SafeAreaThemedView style={styles.container}>
      <ImageBackground
        source={bgc3}
        style={StyleSheet.absoluteFillObject}
        imageStyle={{ opacity: 0.9 }}
        resizeMode="cover"
      />
      <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        <Svg width="100%" height="100%" preserveAspectRatio="none">
          <Defs>
            <SvgLinearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#FEFCF3" stopOpacity="0.5" />
              <Stop offset="0.5" stopColor="#FEFCF3" stopOpacity="0.25" />
              <Stop offset="1" stopColor="#FEFCF3" stopOpacity="0" />
            </SvgLinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#bgGrad)" />
        </Svg>
      </View>
      {/* 顶部操作栏：标题 + 加号 + 三点 */}
      <View style={styles.topBar}>
        <ThemedText type="title">日历</ThemedText>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            onPress={openCreate}
            android_ripple={{ color: palette.tint + "44" }}
            style={styles.iconBtn}
          >
            <IconSymbol name="plus" color={palette.text} size={22} />
          </Pressable>
          <Pressable
            onPress={() => setMoreMenuVisible((v) => !v)}
            android_ripple={{ color: palette.tint + "44" }}
            style={styles.iconBtn}
          >
            <IconSymbol name="ellipsis" color={palette.text} size={22} />
          </Pressable>
        </View>
      </View>

      {/* 右上角三点菜单 */}
      {moreMenuVisible && (
        <View style={styles.moreMenuOverlay}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setMoreMenuVisible(false)}
          />
          <View
            style={[
              styles.moreMenuCard,
              {
                backgroundColor: appTheme === "dark" ? "#1f2429" : "#fff",
                borderColor: appTheme === "dark" ? "#2a2f34" : "#e5e7eb",
              },
            ]}
          >
            {[
              { key: "search" as const, label: "搜索日程" },
              { key: "jump" as const, label: "日期跳转" },
              { key: "lunar" as const, label: "农历设置" },
              { key: "import" as const, label: "导入日程" },
              { key: "export" as const, label: "导出日程" },
            ].map((opt, idx) => (
              <Pressable
                key={opt.key}
                style={[
                  styles.moreMenuItem,
                  idx > 0 && {
                    borderTopColor: appTheme === "dark" ? "#2a2f34" : "#e5e7eb",
                    borderTopWidth: 1,
                  },
                ]}
                onPress={() => {
                  if (opt.key === "import") {
                    handleImport();
                  } else if (opt.key === "export") {
                    handleExport();
                  } else {
                    setMoreMenuVisible(false);
                    setToolMode(opt.key);
                    setToolModalVisible(true);
                  }
                }}
              >
                <ThemedText>{opt.label}</ThemedText>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {banner && (
        <ThemedView
          style={[
            styles.modalCard,
            {
              paddingVertical: 10,
              marginTop: 8,
              backgroundColor: palette.tint + "11",
            },
          ]}
        >
          <View style={[styles.rowBetween]}>
            <ThemedText>
              {`提醒：${banner.title}（${dayjs(banner.trigger).format(
                "HH:mm"
              )}）`}
            </ThemedText>
            <Pressable
              style={styles.smallBtn}
              onPress={() => openViewEdit(banner.event)}
              android_ripple={{ color: palette.tint + "44" }}
            >
              <ThemedText style={{ color: palette.tint }}>查看</ThemedText>
            </Pressable>
          </View>
        </ThemedView>
      )}

      <ScrollView
        contentContainerStyle={{ paddingBottom: 20 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.tabs}>
          {(["month", "week", "day"] as const).map((k) => (
            <Pressable
              key={k}
              style={[
                styles.tab,
                { borderColor: appTheme === "dark" ? "#2a2f34" : "#e5e7eb" },
                view === k && {
                  backgroundColor: palette.tint + "22",
                  borderColor: palette.tint,
                },
              ]}
              onPress={() => {
                const label =
                  k === "month" ? "月视图" : k === "week" ? "周视图" : "日视图";
                Speech.speak(`切换到${label}`, { language: "zh-CN" });
                setView(k);
              }}
              android_ripple={{ color: palette.tint + "55", borderless: false }}
            >
              <ThemedText>
                {k === "month" ? "月" : k === "week" ? "周" : "日"}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        <View {...swipeResponder.panHandlers}>
          <Animated.View style={[styles.calendarBox, { height: calHeight }]}>
            <Animated.View
              style={[
                styles.slideContainer,
                { transform: [{ translateX: slideX }] },
              ]}
            >
              {view === "month" && (
                <MonthView
                  anchorDate={anchorDate}
                  selectedDate={selectedDate}
                  onSelectDate={(d) => {
                    setSelectedDate(d);
                    setAnchorDate(d);
                  }}
                  onChangeMonth={(delta) =>
                    setAnchorDate(
                      dayjs(anchorDate).add(delta, "month").toDate()
                    )
                  }
                  weekStartsOn={0}
                  showLunar={showLunar}
                />
              )}
              {view === "week" && (
                <WeekView
                  anchorDate={anchorDate}
                  onSelectDate={(d) => {
                    setSelectedDate(d);
                    setAnchorDate(d);
                  }}
                  onChangeWeek={(delta) =>
                    setAnchorDate(dayjs(anchorDate).add(delta, "week").toDate())
                  }
                  weekStartsOn={0}
                />
              )}
              {view === "day" && <DayView date={selectedDate} />}
            </Animated.View>
          </Animated.View>
        </View>

        {/* 底部小横线句柄：点击切换折叠/展开 */}
        <Pressable
          accessibilityRole="button"
          onPress={() => setExpanded((v) => !v)}
          style={[styles.handleWrap]}
          android_ripple={{ color: palette.tint + "33", borderless: false }}
        >
          <View
            style={[
              styles.handle,
              { backgroundColor: appTheme === "dark" ? "#3a3f45" : "#cfd5db" },
            ]}
          />
          <ThemedText style={{ opacity: 0.6 }}>
            {expanded ? "收起" : "展开"}
          </ThemedText>
        </Pressable>

        <EventList date={selectedDate} onOpenEvent={openViewEdit} />
      </ScrollView>

      {/* 新建/查看/编辑 弹窗 */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View
          style={[
            styles.modalOverlay,
            sheetAtTop && { justifyContent: "flex-start" },
          ]}
        >
          {/* 点击遮罩关闭弹窗（保留关闭按钮） */}
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setModalVisible(false)}
          />
          <ThemedView
            style={[
              styles.modalCard,
              { maxHeight: Math.floor(height * 0.85) },
              sheetAtTop && { marginTop: 24 },
            ]}
          >
            {/* 顶部横线句柄：点击将弹窗移到顶部/底部 */}
            <Pressable
              onPress={() => setSheetAtTop((v) => !v)}
              style={styles.sheetHandleWrap}
            >
              <View
                style={[
                  styles.sheetHandle,
                  {
                    backgroundColor:
                      appTheme === "dark" ? "#3a3f45" : "#cfd5db",
                  },
                ]}
              />
            </Pressable>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <ThemedText type="title">
                {scheduleType === "rc"
                  ? modalMode === "create"
                    ? "创建日程"
                    : modalMode === "view"
                    ? "查看日程"
                    : "编辑日程"
                  : scheduleType === "born"
                  ? modalMode === "create"
                    ? "创建生日"
                    : modalMode === "view"
                    ? "查看生日"
                    : "编辑生日"
                  : scheduleType === "ji"
                  ? modalMode === "create"
                    ? "创建纪念日"
                    : modalMode === "view"
                    ? "查看纪念日"
                    : "编辑纪念日"
                  : modalMode === "create"
                  ? "创建倒数日"
                  : modalMode === "view"
                  ? "查看倒数日"
                  : "编辑倒数日"}
              </ThemedText>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {modalMode !== "view" &&
                  (scheduleType === "rc" ? (
                    <Pressable
                      onPress={saveEvent}
                      style={styles.actionBtn}
                      android_ripple={{ color: palette.tint + "44" }}
                    >
                      <ThemedText style={{ color: palette.tint }}>
                        保存
                      </ThemedText>
                    </Pressable>
                  ) : scheduleType === "born" ? (
                    <Pressable
                      onPress={saveBorn}
                      style={styles.actionBtn}
                      android_ripple={{ color: palette.tint + "44" }}
                    >
                      <ThemedText style={{ color: palette.tint }}>
                        保存
                      </ThemedText>
                    </Pressable>
                  ) : scheduleType === "ji" ? (
                    <Pressable
                      onPress={saveJi}
                      style={styles.actionBtn}
                      android_ripple={{ color: palette.tint + "44" }}
                    >
                      <ThemedText style={{ color: palette.tint }}>
                        保存
                      </ThemedText>
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={saveDao}
                      style={styles.actionBtn}
                      android_ripple={{ color: palette.tint + "44" }}
                    >
                      <ThemedText style={{ color: palette.tint }}>
                        保存
                      </ThemedText>
                    </Pressable>
                  ))}
                {form.id && (
                  <Pressable
                    onPress={deleteEvent}
                    style={styles.actionBtn}
                    android_ripple={{ color: "#ff444422" }}
                  >
                    <ThemedText style={{ color: "#ff4444" }}>删除</ThemedText>
                  </Pressable>
                )}
                <Pressable
                  onPress={() => setModalVisible(false)}
                  style={styles.actionBtn}
                  android_ripple={{ color: palette.tint + "22" }}
                >
                  <ThemedText>关闭</ThemedText>
                </Pressable>
              </View>
            </View>

            {/* 弹窗内类型标签：日程 / 生日 / 纪念日 / 倒数日 */}
            <View style={styles.modalTabs}>
              {[
                { key: "rc" as const, label: "日程", Icon: RcIcon },
                { key: "born" as const, label: "生日", Icon: BornIcon },
                { key: "ji" as const, label: "纪念日", Icon: JiIcon },
                { key: "dao" as const, label: "倒数日", Icon: DaoIcon },
              ].map(({ key, label, Icon }) => (
                <Pressable
                  key={key}
                  style={[
                    styles.modalTab,
                    {
                      borderColor: appTheme === "dark" ? "#2a2f34" : "#e5e7eb",
                    },
                    scheduleType === key && {
                      backgroundColor: palette.tint + "22",
                      borderColor: palette.tint,
                    },
                  ]}
                  onPress={() => setScheduleType(key)}
                  android_ripple={{
                    color: palette.tint + "55",
                    borderless: false,
                  }}
                >
                  <Icon width={24} height={24} />
                  <ThemedText style={{ marginTop: 4 }}>{label}</ThemedText>
                </Pressable>
              ))}
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ gap: 10, paddingBottom: 12 }}
            >
              {scheduleType === "rc" && (
                <RcScheduleForm
                  form={form}
                  setForm={(updater) => setForm((f) => updater(f))}
                />
              )}
              {scheduleType === "born" && (
                <BornScheduleForm
                  form={bornForm}
                  setForm={(updater) => setBornForm((f) => updater(f))}
                />
              )}
              {scheduleType === "ji" && (
                <AnniversaryScheduleForm
                  form={jiForm}
                  setForm={(updater) => setJiForm((f) => updater(f))}
                />
              )}
              {scheduleType === "dao" && (
                <CountdownScheduleForm
                  form={daoForm}
                  setForm={(updater) => setDaoForm((f) => updater(f))}
                />
              )}
            </ScrollView>
          </ThemedView>
        </View>
      </Modal>

      {/* 工具弹窗：搜索 / 跳转 / 推算 */}
      <Modal
        visible={toolModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setToolModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setToolModalVisible(false)}
          />
          <ThemedView
            style={[styles.modalCard, { maxHeight: Math.floor(height * 0.85) }]}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <ThemedText type="title">
                {toolMode === "search"
                  ? "搜索日程"
                  : toolMode === "jump"
                  ? "日期跳转"
                  : toolMode === "lunar"
                  ? "农历设置"
                  : ""}
              </ThemedText>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable
                  onPress={() => setToolModalVisible(false)}
                  style={styles.actionBtn}
                  android_ripple={{ color: palette.tint + "22" }}
                >
                  <ThemedText>关闭</ThemedText>
                </Pressable>
              </View>
            </View>

            {toolMode === "search" && (
              <SearchSchedule
                onOpenEvent={(e) => {
                  setToolModalVisible(false);
                  openViewEdit(e);
                }}
              />
            )}
            {toolMode === "jump" && (
              <DateJump
                initialDate={new Date()}
                onCancel={() => setToolModalVisible(false)}
                onJump={(d) => {
                  setSelectedDate(d);
                  setAnchorDate(d);
                  setToolModalVisible(false);
                }}
              />
            )}
            {toolMode === "lunar" && (
              <LunarTools
                date={selectedDate}
                showLunar={showLunar}
                onToggle={(v) => setShowLunar(v)}
              />
            )}
          </ThemedView>
        </View>
      </Modal>
    </SafeAreaThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 10,
  },
  header: { gap: 4, marginBottom: 8 },
  tabs: { flexDirection: "row", gap: 8, marginBottom: 8 },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  calendarBox: { overflow: "hidden" },
  slideContainer: { flex: 1 },
  handleWrap: { alignItems: "center", gap: 6, paddingVertical: 8 },
  handle: { width: 40, height: 4, borderRadius: 2 },
  iconBtn: { padding: 8, borderRadius: 10 },
  moreMenuOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 100,
  },
  moreMenuCard: {
    position: "absolute",
    right: 16,
    top: 54,
    width: 220,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 101,
  },
  moreMenuItem: { paddingHorizontal: 16, paddingVertical: 12 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "#00000055",
    justifyContent: "flex-end",
  },
  modalCard: {
    padding: 16,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    backgroundColor: "#fff",
    gap: 10,
  },
  modalTabs: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "stretch",
    gap: 8,
    marginBottom: 8,
  },
  modalTab: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  sheetHandleWrap: { alignItems: "center", paddingVertical: 6 },
  sheetHandle: { width: 40, height: 4, borderRadius: 9999 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  smallBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
  },
  actionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
  },
});
