import { View, StyleSheet, TextInput, Pressable, ScrollView } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import SafeAreaThemedView from '@/components/safe-area-view';
import { Colors, Fonts } from '@/constants/theme';
import { useAppThemeStore } from '@/hooks/use-app-theme';
import { useChecklistStore, Quadrant } from '@/hooks/useChecklist';

const META: Record<Quadrant, { title: string; color: string } > = {
  I: { title: 'I 重要且紧急', color: '#fca5a5' },
  II: { title: 'II 重要不紧急', color: '#fcd34d' },
  III: { title: 'III 不重要紧急', color: '#93c5fd' },
  IV: { title: 'IV 不重要不紧急', color: '#86efac' },
};

export default function QuadrantsPage() {
  const theme = useAppThemeStore((s) => s.theme);
  const palette = Colors[theme ?? 'light'];
  const itemsByQuadrant = useChecklistStore((s) => s.itemsByQuadrant);
  const addItemWithQuadrant = useChecklistStore((s) => s.addItemWithQuadrant);
  const toggleDone = useChecklistStore((s) => s.toggleDone);
  const removeItem = useChecklistStore((s) => s.removeItem);

  return (
    <SafeAreaThemedView style={styles.container}>
      <ThemedText type="subtitle" style={{ fontSize: 20 }}>四象限</ThemedText>
      <View style={styles.grid}>
        {(Object.keys(META) as Quadrant[]).map((q) => (
          <QuadrantPanel
            key={q}
            quadrant={q}
            theme={theme ?? 'light'}
            items={itemsByQuadrant(q)}
            onAdd={(t) => addItemWithQuadrant(t, q)}
            onToggle={(id) => toggleDone(id)}
            onRemove={(id) => removeItem(id)}
          />
        ))}
      </View>
    </SafeAreaThemedView>
  );
}

function QuadrantPanel({ quadrant, theme, items, onAdd, onToggle, onRemove }: { quadrant: Quadrant; theme: 'light' | 'warm' | 'dark'; items: ReturnType<typeof useChecklistStore>['items']; onAdd: (title: string) => void; onToggle: (id: string) => void; onRemove: (id: string) => void; }) {
  const [title, setTitle] = useState('');
  const meta = META[quadrant];
  return (
    <View style={[styles.cell, { borderColor: theme === 'dark' ? '#2a2f34' : '#e5e7eb' }]}> 
      <View style={[styles.cellHeader, { backgroundColor: meta.color + '66' }]}> 
        <ThemedText style={{ fontFamily: Fonts.mono, fontSize: 14 }}>{meta.title}</ThemedText>
        <Pressable style={styles.plusBtn} onPress={() => { const t = title.trim(); if (!t) return; onAdd(t); setTitle(''); }}>
          <ThemedText style={{ fontSize: 16 }}>＋</ThemedText>
        </Pressable>
      </View>
      <View style={[styles.addRow, { borderColor: theme === 'dark' ? '#2a2f34' : '#e5e7eb' }]}> 
        <TextInput value={title} onChangeText={setTitle} placeholder="添加代办..." style={styles.input} />
        <Pressable style={styles.addBtn} onPress={() => { const t = title.trim(); if (!t) return; onAdd(t); setTitle(''); }}>
          <ThemedText style={{ fontSize: 14 }}>添加</ThemedText>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ gap: 8 }}>
        {items.length === 0 && <ThemedText style={{ opacity: 0.7 }}>暂无代办</ThemedText>}
        {items.map((it) => (
          <View key={it.id} style={[styles.itemRow, { borderColor: theme === 'dark' ? '#2a2f34' : '#e5e7eb' }]}> 
            <Pressable style={[styles.checkbox, { borderColor: it.done ? meta.color : '#ccc', backgroundColor: it.done ? meta.color : 'transparent' }]} onPress={() => onToggle(it.id)} />
            <ThemedText style={[styles.itemTitle, it.done && { textDecorationLine: 'line-through', opacity: 0.6 }]}>{it.title}</ThemedText>
            <Pressable style={styles.smallBtn} onPress={() => onRemove(it.id)}>
              <ThemedText style={{ fontSize: 14 }}>删除</ThemedText>
              </Pressable>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

import { useState } from 'react';

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 10 },
  grid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: { width: '48%', borderWidth: 1, borderRadius: 12, padding: 10, gap: 6 },
  cellHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8 },
  plusBtn: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6 },
  input: { flex: 1, paddingVertical: 0 },
  addBtn: { paddingVertical: 4, paddingHorizontal: 8, borderWidth: 1, borderRadius: 8 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, borderWidth: 1, borderRadius: 10 },
  checkbox: { width: 16, height: 16, borderWidth: 1, borderRadius: 4 },
  itemTitle: { flex: 1, fontSize: 14 },
});
