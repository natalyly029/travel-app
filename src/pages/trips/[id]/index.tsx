import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Button, Card } from '@/components';
import { Trip, Day, Event } from '@/types';
import styles from '@/styles/TripDetail.module.css';

const RECENT_TRIPS_STORAGE_KEY = 'travel-app-recent-trips';

type RecentTrip = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  updatedAt: string;
};

function saveRecentTrip(trip: RecentTrip) {
  if (typeof window === 'undefined') return;

  try {
    const stored = window.localStorage.getItem(RECENT_TRIPS_STORAGE_KEY);
    const parsed = stored ? (JSON.parse(stored) as RecentTrip[]) : [];
    const normalized = Array.isArray(parsed) ? parsed : [];
    const next = [trip, ...normalized.filter((item) => item.id !== trip.id)].slice(0, 5);

    window.localStorage.setItem(RECENT_TRIPS_STORAGE_KEY, JSON.stringify(next));
  } catch (error) {
    console.error('Failed to persist recent trip:', error);
  }
}

export default function TripDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [trip, setTrip] = useState<Trip | null>(null);
  const [days, setDays] = useState<Day[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [paymentCount, setPaymentCount] = useState(0);
  const [nextEvent, setNextEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;

    const fetchTrip = async () => {
      try {
        const response = await fetch(`/api/trips/${id}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to load trip');
        }

        setTrip(result.data.trip);
        setDays(result.data.days);
        setMemberCount(result.data.memberCount || 0);
        setPaymentCount(result.data.paymentCount || 0);
        setEvents(result.data.events || []);
        setNextEvent(result.data.nextEvent || null);

        saveRecentTrip({
          id: result.data.trip.id,
          title: result.data.trip.title,
          startDate: result.data.trip.start_date,
          endDate: result.data.trip.end_date,
          updatedAt: new Date().toISOString(),
        });

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrip();
  }, [id]);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}>⏳</div>
          <p>旅を読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>エラーが発生しました</h2>
          <p>{error}</p>
          <Link href="/">
            <Button variant="primary">ホームに戻る</Button>
          </Link>
        </div>
      </div>
    );
  }

  const tripDuration = days.length > 0
    ? `${days.length}日間`
    : '読み込み中...';
  const totalEvents = events.length;
  const scheduledEvents = events.filter((event) => event.start_time).length;

  const getDayPreview = (day: Day) => {
    const dayEvents = events
      .filter((event) => event.day_id === day.id)
      .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));

    if (dayEvents.length === 0) {
      return {
        headline: day.label || '予定を追加してください',
        countLabel: '予定なし',
      };
    }

    const firstEvent = dayEvents[0];

    return {
      headline: firstEvent.start_time
        ? `${firstEvent.start_time} ${firstEvent.title}`
        : firstEvent.title,
      countLabel:
        dayEvents.length === 1
          ? '1件の予定'
          : `${dayEvents.length}件の予定`,
    };
  };

  return (
    <div className={styles.container}>
      {/* Trip Header */}
      <section className={styles.header}>
        <div className={styles.headerContent}>
          <h1>{trip.title}</h1>
          <p className={styles.duration}>📅 {tripDuration}</p>
          {trip.description && (
            <p className={styles.description}>{trip.description}</p>
          )}
        </div>

        <div className={styles.shareSection}>
          <p>シェアコード</p>
          <code className={styles.shareToken}>{trip.share_token}</code>
          <button
            className={styles.copyButton}
            onClick={() => {
              navigator.clipboard.writeText(
                `${window.location.origin}/trips/join/${trip.share_token}`
              );
              alert('リンクをコピーしました！');
            }}
          >
            🔗 リンクをコピー
          </button>
        </div>
      </section>

      {/* Tabs Navigation */}
      <nav className={styles.tabs}>
        <Link href={`/trips/${trip.id}/schedule`} className={styles.tab}>
          📅 スケジュール
        </Link>
        <Link href={`/trips/${trip.id}/members`} className={styles.tab}>
          👥 メンバー
        </Link>
        <Link href={`/trips/${trip.id}/payments`} className={styles.tab}>
          💰 支払い
        </Link>
        <Link href={`/trips/${trip.id}/settlement`} className={styles.tab}>
          🧾 清算
        </Link>
      </nav>

      {nextEvent && (
        <section className={styles.nextEventSection}>
          <Card className={styles.nextEventCard}>
            <div>
              <p className={styles.metricLabel}>次の予定</p>
              <h3 className={styles.nextEventTitle}>{nextEvent.title}</h3>
              <p className={styles.nextEventMeta}>
                {nextEvent.start_time || '時間未定'}
                {nextEvent.location ? ` ・ ${nextEvent.location}` : ''}
              </p>
            </div>
            <Link href={`/trips/${trip.id}/schedule`}>
              <Button variant="secondary">予定を見る</Button>
            </Link>
          </Card>
        </section>
      )}

      <section className={styles.metricsSection}>
        <Card className={styles.metricCard}>
          <p className={styles.metricLabel}>旅程日数</p>
          <p className={styles.metricValue}>{days.length}</p>
        </Card>
        <Card className={styles.metricCard}>
          <p className={styles.metricLabel}>予定件数</p>
          <p className={styles.metricValue}>{totalEvents}</p>
        </Card>
        <Card className={styles.metricCard}>
          <p className={styles.metricLabel}>時刻確定</p>
          <p className={styles.metricValue}>{scheduledEvents}</p>
        </Card>
        <Card className={styles.metricCard}>
          <p className={styles.metricLabel}>メンバー数</p>
          <p className={styles.metricValue}>{memberCount}</p>
        </Card>
        <Card className={styles.metricCard}>
          <p className={styles.metricLabel}>支払い件数</p>
          <p className={styles.metricValue}>{paymentCount}</p>
        </Card>
      </section>

      {/* Days Overview */}
      <section className={styles.daysSection}>
        <h2>旅程</h2>
        <div className={styles.daysList}>
          {days.map((day) => {
            const preview = getDayPreview(day);

            return (
              <Link
                key={day.id}
                href={`/trips/${trip.id}/schedule?dayId=${day.id}`}
                className={styles.dayCardLink}
              >
                <Card className={styles.dayCard}>
                  <div className={styles.dayHeader}>
                    <h3>Day {day.day_number}</h3>
                    <span className={styles.date}>
                      {new Date(day.date).toLocaleDateString('ja-JP', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <p className={styles.dayLabel}>{preview.headline}</p>
                  <span className={styles.dayMeta}>{preview.countLabel}</span>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Quick Actions */}
      <section className={styles.actions}>
        <Link href={`/trips/${trip.id}/schedule`}>
          <Button variant="primary" size="lg">
            📝 スケジュール編集
          </Button>
        </Link>
      </section>
    </div>
  );
}
