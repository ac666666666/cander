export type ViewMode = 'month' | 'week' | 'day';

export type Alarm = {
  offsetMinutes: number; // 相对开始时间的提醒偏移
};

export type Recurrence = {
  rrule?: string; // RFC 5545 RRULE 字符串，如 "FREQ=WEEKLY;BYDAY=MO,WE,FR"
  exdates?: string[]; // ISO 日期字符串数组，如 "2025-11-12T00:00:00.000Z"
};

export type EventItem = {
  id: string;
  title: string;
  description?: string;
  location?: string;

  // 时间
  start: string; // ISO 字符串（内部用 UTC 存储较稳妥）
  end: string;   // ISO 字符串
  timezone?: string; // IANA 时区名称，如 "Asia/Shanghai"

  allDay?: boolean;
  recurrence?: Recurrence;
  alarms?: Alarm[];
  calendarId?: string;
  notificationIds?: string[];
};

export type Occurrence = {
  eventId: string;
  title: string;

  start: Date;
  end: Date;

  allDay?: boolean;
  source: EventItem; // 指向原事件
};

export type DateRange = {
  start: Date;
  end: Date;
};
