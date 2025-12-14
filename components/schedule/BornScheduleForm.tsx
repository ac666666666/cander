import { View, StyleSheet, TextInput } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

type FormState = {
  title: string;
  dateStr: string; // YYYY/MM/DD
  alarmMinutes?: number;
};

type Props = {
  form: FormState;
  setForm: (updater: (f: FormState) => FormState) => void;
};

export default function BornScheduleForm({ form, setForm }: Props) {
  return (
    <ThemedView style={{ gap: 12 }}>
      <ThemedText type="subtitle">生日</ThemedText>
      <TextInput
        placeholder="姓名/标题"
        value={form.title}
        onChangeText={(t) => setForm((f) => ({ ...f, title: t }))}
        style={styles.input}
      />
      <TextInput
        placeholder="出生日期（YYYY/MM/DD）"
        value={form.dateStr}
        onChangeText={(t) => setForm((f) => ({ ...f, dateStr: t }))}
        style={styles.input}
      />
      <View style={styles.rowBetween}>
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
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});