import { View, StyleSheet, ScrollView } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import SafeAreaThemedView from '@/components/safe-area-view';
import { useChecklistStore, Priority } from '@/hooks/useChecklist';
import { useAppThemeStore } from '@/hooks/use-app-theme';
import { Colors } from '@/constants/theme';
import dayjs from 'dayjs';

export default function StatsPage() {
  const theme = useAppThemeStore((s) => s.theme);
  const palette = Colors[theme ?? 'light'];
  const items = useChecklistStore((s) => s.items);

  const total = items.length;
  const done = items.filter((i) => i.done).length;
  const pending = total - done;
  const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

  // Risk Analysis
  const now = dayjs();
  let highRiskCount = 0;
  let overdueCount = 0;

  items.forEach(item => {
    if (!item.done) {
      if (item.priority === 'high') highRiskCount++;
      if (item.deadline && dayjs(item.deadline).isBefore(now)) overdueCount++;
    }
  });

  let riskLevel = '低';
  let riskColor = '#10b981'; // green
  if (overdueCount > 0 || highRiskCount > 2) {
    riskLevel = '高';
    riskColor = '#ef4444'; // red
  } else if (highRiskCount > 0) {
    riskLevel = '中';
    riskColor = '#f59e0b'; // amber
  }

  // Summary
  let summary = '开始你的一天吧！';
  if (total > 0) {
    if (completionRate === 100) summary = '太棒了！所有任务已完成！';
    else if (completionRate >= 80) summary = '表现优秀，继续保持！';
    else if (completionRate >= 50) summary = '进度不错，加油完成剩余任务。';
    else if (overdueCount > 0) summary = '注意！你有逾期任务需要立即处理。';
    else summary = '任务较多，建议优先处理高优先级事项。';
  }

  const StatCard = ({ title, value, sub, color }: { title: string, value: string | number, sub?: string, color?: string }) => (
    <View style={[styles.card, { backgroundColor: theme === 'dark' ? '#1f2937' : '#fff', borderColor: theme === 'dark' ? '#374151' : '#e5e7eb' }]}>
      <ThemedText style={{ fontSize: 14, color: '#9ca3af', marginBottom: 4 }}>{title}</ThemedText>
      <ThemedText type="title" style={{ color: color || (theme === 'dark' ? '#fff' : '#000') }}>{value}</ThemedText>
      {sub && <ThemedText style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>{sub}</ThemedText>}
    </View>
  );

  return (
    <SafeAreaThemedView style={styles.container}>
      <ThemedText type="title" style={{ marginBottom: 16 }}>清单统计</ThemedText>
      
      <ScrollView contentContainerStyle={{ gap: 16 }}>
        {/* Summary Section */}
        <View style={[styles.summaryCard, { backgroundColor: palette.tint + '15', borderColor: palette.tint }]}>
          <ThemedText type="subtitle" style={{ color: palette.tint, marginBottom: 8 }}>总结评估</ThemedText>
          <ThemedText style={{ lineHeight: 22 }}>{summary}</ThemedText>
        </View>

        {/* Main Stats Grid */}
        <View style={styles.grid}>
          <View style={{ flex: 1 }}>
             <StatCard title="完成进度" value={`${completionRate}%`} sub={`已完成 ${done}/${total}`} />
          </View>
          <View style={{ flex: 1 }}>
             <StatCard title="风险等级" value={riskLevel} sub={`${overdueCount} 个逾期`} color={riskColor} />
          </View>
        </View>

        {/* Priority Breakdown */}
        <View style={[styles.section, { backgroundColor: theme === 'dark' ? '#1f2937' : '#fff', borderColor: theme === 'dark' ? '#374151' : '#e5e7eb' }]}>
          <ThemedText type="subtitle" style={{ marginBottom: 12 }}>优先级分布 (未完成)</ThemedText>
          {(['high', 'medium', 'low'] as Priority[]).map(p => {
             const count = items.filter(i => !i.done && (i.priority || 'medium') === p).length;
             const color = p === 'high' ? '#ef4444' : p === 'medium' ? '#f59e0b' : '#3b82f6';
             const label = p === 'high' ? '高优先级' : p === 'medium' ? '中优先级' : '低优先级';
             return (
               <View key={p} style={styles.row}>
                 <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                   <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
                   <ThemedText>{label}</ThemedText>
                 </View>
                 <ThemedText>{count}</ThemedText>
               </View>
             );
          })}
        </View>
      </ScrollView>
    </SafeAreaThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  grid: { flexDirection: 'row', gap: 12 },
  card: { padding: 16, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  summaryCard: { padding: 20, borderRadius: 16, borderWidth: 1, marginBottom: 4 },
  section: { padding: 16, borderRadius: 16, borderWidth: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e7eb' }
});
