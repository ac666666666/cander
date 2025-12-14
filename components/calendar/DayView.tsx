import { memo } from 'react';
import * as Speech from 'expo-speech';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { View, StyleSheet, Pressable } from 'react-native';
import dayjs from 'dayjs';
import { useOccurrences } from '@/hooks/useEvents';
import { Fonts } from '@/constants/theme';
import { useAppThemeStore } from '@/hooks/use-app-theme';

type Props = {
  date: Date;
};

function DayViewBase({ date }: Props) {
  const theme = useAppThemeStore((s) => s.theme);
  const occs = useOccurrences('day', date);
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">{dayjs(date).format('YYYY/MM/DD')}</ThemedText>
      <View style={styles.list}>
        {occs.length === 0 ? (
          <ThemedText>今日暂无日程</ThemedText>
        ) : (
          occs.map((o) => (
            <Pressable
              key={`${o.eventId}-${o.start.toISOString()}`}
              style={[styles.item, { borderColor: theme === 'dark' ? '#2a2f34' : '#e5e7eb', backgroundColor: 'rgba(254,252,243,0.6)' }]}
              onPress={() => {
                const text = `${o.title}，${dayjs(o.start).format('HH:mm')} 到 ${dayjs(o.end).format('HH:mm')}`;
                Speech.speak(text, { language: 'zh-CN' });
              }}
              android_ripple={{ color: '#00000022' }}
            >
              <ThemedText type="subtitle" style={{ fontWeight: '700' }}>{o.title}</ThemedText>
              <ThemedText style={{ fontFamily: Fonts.mono, fontWeight: '600' }}>
                {dayjs(o.start).format('HH:mm')} - {dayjs(o.end).format('HH:mm')}
              </ThemedText>
            </Pressable>
          ))
        )}
      </View>
    </ThemedView>
  );
}

export default memo(DayViewBase);

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { marginTop: 8, gap: 8 },
  item: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, borderWidth: 2 },
});