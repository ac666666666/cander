import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { EventItem } from '@/components/calendar/types';

dayjs.extend(utc);

const formatDate = (dateStr: string) => {
  return dayjs(dateStr).utc().format('YYYYMMDDTHHmmss[Z]');
};

export const generateIcs = (events: EventItem[]) => {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//My Calendar App//CN',
  ];

  for (const event of events) {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${event.id}`);
    lines.push(`DTSTAMP:${formatDate(new Date().toISOString())}`);
    lines.push(`DTSTART:${formatDate(event.start)}`);
    lines.push(`DTEND:${formatDate(event.end)}`);
    lines.push(`SUMMARY:${event.title}`);
    if (event.description) lines.push(`DESCRIPTION:${event.description}`);
    if (event.location) lines.push(`LOCATION:${event.location}`);
    if (event.recurrence?.rrule) {
      lines.push(`RRULE:${event.recurrence.rrule}`);
    }
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
};

export const parseIcs = (icsContent: string): Partial<EventItem>[] => {
  const events: Partial<EventItem>[] = [];
  const lines = icsContent.split(/\r\n|\n|\r/);
  
  let currentEvent: Partial<EventItem> | null = null;

  for (const line of lines) {
    if (line.startsWith('BEGIN:VEVENT')) {
      currentEvent = { id: `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` };
    } else if (line.startsWith('END:VEVENT')) {
      if (currentEvent && currentEvent.title) {
        events.push(currentEvent);
        currentEvent = null;
      }
    } else if (currentEvent) {
      if (line.startsWith('SUMMARY:')) {
        currentEvent.title = line.substring(8);
      } else if (line.startsWith('DTSTART:')) {
        const val = line.substring(8);
        currentEvent.start = parseIcsDate(val);
      } else if (line.startsWith('DTEND:')) {
        const val = line.substring(6);
        currentEvent.end = parseIcsDate(val);
      } else if (line.startsWith('RRULE:')) {
        const val = line.substring(6);
        if (!currentEvent.recurrence) currentEvent.recurrence = {};
        currentEvent.recurrence.rrule = val;
      }
    }
  }
  
  return events;
};

const parseIcsDate = (val: string) => {
  // YYYYMMDDTHHmmssZ
  if (val.length >= 15 && val.includes('T')) {
     const year = val.substring(0, 4);
     const month = val.substring(4, 6);
     const day = val.substring(6, 8);
     const hour = val.substring(9, 11);
     const minute = val.substring(11, 13);
     const second = val.substring(13, 15);
     // If ends with Z, treat as UTC
     if (val.endsWith('Z')) {
        return dayjs.utc(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`).toISOString();
     }
     return dayjs(`${year}-${month}-${day}T${hour}:${minute}:${second}`).toISOString();
  }
  // YYYYMMDD (All day usually)
  if (val.length === 8) {
    return dayjs(`${val.substring(0,4)}-${val.substring(4,6)}-${val.substring(6,8)}`).startOf('day').toISOString();
  }
  return new Date().toISOString();
};
