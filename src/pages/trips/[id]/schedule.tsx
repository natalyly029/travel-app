import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Button, Card, TripNav } from '@/components';
import { Trip, Day, Event } from '@/types';
import {
  formatDayDate,
  getPreferredDayId,
  getTimeUntilLabel,
  getUpcomingEventId,
  isPastEvent,
  isTodayDate,
  sortEventsChronologically,
} from '@/lib/tripUtils';
import styles from '@/styles/Schedule.module.css';

const EVENT_TYPES = [
  { id: 'sightseeing', label: '📍 観光', color: '#a78bfa' },
  { id: 'food', label: '🍽 グルメ', color: '#fca5a5' },
  { id: 'accommodation', label: '🏨 宿泊', color: '#a7f3d0' },
  { id: 'transport', label: '✈️ 移動', color: '#fef08a' },
  { id: 'activity', label: '🎉 活動', color: '#c7d2fe' },
  { id: 'note', label: '📝 メモ', color: '#e5e7eb' },
];

const EMPTY_FORM = {
  type: 'sightseeing',
  title: '',
  start_time: '',
  location: '',
  notes: '',
};

export default function ScheduleEditor() {
  const router = useRouter();
  const { id } = router.query;
  const [trip, setTrip] = useState<Trip | null>(null);
  const [days, setDays] = useState<Day[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedDayId, setSelectedDayId] = useState<string>('');
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const requestedDayId = typeof router.query.dayId === 'string' ? router.query.dayId : '';

    const fetchData = async () => {
      try {
        const tripRes = await fetch(`/api/trips/${id}`);
        const tripData = await tripRes.json();
        const fetchedDays = (tripData.data.days || []) as Day[];
        setTrip(tripData.data.trip);
        setDays(fetchedDays);
        setSelectedDayId(getPreferredDayId(fetchedDays, requestedDayId));
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id, router.query.dayId]);

  useEffect(() => {
    if (!id || !selectedDayId) return;

    const fetchDayEvents = async () => {
      try {
        const response = await fetch(`/api/trips/${id}/schedule?dayId=${selectedDayId}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to fetch day events');
        setEvents(result.data || []);
      } catch (err) {
        console.error('Error fetching day events:', err);
      }
    };

    fetchDayEvents();
  }, [id, selectedDayId]);

  const selectedDay = days.find((d) => d.id === selectedDayId);
  const dayEvents = useMemo(() => sortEventsChronologically(events), [events]);
  const upcomingEventId = useMemo(() => getUpcomingEventId(selectedDay, dayEvents), [selectedDay, dayEvents]);

  useEffect(() => {
    if (!dayEvents.length) {
      setSelectedEventId('');
      return;
    }

    setSelectedEventId((current) => {
      if (current && dayEvents.some((event) => event.id === current)) return current;
      return upcomingEventId || dayEvents[0]?.id || '';
    });
  }, [dayEvents, upcomingEventId]);

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDayId || !formData.title) {
      alert('タイトルを入力してください');
      return;
    }

    try {
      const response = await fetch(`/api/trips/${id}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          day_id: selectedDayId,
          type: formData.type,
          title: formData.title,
          start_time: formData.start_time,
          location: formData.location,
          notes: formData.notes,
        }),
      });

      if (!response.ok) throw new Error('Failed to add event');

      const result = await response.json();
      const createdEvent = result.data?.[0];
      setEvents((current) => sortEventsChronologically([...current, ...result.data]));
      if (createdEvent?.id) {
        setSelectedEventId(createdEvent.id);
      }
      setFormData(EMPTY_FORM);
      setIsAddingEvent(false);
    } catch {
      alert('イベント追加に失敗しました');
    }
  };

  const handleStartEditEvent = (event: Event) => {
    setIsAddingEvent(false);
    setIsEditingEvent(true);
    setFormData({
      type: event.type,
      title: event.title,
      start_time: event.start_time || '',
      location: event.location || '',
      notes: event.notes || '',
    });
  };

  const selectedEvent = dayEvents.find((event) => event.id === selectedEventId) || dayEvents[0] || null;

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedEvent) {
      alert('編集対象の予定がありません');
      return;
    }

    try {
      const response = await fetch(`/api/trips/${id}/schedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: selectedEvent.id,
          type: formData.type,
          title: formData.title,
          start_time: formData.start_time,
          location: formData.location,
          notes: formData.notes,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to update event');

      setEvents((current) => sortEventsChronologically(current.map((event) => (event.id === selectedEvent.id ? result.data[0] : event))));
      setIsEditingEvent(false);
      setFormData(EMPTY_FORM);
    } catch {
      alert('予定の更新に失敗しました');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('この予定を削除しますか？')) return;

    try {
      const response = await fetch(`/api/trips/${id}/schedule`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete event');
      }

      setEvents((current) => current.filter((event) => event.id !== eventId));
      setSelectedEventId((current) => (current === eventId ? '' : current));
    } catch {
      alert('予定の削除に失敗しました');
    }
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>⏳ 読み込み中...</div>
      </div>
    );
  }

  const timedEventsCount = dayEvents.filter((event) => event.start_time).length;
  const upcomingEvent = dayEvents.find((event) => event.id === upcomingEventId) || null;
  const isSelectedDayToday = selectedDay ? isTodayDate(selectedDay.date) : false;
  const timeUntilUpcoming = getTimeUntilLabel(selectedDay, upcomingEvent);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href={`/trips/${id}`}>←</Link>
        <h1>{trip?.title}</h1>
        <div style={{ width: '40px' }} />
      </div>

      <TripNav tripId={typeof id === 'string' ? id : ''} />

      <nav className={styles.dayTabs}>
        {days.map((day) => {
          const isToday = isTodayDate(day.date);
          return (
            <button
              key={day.id}
              className={`${styles.dayTab} ${selectedDayId === day.id ? styles.active : ''} ${isToday ? styles.todayDayTab : ''}`}
              onClick={() => setSelectedDayId(day.id)}
            >
              Day {day.day_number}
              {isToday && <span className={styles.todayBadge}>今日</span>}
              <span className={styles.date}>{formatDayDate(day.date)}</span>
            </button>
          );
        })}
      </nav>

      <div className={styles.content}>
        <section className={styles.timelineSection}>
          <div className={styles.sectionTitleRow}>
            <div>
              <h2>日内タイムライン</h2>
              {selectedDay && <p className={styles.dayContext}>{formatDayDate(selectedDay.date)}{isSelectedDayToday ? ' ・ 今日' : ''}</p>}
            </div>
            <span className={styles.sectionMeta}>
              {timedEventsCount > 0 ? `${timedEventsCount}件が時刻指定` : '時刻未設定中心'}
            </span>
          </div>

          {upcomingEvent && (
            <Card className={styles.upcomingCard}>
              <div>
                <p className={styles.upcomingLabel}>{isSelectedDayToday ? '今日いちばん近い予定' : '次に近い予定'}</p>
                <h3>{upcomingEvent.title}</h3>
                <p className={styles.upcomingMeta}>{upcomingEvent.start_time || '時間未定'}{upcomingEvent.location ? ` ・ ${upcomingEvent.location}` : ''}</p>
              </div>
              {timeUntilUpcoming && <strong className={styles.upcomingCountdown}>{timeUntilUpcoming}</strong>}
            </Card>
          )}

          {dayEvents.length === 0 ? (
            <p className={styles.emptyState}>予定がありません。追加しましょう！</p>
          ) : (
            <div className={styles.timelineList}>
              {dayEvents.map((event) => {
                const eventType = EVENT_TYPES.find((t) => t.id === event.type);
                const isSelected = selectedEvent?.id === event.id;
                const isUpcoming = upcomingEventId === event.id;
                const past = isPastEvent(selectedDay, event);

                return (
                  <button
                    key={event.id}
                    type="button"
                    className={`${styles.timelineItem} ${isSelected ? styles.timelineItemActive : ''} ${isUpcoming ? styles.timelineItemUpcoming : ''} ${past ? styles.timelineItemPast : ''}`}
                    onClick={() => setSelectedEventId(event.id)}
                  >
                    <div className={styles.timelineTime}>
                      {event.start_time || '未定'}
                    </div>
                    <div className={styles.timelineLineWrap}>
                      <span
                        className={styles.timelineDot}
                        style={{ backgroundColor: eventType?.color || '#a78bfa' }}
                      />
                      <span className={styles.timelineLine} />
                    </div>
                    <div className={styles.timelineContent}>
                      <div className={styles.timelineTopRow}>
                        <h3>{event.title}</h3>
                        <div className={styles.timelineBadgeRow}>
                          {isUpcoming && <span className={styles.upcomingPill}>NEAR</span>}
                          <span className={styles.eventTypeBadge}>{eventType?.label || '予定'}</span>
                        </div>
                      </div>
                      <div className={styles.timelineMeta}>
                        <span>{event.location ? `📍 ${event.location}` : '場所未設定'}</span>
                        <span>{event.notes ? event.notes : 'メモ未設定'}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className={styles.eventsSection}>
          <div className={styles.sectionTitleRow}>
            <h2>予定一覧</h2>
            <span className={styles.sectionMeta}>{dayEvents.length}件 / 時間あり {timedEventsCount}件</span>
          </div>
          {dayEvents.length === 0 ? (
            <p className={styles.emptyState}>予定がありません。追加しましょう！</p>
          ) : (
            <div className={styles.eventsList}>
              <div className={styles.eventsListHeader}>
                <span>時刻</span>
                <span>タイトル</span>
                <span>種類</span>
                <span>場所 / メモ</span>
              </div>
              {dayEvents.map((event) => {
                const eventType = EVENT_TYPES.find((t) => t.id === event.type);
                const past = isPastEvent(selectedDay, event);
                const isUpcoming = upcomingEventId === event.id;
                return (
                  <button
                    key={event.id}
                    type="button"
                    className={`${styles.eventCardButton} ${selectedEvent?.id === event.id ? styles.eventCardButtonActive : ''} ${past ? styles.eventCardButtonPast : ''}`}
                    onClick={() => setSelectedEventId(event.id)}
                  >
                    <Card className={`${styles.eventCard} ${isUpcoming ? styles.eventCardUpcoming : ''}`}>
                      <div className={styles.eventColor} style={{ backgroundColor: eventType?.color }} />
                      <div className={styles.eventRow}>
                        <div className={styles.eventTimeCol}>
                          <span className={styles.cellLabel}>時刻</span>
                          <p className={styles.time}>{event.start_time || '—'}</p>
                        </div>
                        <div className={styles.eventTitleCol}>
                          <span className={styles.cellLabel}>タイトル</span>
                          <h4>{event.title}</h4>
                          {isUpcoming && <span className={styles.todayHighlight}>次に近い予定</span>}
                        </div>
                        <div className={styles.eventTypeCol}>
                          <span className={styles.cellLabel}>種類</span>
                          <span className={styles.eventTypeBadge}>{eventType?.label || '予定'}</span>
                        </div>
                        <div className={styles.eventMetaCol}>
                          <span className={styles.cellLabel}>場所 / メモ</span>
                          {event.location && <p className={styles.location}>📍 {event.location}</p>}
                          {event.notes && <p className={styles.notes}>{event.notes}</p>}
                          {!event.notes && !event.location && <p className={styles.notes}>詳細未設定</p>}
                        </div>
                      </div>
                    </Card>
                  </button>
                );
              })}
            </div>
          )}

          {selectedEvent && (
            <Card className={styles.detailCard}>
              <div className={styles.detailHeader}>
                <div>
                  <p className={styles.detailEyebrow}>選択中の予定</p>
                  <h3>{selectedEvent.title}</h3>
                </div>
                <div className={styles.detailActions}>
                  <Button variant="secondary" size="sm" onClick={() => handleStartEditEvent(selectedEvent)} className={styles.deleteEventButton}>編集</Button>
                  <Button variant="secondary" size="sm" onClick={() => handleDeleteEvent(selectedEvent.id)} className={styles.deleteEventButton}>削除</Button>
                </div>
              </div>

              <div className={styles.detailGrid}>
                <div className={styles.detailItem}><span className={styles.detailLabel}>種類</span><p>{EVENT_TYPES.find((type) => type.id === selectedEvent.type)?.label || '予定'}</p></div>
                <div className={styles.detailItem}><span className={styles.detailLabel}>時間</span><p>{selectedEvent.start_time || '未設定'}</p></div>
                <div className={styles.detailItem}><span className={styles.detailLabel}>場所</span><p>{selectedEvent.location || '未設定'}</p></div>
                <div className={styles.detailItem}><span className={styles.detailLabel}>メモ</span><p>{selectedEvent.notes || '未設定'}</p></div>
              </div>
            </Card>
          )}
        </section>

        <section className={styles.addEventSection}>
          <h3>{isEditingEvent ? '🛠️ 予定を編集' : '✨ 予定を追加'}</h3>
          {!isAddingEvent && !isEditingEvent ? (
            <Button variant="primary" onClick={() => setIsAddingEvent(true)} className={styles.addButton}>+ 予定を追加</Button>
          ) : (
            <Card className={styles.formCard}>
              <form onSubmit={isEditingEvent ? handleUpdateEvent : handleAddEvent} className={styles.form}>
                <div className={styles.formGroup}>
                  <label>種類</label>
                  <div className={styles.typeSelector}>
                    {EVENT_TYPES.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        className={`${styles.typeButton} ${formData.type === t.id ? styles.selected : ''}`}
                        onClick={() => setFormData({ ...formData, type: t.id })}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>タイトル *</label>
                  <input type="text" placeholder="例: 清水寺を訪問" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className={styles.input} required />
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label>時間</label>
                    <input type="time" value={formData.start_time} onChange={(e) => setFormData({ ...formData, start_time: e.target.value })} className={styles.input} />
                  </div>

                  <div className={styles.formGroup}>
                    <label>場所</label>
                    <input type="text" placeholder="例: 清水区1-1" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className={styles.input} />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>メモ</label>
                  <textarea placeholder="詳細や注意点など" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className={styles.textarea} rows={2} />
                </div>

                <div className={styles.formActions}>
                  <Button type="submit" variant="primary">{isEditingEvent ? '更新する' : '追加する'}</Button>
                  <Button type="button" variant="secondary" onClick={() => { setIsAddingEvent(false); setIsEditingEvent(false); setFormData(EMPTY_FORM); }}>キャンセル</Button>
                </div>
              </form>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}
