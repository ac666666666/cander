import { memo } from 'react';
import * as Speech from 'expo-speech';
import { View, StyleSheet, Pressable } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import dayjs from 'dayjs';
import { useOccurrences } from '@/hooks/useEvents';
import { EventItem } from './types';
import { useAppThemeStore } from '@/hooks/use-app-theme';

type Props = { date?: Date; onOpenEvent?: (e: EventItem) => void };

function EventListBase({ date, onOpenEvent }: Props) {
  const theme = useAppThemeStore((s) => s.theme);
  const d = date ?? new Date();
  const occs = useOccurrences('day', d);
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="subtitle">当日日程</ThemedText>
      <View style={{ marginTop: 8, gap: 8 }}>
        {occs.length === 0 ? (
          <ThemedText>暂无安排</ThemedText>
        ) : (
          occs.map((o) => (
            <Pressable
              key={`${o.eventId}-${o.start.toISOString()}`}
              style={[
                styles.item,
                { borderColor: theme === 'dark' ? '#2a2f34' : '#e5e7eb', backgroundColor: 'rgba(254,252,243,0.6)' },
              ]}
              onPress={() => {
                const text = `${o.title}，${dayjs(o.start).format('HH:mm')} 到 ${dayjs(o.end).format('HH:mm')}`;
                Speech.speak(text, { language: 'zh-CN' });
                onOpenEvent?.(o.source);
              }}
            >
              <ThemedText style={{ fontWeight: '700' }}>{o.title}</ThemedText>
              <ThemedText style={{ fontWeight: '600' }}>{dayjs(o.start).format('HH:mm')} - {dayjs(o.end).format('HH:mm')}</ThemedText>
            </Pressable>
          ))
        )}
      </View>
    </ThemedView>
  );
}

export default memo(EventListBase);

const styles = StyleSheet.create({
  container: { gap: 6 },
  item: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, borderWidth: 2 },
});