import { memo, useMemo, useState } from 'react';
import { View, StyleSheet, TextInput, ScrollView, Pressable } from 'react-native';
import dayjs from 'dayjs';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useAppThemeStore } from '@/hooks/use-app-theme';
import { useEventsStore, expandEventInRange } from '@/hooks/useEvents';
import { EventItem, Occurrence } from '@/components/calendar/types';
import SearchIcon from '@/assets/images/search.svg';

type Props = {
  onOpenEvent: (e: EventItem) => void;
};

function SearchScheduleBase({ onOpenEvent }: Props) {
  const appTheme = useAppThemeStore((s) => s.theme) ?? 'light';
  const palette = Colors[appTheme];
  const { events } = useEventsStore();
  const [q, setQ] = useState('');

  // 展开未来 12 个月和过去 1 个月的 occurrences，供搜索
  const occurrences = useMemo(() => {
    const start = dayjs().add(-1, 'month').startOf('month').toDate();
    const end = dayjs().add(12, 'month').endOf('month').toDate();
    let list: Occurrence[] = [];
    for (const e of events) {
      list = list.concat(expandEventInRange(e, { start, end }));
    }
    // 按开始时间排序
    list.sort((a, b) => a.start.getTime() - b.start.getTime());
    return list;
  }, [events]);

  const filtered = useMemo(() => {
    if (!q.trim()) return occurrences;
    const kw = q.trim().toLowerCase();
    return occurrences.filter((o) => (o.title ?? '').toLowerCase().includes(kw));
  }, [q, occurrences]);

  // 分组显示（按月份）
  const groups = useMemo(() => {
    const m = new Map<string, Occurrence[]>();
    for (const o of filtered) {
      const key = dayjs(o.start).format('YYYY年M月');
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(o);
    }
    return Array.from(m.entries());
  }, [filtered]);

  return (
    <View style={{ gap: 12 }}>
      <View
        style={[
          styles.searchContainer,
          { borderColor: appTheme === 'dark' ? '#2a2f34' : '#e5e7eb' },
        ]}
      >
        <SearchIcon width={18} height={18} />
        <TextInput
          placeholder="搜索日程"
          value={q}
          onChangeText={setQ}
          style={styles.searchInput}
        />
      </View>

      <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 12 }}>
        {groups.map(([month, list]) => (
          <View key={month} style={styles.section}>
            <ThemedText type="subtitle">{month}</ThemedText>
            {list.map((o, idx) => (
              <Pressable
                key={o.eventId + idx}
                style={[styles.item, { borderColor: appTheme === 'dark' ? '#2a2f34' : '#e5e7eb' }]}
                onPress={() => onOpenEvent(o.source)}
              >
                <View style={{ flex: 1 }}>
                  <ThemedText style={{ fontWeight: '600' }}>{o.title}</ThemedText>
                  <ThemedText style={{ opacity: 0.7 }}>
                    {dayjs(o.start).format('MM-DD ddd')} · {o.allDay ? '全天' : `${dayjs(o.start).format('HH:mm')} - ${dayjs(o.end).format('HH:mm')}`}
                  </ThemedText>
                </View>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: palette.tint }} />
              </Pressable>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

export default memo(SearchScheduleBase);

const styles = StyleSheet.create({
  searchContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  searchInput: { flex: 1, paddingVertical: 0 },
  section: { gap: 8 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderWidth: 1, borderRadius: 12 },
});