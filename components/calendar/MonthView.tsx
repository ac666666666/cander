import { memo, useMemo } from 'react';
import * as Speech from 'expo-speech';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { View, StyleSheet, Pressable } from 'react-native';
import dayjs from 'dayjs';
import { Colors, Fonts } from '@/constants/theme';
import { useAppThemeStore } from '@/hooks/use-app-theme';
import solarlunar from 'solarlunar';
import { useOccurrences } from '@/hooks/useEvents';

type Props = {
  anchorDate: Date;
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  onChangeMonth: (delta: number) => void; // -1 上一月, +1 下一月
  weekStartsOn?: 0 | 1; // 0: 周日, 1: 周一
  showLunar?: boolean;
};

function MonthViewBase({ anchorDate, selectedDate, onSelectDate, onChangeMonth, weekStartsOn = 0, showLunar = true }: Props) {
  const theme = useAppThemeStore((s) => s.theme);
  const palette = Colors[theme];

  const grid = useMemo(() => {
    const monthStart = dayjs(anchorDate).startOf('month');
    const startOfGrid = weekStartsOn === 1 ? monthStart.startOf('week') : monthStart.startOf('week').add(-1, 'day');
    const days: Date[] = [];
    for (let i = 0; i < 42; i++) {
      days.push(startOfGrid.add(i, 'day').toDate());
    }
    return days;
  }, [anchorDate, weekStartsOn]);

  // 计算当月范围内哪些日期有事件
  const monthOccs = useOccurrences('month', anchorDate, weekStartsOn);
  const hasEventMap = useMemo(() => {
    const set = new Set<string>();
    for (const o of monthOccs) {
      set.add(dayjs(o.start).format('YYYY-MM-DD'));
    }
    return set;
  }, [monthOccs]);

  const isSameDay = (a: Date, b: Date) => dayjs(a).isSame(dayjs(b), 'day');
  const inCurrentMonth = (d: Date) => dayjs(d).isSame(dayjs(anchorDate), 'month');
  const isToday = (d: Date) => dayjs(d).isSame(dayjs(), 'day');

  const year = dayjs(anchorDate).year();
  const month = dayjs(anchorDate).month() + 1;

  const weekLabels = weekStartsOn === 1 ? ['一','二','三','四','五','六','日'] : ['日','一','二','三','四','五','六'];

  return (
    <ThemedView style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => onChangeMonth(-1)} style={[styles.navBtn, { borderColor: theme === 'dark' ? '#2a2f34' : '#e5e7eb' }]}
          android_ripple={{ color: palette.tint + '55' }}>
          <ThemedText>{'‹'}</ThemedText>
        </Pressable>
        <ThemedText type="title">{year} / {month}</ThemedText>
        <Pressable onPress={() => onChangeMonth(1)} style={[styles.navBtn, { borderColor: theme === 'dark' ? '#2a2f34' : '#e5e7eb' }]}
          android_ripple={{ color: palette.tint + '55' }}>
          <ThemedText>{'›'}</ThemedText>
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {weekLabels.map((w) => (
          <View key={w} style={styles.weekCell}><ThemedText>{w}</ThemedText></View>
        ))}
      </View>

      <View style={styles.grid}>
        {grid.map((d) => {
          const dayNum = dayjs(d).date();
          const lunar = solarlunar.solar2lunar(dayjs(d).year(), dayjs(d).month() + 1, dayNum).dayCn;
          const selected = isSameDay(d, selectedDate);
          const current = inCurrentMonth(d);
          const today = isToday(d);
          const hasEvents = hasEventMap.has(dayjs(d).format('YYYY-MM-DD'));
          const count = monthOccs.filter((o) => dayjs(o.start).isSame(d, 'day')).length;
          const weekStr = ['周日','周一','周二','周三','周四','周五','周六'][dayjs(d).day()];
          return (
            <Pressable
              key={d.toISOString()}
              onPress={() => {
                const text = `${dayjs(d).year()}年${dayjs(d).month() + 1}月${dayNum}日，${weekStr}，${count > 0 ? `${count}项日程` : '暂无日程'}`;
                Speech.speak(text, { language: 'zh-CN' });
                onSelectDate(d);
              }}
              style={[
                styles.cell,
                { borderColor: theme === 'dark' ? '#2a2f34' : '#e5e7eb', backgroundColor: 'rgba(254,252,243,0.6)' },
                selected && { backgroundColor: palette.tint + '22', borderColor: palette.tint },
              ]}
              android_ripple={{ color: palette.tint + '55' }}
            >
              <ThemedText style={[styles.dayText, !current && { opacity: 0.5 }]}>{dayNum}</ThemedText>
              {showLunar && (
                <ThemedText style={[styles.lunarText, !current && { opacity: 0.4 }]}>{lunar}</ThemedText>
              )}
              {hasEvents ? (
                <View style={[styles.eventDot, { backgroundColor: palette.tint }]} />
              ) : today && !selected ? (
                <View style={[styles.todayDot, { backgroundColor: palette.tint }]} />
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </ThemedView>
  );
}

export default memo(MonthViewBase);

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  navBtn: { paddingHorizontal: 12, paddingVertical: 6, borderWidth: 2, borderRadius: 8 },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekCell: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.2857%', paddingVertical: 10, borderWidth: 2, borderRadius: 10, alignItems: 'center', marginBottom: 6 },
  dayText: { fontSize: 16, fontWeight: '700', fontFamily: Fonts.mono },
  lunarText: { fontSize: 12, opacity: 0.7 },
  todayDot: { width: 6, height: 6, borderRadius: 3, marginTop: 4 },
  eventDot: { width: 6, height: 6, borderRadius: 3, marginTop: 4 },
});