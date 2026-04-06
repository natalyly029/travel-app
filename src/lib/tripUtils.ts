import { Day, Event } from '@/types';

export const DOCUMENT_CATEGORIES = ['flight', 'hotel', 'booking', 'insurance', 'other'] as const;
export type DocumentCategory = typeof DOCUMENT_CATEGORIES[number];

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  flight: '航空券',
  hotel: '宿泊',
  booking: '予約',
  insurance: '保険',
  other: 'その他',
};

export const QUICK_PAYMENT_CATEGORIES = ['交通', '宿泊', '食事', '観光', 'その他'] as const;

export function formatDayDate(date: string) {
  return new Date(date).toLocaleDateString('ja-JP', {
    month: 'short',
    day: 'numeric',
  });
}

export function isTodayDate(date: string) {
  const today = new Date();
  const target = new Date(`${date}T00:00:00`);
  return target.toDateString() === today.toDateString();
}

export function getPreferredDayId(days: Day[], requestedDayId?: string) {
  if (requestedDayId) {
    const matched = days.find((day) => day.id === requestedDayId);
    if (matched) return matched.id;
  }

  const todayDay = days.find((day) => isTodayDate(day.date));
  return todayDay?.id || days[0]?.id || '';
}

export function sortEventsChronologically(events: Event[]) {
  return [...events].sort((a, b) => {
    const aKey = a.start_time || '99:99';
    const bKey = b.start_time || '99:99';
    if (aKey === bKey) return a.title.localeCompare(b.title);
    return aKey.localeCompare(bKey);
  });
}

export function getEventDate(day: Day | undefined, event: Event) {
  if (!day?.date || !event.start_time) return null;
  return new Date(`${day.date}T${event.start_time}:00`);
}

export function getUpcomingEventId(day: Day | undefined, events: Event[]) {
  if (!day) return '';
  const now = new Date();
  const sorted = sortEventsChronologically(events);
  const upcoming = sorted.find((event) => {
    const eventDate = getEventDate(day, event);
    return eventDate ? eventDate.getTime() >= now.getTime() : false;
  });
  return upcoming?.id || sorted[0]?.id || '';
}

export function getTimeUntilLabel(day: Day | undefined, event: Event | null) {
  if (!day || !event?.start_time) return '';
  const eventDate = getEventDate(day, event);
  if (!eventDate) return '';

  const diffMs = eventDate.getTime() - Date.now();
  if (diffMs < 0) return '開始済み';

  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes < 60) return `あと${diffMinutes}分`;

  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  return minutes === 0 ? `あと${hours}時間` : `あと${hours}時間${minutes}分`;
}

export function isPastEvent(day: Day | undefined, event: Event) {
  const eventDate = getEventDate(day, event);
  if (!eventDate) return false;
  return eventDate.getTime() < Date.now();
}
