import { View, StyleSheet, TextInput, Switch, Pressable } from 'react-native';
import dayjs from 'dayjs';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

type FormState = {
  id?: string;
  title: string;
  allDay: boolean;
  start: Date;
  end: Date;
  alarmMinutes?: number;
};

type Props = {
  form: FormState;
  setForm: (updater: (f: FormState) => FormState) => void;
};

export default function RcScheduleForm({ form, setForm }: Props) {
  return (
    <ThemedView style={{ gap: 10 }}>
      <TextInput
        value={form.title}
        onChangeText={(t) => setForm((f) => ({ ...f, title: t }))}
        placeholder="请输入事件标题"
        style={styles.input}
      />

      <View style={styles.rowBetween}>
        <ThemedText>全天事件</ThemedText>
        <Switch value={form.allDay} onValueChange={(v) => setForm((f) => ({ ...f, allDay: v }))} />
      </View>

      <View style={styles.rowBetween}>
        <ThemedText>开始时间</ThemedText>
        <ThemedText style={{ fontWeight: '600' }}>{dayjs(form.start).format('YYYY/MM/DD HH:mm')}</ThemedText>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
        <Pressable style={styles.smallBtn} onPress={() => setForm((f) => ({ ...f, start: dayjs(f.start).add(30, 'minute').toDate() }))}><ThemedText>+30分</ThemedText></Pressable>
        <Pressable style={styles.smallBtn} onPress={() => setForm((f) => ({ ...f, start: dayjs(f.start).add(1, 'hour').toDate() }))}><ThemedText>+1小时</ThemedText></Pressable>
      </View>

      <View style={styles.rowBetween}>
        <ThemedText>结束时间</ThemedText>
        <ThemedText style={{ fontWeight: '600' }}>{dayjs(form.end).format('YYYY/MM/DD HH:mm')}</ThemedText>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
        <Pressable style={styles.smallBtn} onPress={() => setForm((f) => ({ ...f, end: dayjs(f.end).add(30, 'minute').toDate() }))}><ThemedText>+30分</ThemedText></Pressable>
        <Pressable style={styles.smallBtn} onPress={() => setForm((f) => ({ ...f, end: dayjs(f.end).add(1, 'hour').toDate() }))}><ThemedText>+1小时</ThemedText></Pressable>
      </View>

      <View style={styles.rowBetween}>
        <ThemedText>提醒</ThemedText>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[0, 10, 30, 60].map((m) => (
            <Pressable
              key={m}
              style={[
                styles.smallBtn,
                (form.alarmMinutes ?? 0) === m && { backgroundColor: '#ddd' }
              ]}
              onPress={() => setForm((f) => ({ ...f, alarmMinutes: m }))}
            >
              <ThemedText>{m === 0 ? '无' : `${m}分`}</ThemedText>
            </Pressable>
          ))}
          <TextInput
            value={String(form.alarmMinutes ?? 0)}
            onChangeText={(t) => setForm((f) => ({ ...f, alarmMinutes: Number(t) || 0 }))}
            keyboardType="numeric"
            placeholder="自定义"
            style={[styles.input, { width: 60, textAlign: 'center' }]}
          />
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  smallBtn: { paddingVertical: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: '#ddd', borderRadius: 8 },
});