import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Button, Card } from '@/components';
import { Trip, Day } from '@/types';
import styles from '@/styles/TripDetail.module.css';

export default function TripDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [trip, setTrip] = useState<Trip | null>(null);
  const [days, setDays] = useState<Day[]>([]);
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

      {/* Days Overview */}
      <section className={styles.daysSection}>
        <h2>旅程</h2>
        <div className={styles.daysList}>
          {days.map((day) => (
            <Card key={day.id} className={styles.dayCard}>
              <div className={styles.dayHeader}>
                <h3>Day {day.day_number}</h3>
                <span className={styles.date}>
                  {new Date(day.date).toLocaleDateString('ja-JP', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
              <p className={styles.dayLabel}>
                {day.label || '予定を追加してください'}
              </p>
            </Card>
          ))}
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
