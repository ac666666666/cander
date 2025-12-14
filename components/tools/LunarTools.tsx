import { memo } from 'react';
import { View, StyleSheet, Switch } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import solarlunar from 'solarlunar';
import dayjs from 'dayjs';

type Props = {
  date: Date;
  showLunar: boolean;
  onToggle: (v: boolean) => void;
};

function LunarToolsBase({ date, showLunar, onToggle }: Props) {
  const d = dayjs(date);
  const info = solarlunar.solar2lunar(d.year(), d.month() + 1, d.date());

  return (
    <View style={{ gap: 12 }}>
      <View style={styles.row}>
        <ThemedText>显示农历</ThemedText>
        <Switch value={showLunar} onValueChange={onToggle} />
      </View>
      <View style={styles.box}>
        <ThemedText type="subtitle">当日农历</ThemedText>
        <ThemedText>{`${info.yearCn}年 ${info.monthCn}${info.dayCn}`}</ThemedText>
        {!!info.festival && <ThemedText>节日：{info.festival}</ThemedText>}
        {!!info.term && <ThemedText>节气：{info.term}</ThemedText>}
      </View>
    </View>
  );
}

export default memo(LunarToolsBase);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  box: { gap: 6, padding: 10, borderWidth: 1, borderColor: '#eee', borderRadius: 8 },
});