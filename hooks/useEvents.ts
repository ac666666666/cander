import { DateRange, EventItem, Occurrence, ViewMode } from '@/components/calendar/types';
import { API_URL } from '@/constants/config';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { RRule, RRuleSet } from 'rrule';
import { create } from 'zustand';
import { useChecklistStore } from './useChecklist';


dayjs.extend(utc);
dayjs.extend(timezone);

type EventsState = {
  events: EventItem[];
  fetchEvents: () => Promise<void>;
  addEvent: (e: EventItem) => Promise<void>;
  updateEvent: (id: string, patch: Partial<EventItem>) => Promise<void>;
  removeEvent: (id: string) => Promise<void>;
};

export const useEventsStore = create<EventsState>((set, get) => ({
  events: [],
  
  fetchEvents: async () => {
    try {
      const res = await fetch(`${API_URL}/events`);
      if (res.ok) {
        const data = await res.json();
        set({ events: data });
      }
    } catch (e) {
      console.error('Failed to fetch events', e);
    }
  },

  addEvent: async (e) => {
    // 乐观更新
    set((s) => ({ events: [...s.events, e] }));
    try {
      await fetch(`${API_URL}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(e),
      });
    } catch (err) {
      console.error('Failed to add event', err);
      // 回滚
      set((s) => ({ events: s.events.filter(ev => ev.id !== e.id) }));
    }
  },

  updateEvent: async (id, patch) => {
    const oldEvents = get().events;
    // 乐观更新
    set((s) => ({ events: s.events.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
    
    try {
      const newEvent = get().events.find(e => e.id === id);
      if (newEvent) {
        await fetch(`${API_URL}/events/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newEvent),
        });
      }
    } catch (err) {
      console.error('Failed to update event', err);
      // 回滚
      set({ events: oldEvents });
    }
  },

  removeEvent: async (id) => {
    const oldEvents = get().events;
    // 乐观更新
    set((s) => ({ events: s.events.filter((e) => e.id !== id) }));
    try {
      await fetch(`${API_URL}/events/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to delete event', err);
      // 回滚
      set({ events: oldEvents });
    }
  },
}));

// 计算视图范围（anchorDate 是当前“视图基准”日期，比如选中的月份/周）
export function getViewRange(view: ViewMode, anchorDate: Date, weekStartsOn: 0 | 1 = 1): DateRange {
  const d = dayjs(anchorDate);
  if (view === 'day') {
    const start = d.startOf('day').toDate();
    const end = d.endOf('day').toDate();
    return { start, end };
  }

  if (view === 'week') {
    const weekStart = weekStartsOn === 1 ? d.startOf('week') : d.startOf('week').add(-1, 'day');
    const start = weekStart.startOf('day').toDate();
    const end = weekStart.add(6, 'day').endOf('day').toDate();
    return { start, end };
  }

  // month: 展开为 6 行 * 7 列的完整网格范围（包括月前后补齐）
  const monthStart = d.startOf('month');
  const gridStart = (weekStartsOn === 1 ? monthStart.startOf('week') : monthStart.startOf('week').add(-1, 'day'));
  const start = gridStart.startOf('day').toDate();
  const end = gridStart.add(6 * 7 - 1, 'day').endOf('day').toDate();
  return { start, end };
}

// 将单个事件在给定范围内展开成 occurrences
export function expandEventInRange(event: EventItem, range: DateRange): Occurrence[] {
  const tz = event.timezone ?? dayjs.tz.guess();

  const startUtc = dayjs(event.start);
  const endUtc = dayjs(event.end);
  const durationMs = endUtc.valueOf() - startUtc.valueOf();

  // 处理 RRULE/EXDATE
  const set = new RRuleSet();
  if (event.recurrence?.rrule) {
    set.rrule(RRule.fromString(event.recurrence.rrule));
  } else {
    // 非重复事件作为单次 rrule（在 between 时也能统一处理）
    set.rdate(startUtc.toDate());
  }

  if (event.recurrence?.exdates?.length) {
    for (const iso of event.recurrence.exdates) {
      const ex = dayjs(iso).toDate();
      set.exdate(ex);
    }
  }

  // 展开在范围内的所有开始时间
  const dts = set.between(range.start, range.end, true);

  return dts.map((dt) => {
    const startLocal = dayjs(dt).tz(tz); // 用事件时区解释开始时间
    const endLocal = startLocal.add(durationMs, 'millisecond');

    return {
      eventId: event.id,
      title: event.title,
      start: startLocal.toDate(),
      end: endLocal.toDate(),
      allDay: event.allDay,
      source: event,
    };
  });
}

// 获取指定视图范围内的所有 occurrences
export function useOccurrences(view: ViewMode, anchorDate: Date, weekStartsOn: 0 | 1 = 1) {
  const { events } = useEventsStore();
  const checklistItems = useChecklistStore((s) => s.items);
  const range = getViewRange(view, anchorDate, weekStartsOn);

  const list: Occurrence[] = [];
  for (const e of events) {
    const occ = expandEventInRange(e, range);
    list.push(...occ);
  }

  // Merge checklist items with deadline
  for (const item of checklistItems) {
    if (item.deadline && !item.done) {
      const d = dayjs(item.deadline);
      // Simple check if within range
      if ((d.isSame(range.start) || d.isAfter(range.start)) && d.isBefore(range.end)) {
         const syntheticEvent: EventItem = {
          id: `checklist_${item.id}`,
          title: `[待办] ${item.title}`,
          start: item.deadline,
          end: item.deadline,
          allDay: true, 
        };
        list.push({
          eventId: syntheticEvent.id,
          title: syntheticEvent.title,
          start: d.toDate(),
          end: d.toDate(),
          allDay: true,
          source: syntheticEvent,
        });
      }
    }
  }

  // 可以根据需要排序，如按开始时间
  return list.sort((a, b) => a.start.getTime() - b.start.getTime());
}