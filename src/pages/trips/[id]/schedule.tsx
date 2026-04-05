import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Button, Card } from '@/components';
import { Trip, Day, Event } from '@/types';
import styles from '@/styles/Schedule.module.css';

const EVENT_TYPES = [
  { id: 'sightseeing', label: '📍 観光', color: '#a78bfa' },
  { id: 'food', label: '🍽 グルメ', color: '#fca5a5' },
  { id: 'accommodation', label: '🏨 宿泊', color: '#a7f3d0' },
  { id: 'transport', label: '✈️ 移動', color: '#fef08a' },
  { id: 'activity', label: '🎉 活動', color: '#c7d2fe' },
  { id: 'note', label: '📝 メモ', color: '#e5e7eb' },
];

export default function ScheduleEditor() {
  const router = useRouter();
  const { id } = router.query;
  const [trip, setTrip] = useState<Trip | null>(null);
  const [days, setDays] = useState<Day[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedDayId, setSelectedDayId] = useState<string>('');
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [formData, setFormData] = useState({
    type: 'sightseeing',
    title: '',
    start_time: '',
    location: '',
    notes: '',
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const requestedDayId = typeof router.query.dayId === 'string' ? router.query.dayId : '';

    const fetchData = async () => {
      try {
        // Fetch trip data
        const tripRes = await fetch(`/api/trips/${id}`);
        const tripData = await tripRes.json();
        setTrip(tripData.data.trip);
        setDays(tripData.data.days);
        if (tripData.data.days.length > 0) {
          const matchedDay = tripData.data.days.find((day: Day) => day.id === requestedDayId);
          setSelectedDayId(matchedDay ? matchedDay.id : tripData.data.days[0].id);
        }

        // Fetch events
        const eventsRes = await fetch(`/api/trips/${id}/schedule`);
        const eventsData = await eventsRes.json();
        setEvents(eventsData.data || []);
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id, router.query.dayId]);

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
      setEvents([...events, ...result.data]);

      // Reset form
      setFormData({
        type: 'sightseeing',
        title: '',
        start_time: '',
        location: '',
        notes: '',
      });
      setIsAddingEvent(false);
    } catch (err) {
      alert('イベント追加に失敗しました');
    }
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>⏳ 読み込み中...</div>
      </div>
    );
  }

  const selectedDay = days.find((d) => d.id === selectedDayId);
  const dayEvents = selectedDay
    ? events.filter((e) => e.day_id === selectedDay.id)
    : [];

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <Link href={`/trips/${id}`}>←</Link>
        <h1>{trip?.title}</h1>
        <div style={{ width: '40px' }} />
      </div>

      {/* Day Selector */}
      <nav className={styles.dayTabs}>
        {days.map((day) => (
          <button
            key={day.id}
            className={`${styles.dayTab} ${
              selectedDayId === day.id ? styles.active : ''
            }`}
            onClick={() => setSelectedDayId(day.id)}
          >
            Day {day.day_number}
            <span className={styles.date}>
              {new Date(day.date).toLocaleDateString('ja-JP', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </button>
        ))}
      </nav>

      {/* Schedule Content */}
      <div className={styles.content}>
        {/* Events List */}
        <section className={styles.eventsSection}>
          <h2>予定一覧</h2>
          {dayEvents.length === 0 ? (
            <p className={styles.emptyState}>予定がありません。追加しましょう！</p>
          ) : (
            <div className={styles.eventsList}>
              {dayEvents.map((event) => {
                const eventType = EVENT_TYPES.find((t) => t.id === event.type);
                return (
                  <Card key={event.id} className={styles.eventCard}>
                    <div
                      className={styles.eventColor}
                      style={{ backgroundColor: eventType?.color }}
                    />
                    <div className={styles.eventContent}>
                      <h4>{event.title}</h4>
                      {event.start_time && (
                        <p className={styles.time}>⏰ {event.start_time}</p>
                      )}
                      {event.location && (
                        <p className={styles.location}>📍 {event.location}</p>
                      )}
                      {event.notes && <p className={styles.notes}>{event.notes}</p>}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* Add Event Form */}
        <section className={styles.addEventSection}>
          <h3>✨ 予定を追加</h3>
          {!isAddingEvent ? (
            <Button
              variant="primary"
              onClick={() => setIsAddingEvent(true)}
              className={styles.addButton}
            >
              + 予定を追加
            </Button>
          ) : (
            <Card className={styles.formCard}>
              <form onSubmit={handleAddEvent} className={styles.form}>
                <div className={styles.formGroup}>
                  <label>種類</label>
                  <div className={styles.typeSelector}>
                    {EVENT_TYPES.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        className={`${styles.typeButton} ${
                          formData.type === t.id ? styles.selected : ''
                        }`}
                        onClick={() =>
                          setFormData({ ...formData, type: t.id })
                        }
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>タイトル *</label>
                  <input
                    type="text"
                    placeholder="例: 清水寺を訪問"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className={styles.input}
                    required
                  />
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label>時間</label>
                    <input
                      type="time"
                      value={formData.start_time}
                      onChange={(e) =>
                        setFormData({ ...formData, start_time: e.target.value })
                      }
                      className={styles.input}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>場所</label>
                    <input
                      type="text"
                      placeholder="例: 清水区1-1"
                      value={formData.location}
                      onChange={(e) =>
                        setFormData({ ...formData, location: e.target.value })
                      }
                      className={styles.input}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>メモ</label>
                  <textarea
                    placeholder="詳細や注意点など"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    className={styles.textarea}
                    rows={2}
                  />
                </div>

                <div className={styles.formActions}>
                  <Button type="submit" variant="primary">
                    追加する
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setIsAddingEvent(false)}
                  >
                    キャンセル
                  </Button>
                </div>
              </form>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}
