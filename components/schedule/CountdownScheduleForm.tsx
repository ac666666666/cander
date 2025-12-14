import { View, StyleSheet, TextInput } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

type FormState = {
  title: string;
  targetDateStr: string; // YYYY/MM/DD
  alarmMinutes?: number;
};

type Props = {
  form: FormState;
  setForm: (updater: (f: FormState) => FormState) => void;
};

export default function CountdownScheduleForm({ form, setForm }: Props) {
  return (
    <ThemedView style={{ gap: 12 }}>
      <ThemedText type="subtitle">倒数日</ThemedText>
      <TextInput
        placeholder="目标事件"
        value={form.title}
        onChangeText={(t) => setForm((f) => ({ ...f, title: t }))}
        style={styles.input}
      />
      <TextInput
        placeholder="目标日期（YYYY/MM/DD）"
        value={form.targetDateStr}
        onChangeText={(t) => setForm((f) => ({ ...f, targetDateStr: t }))}
        style={styles.input}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <ThemedText>提前提醒（分钟）</ThemedText>
        <TextInput
          value={String(form.alarmMinutes ?? 0)}
          onChangeText={(t) => setForm((f) => ({ ...f, alarmMinutes: Number(t) || 0 }))}
          keyboardType="numeric"
          style={[styles.input, { width: 120 }]}
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
});