import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Pressable, FlatList, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import dayjs from 'dayjs';
import { ThemedText } from '@/components/themed-text';

type Props = {
  initialDate: Date;
  onJump: (date: Date) => void;
  onCancel?: () => void;
};

const ROW_HEIGHT = 40;
const VISIBLE_ROWS = 5; // 显示 5 行，中间为选中

function Wheel({ data, value, onChange }: { data: number[]; value: number; onChange: (v: number) => void }) {
  const listRef = useRef<FlatList<number>>(null);
  const initialIndex = Math.max(0, data.indexOf(value));

  useEffect(() => {
    // 同步滚动到选中项
    const idx = data.indexOf(value);
    if (idx >= 0) listRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.5 });
  }, [value, data]);

  const onEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const idx = Math.round(y / ROW_HEIGHT);
    const v = data[Math.max(0, Math.min(data.length - 1, idx))];
    onChange(v);
  };

  return (
    <View style={styles.wheelBox}>
      <FlatList
        ref={listRef}
        data={data}
        keyExtractor={(item) => String(item)}
        renderItem={({ item }) => (
          <View style={[styles.wheelRow, { height: ROW_HEIGHT }]}> 
            <ThemedText>{item}</ThemedText>
          </View>
        )}
        initialScrollIndex={initialIndex}
        getItemLayout={(_data, index) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index })}
        showsVerticalScrollIndicator={false}
        snapToInterval={ROW_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={onEnd}
        onScrollEndDrag={onEnd}
      />
      <View pointerEvents="none" style={[styles.selector, { height: ROW_HEIGHT }]} />
    </View>
  );
}

function DateJumpBase({ initialDate, onJump, onCancel }: Props) {
  const init = dayjs(initialDate);
  const [y, setY] = useState(init.year());
  const [m, setM] = useState(init.month() + 1);
  const [d, setD] = useState(init.date());

  const years = useMemo(() => {
    // 提供较宽范围：1970 - 2099
    const arr: number[] = [];
    for (let i = 1970; i <= 2099; i++) arr.push(i);
    return arr;
  }, []);
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);
  const days = useMemo(() => {
    const daysInMonth = dayjs().year(y).month(m - 1).daysInMonth();
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [y, m]);

  useEffect(() => {
    if (d > days.length) setD(days.length);
  }, [days.length]);

  const picked = useMemo(() => dayjs().year(y).month(m - 1).date(d).startOf('day'), [y, m, d]);

  return (
    <View style={{ gap: 12 }}>
      <View style={{ alignItems: 'center' }}>
        <ThemedText>{picked.format('YYYY年MM月DD日 dddd')}</ThemedText>
      </View>

      <View style={styles.wheelsRow}>
        <Wheel data={years} value={y} onChange={setY} />
        <Wheel data={months} value={m} onChange={setM} />
        <Wheel data={days} value={d} onChange={setD} />
      </View>

      <View style={styles.actionsRow}>
        <Pressable onPress={() => onCancel?.()} style={styles.actionBtn}>
          <ThemedText>取消</ThemedText>
        </Pressable>
        <Pressable onPress={() => onJump(picked.toDate())} style={[styles.actionBtn, styles.primary]}>
          <ThemedText style={{ color: '#fff' }}>确定</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

export default memo(DateJumpBase);

const styles = StyleSheet.create({
  wheelsRow: { flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  wheelBox: { flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, overflow: 'hidden' },
  wheelRow: { alignItems: 'center', justifyContent: 'center' },
  selector: { position: 'absolute', left: 0, right: 0, top: '50%', marginTop: -(ROW_HEIGHT / 2), borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#60a5fa' },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  actionBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderWidth: 1, borderColor: '#ddd', borderRadius: 12 },
  primary: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
});