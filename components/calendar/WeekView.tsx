import { memo } from 'react';
import * as Speech from 'expo-speech';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { View, StyleSheet, Pressable } from 'react-native';
import dayjs from 'dayjs';
import { useOccurrences } from '@/hooks/useEvents';
import { Colors, Fonts } from '@/constants/theme';
import { useAppThemeStore } from '@/hooks/use-app-theme';

type Props = {
  anchorDate: Date;
  onSelectDate: (d: Date) => void;
  onChangeWeek: (delta: number) => void;
  weekStartsOn?: 0 | 1;
};

function WeekViewBase({ anchorDate, onSelectDate, onChangeWeek, weekStartsOn = 0 }: Props) {
  const theme = useAppThemeStore((s) => s.theme);
  const palette = Colors[theme];
  const startOfWeek = weekStartsOn === 1 ? dayjs(anchorDate).startOf('week') : dayjs(anchorDate).startOf('week').add(-1, 'day');
  const days = Array.from({ length: 7 }, (_, i) => startOfWeek.add(i, 'day').toDate());
  const occs = useOccurrences('week', anchorDate, weekStartsOn);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => onChangeWeek(-1)} style={[styles.navBtn, { borderColor: theme === 'dark' ? '#2a2f34' : '#e5e7eb' }]}
          android_ripple={{ color: palette.tint + '55' }}>
          <ThemedText>{'‹'}</ThemedText>
        </Pressable>
        <ThemedText type="title">
          {dayjs(days[0]).format('YYYY/MM/DD')} - {dayjs(days[6]).format('MM/DD')}
        </ThemedText>
        <Pressable onPress={() => onChangeWeek(1)} style={[styles.navBtn, { borderColor: theme === 'dark' ? '#2a2f34' : '#e5e7eb' }]}
          android_ripple={{ color: palette.tint + '55' }}>
          <ThemedText>{'›'}</ThemedText>
        </Pressable>
      </View>

      <View style={styles.verticalList}>
        {days.map((d) => (
          <Pressable
            key={d.toISOString()}
            onPress={() => {
              const count = occs.filter((o) => dayjs(o.start).isSame(d, 'day')).length;
              const weekStr = ['周日','周一','周二','周三','周四','周五','周六'][dayjs(d).day()];
              const text = `${dayjs(d).year()}年${dayjs(d).month() + 1}月${dayjs(d).date()}日，${weekStr}，${count > 0 ? `${count}项日程` : '暂无日程'}`;
              Speech.speak(text, { language: 'zh-CN' });
              onSelectDate(d);
            }}
            style={[
              styles.dayRow,
              { borderColor: theme === 'dark' ? '#2a2f34' : '#e5e7eb', backgroundColor: 'rgba(254,252,243,0.6)' },
            ]}
            android_ripple={{ color: palette.tint + '22' }}
          >
            <View style={styles.dayLeft}>
              <ThemedText style={styles.dayBig}>{dayjs(d).format('DD')}</ThemedText>
              <ThemedText style={styles.dayWeek}>{dayjs(d).format('ddd')}</ThemedText>
            </View>
            <View style={[styles.countBadge, { borderColor: palette.tint }]}> 
              <ThemedText style={styles.countText}>
                {occs.filter((o) => dayjs(o.start).isSame(d, 'day')).length} 项
              </ThemedText>
            </View>
          </Pressable>
        ))}
      </View>
    </ThemedView>
  );
}

export default memo(WeekViewBase);

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  navBtn: { paddingHorizontal: 12, paddingVertical: 6, borderWidth: 2, borderRadius: 8 },
  verticalList: { gap: 8 },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderRadius: 10,
  },
  dayLeft: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  dayBig: { fontSize: 20, fontWeight: '700', fontFamily: Fonts.mono },
  dayWeek: { opacity: 0.7 },
  countBadge: { borderWidth: 1, borderRadius: 9999, paddingVertical: 4, paddingHorizontal: 10 },
  countText: { fontSize: 12, fontWeight: '600' },
});