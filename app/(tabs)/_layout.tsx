import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useAppThemeStore } from '@/hooks/use-app-theme';
import { useEventsStore } from '@/hooks/useEvents';
import { expandEventInRange } from '@/hooks/useEvents';
import dayjs from 'dayjs';
import HomeIcon from '@/assets/images/home.svg';
import MyIcon from '@/assets/images/my.svg';
import CalendarIcon from '@/assets/images/candler.svg';
import CourseIcon from '@/assets/images/Course.svg';
import * as Speech from 'expo-speech';

export default function TabLayout() {
  const appTheme = useAppThemeStore((s) => s.theme);
  const events = useEventsStore((s) => s.events);
  const [reminderCount, setReminderCount] = React.useState(0);

  React.useEffect(() => {
    const compute = () => {
      const now = dayjs();
      const end = now.add(1, 'hour').toDate();
      let cnt = 0;
      for (const e of events) {
        if (!e.alarms || e.alarms.length === 0) continue;
        const offset = e.alarms[0].offsetMinutes ?? 0;
        const occs = expandEventInRange(e, { start: now.toDate(), end });
        for (const o of occs) {
          const t = dayjs(o.start).subtract(offset, 'minute');
          if (t.isAfter(now) && t.isBefore(end)) {
            cnt++;
          }
        }
      }
      setReminderCount(cnt);
    };
    compute();
    const id = setInterval(compute, 60000);
    return () => clearInterval(id);
  }, [events]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[appTheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '首页',
          tabBarAccessibilityLabel: '首页',
          tabBarIcon: ({ color }) => <HomeIcon width={24} height={24} />,
        }}
        listeners={() => ({
          tabPress: () => Speech.speak('切换到首页', { language: 'zh-CN' }),
        })}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: '日历',
          tabBarAccessibilityLabel: '日历',
          tabBarIcon: () => <CalendarIcon width={24} height={24} />,
          tabBarBadge: reminderCount > 0 ? String(reminderCount) : undefined,
        }}
        listeners={() => ({
          tabPress: () => Speech.speak('切换到日历', { language: 'zh-CN' }),
        })}
      />
      <Tabs.Screen
        name="course"
        options={{
          title: 'AI小历',
          tabBarAccessibilityLabel: 'AI小历',
          tabBarIcon: () => <CourseIcon width={24} height={24} />,
        }}
        listeners={() => ({
          tabPress: () => Speech.speak('切换到AI小历', { language: 'zh-CN' }),
        })}
      />
      <Tabs.Screen
        name="my"
        options={{
          title: '我的',
          tabBarAccessibilityLabel: '我的',
          tabBarIcon: () => <MyIcon width={24} height={24} />,
        }}
        listeners={() => ({
          tabPress: () => Speech.speak('切换到我的', { language: 'zh-CN' }),
        })}
      />
    </Tabs>
  );
}
