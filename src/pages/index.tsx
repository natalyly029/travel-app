import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card } from '@/components';
import styles from '@/styles/Home.module.css';

type RecentTrip = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  updatedAt: string;
};

const RECENT_TRIPS_STORAGE_KEY = 'travel-app-recent-trips';

export default function Home() {
  const [recentTrips, setRecentTrips] = useState<RecentTrip[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = window.localStorage.getItem(RECENT_TRIPS_STORAGE_KEY);
      if (!stored) return;

      const parsed = JSON.parse(stored) as RecentTrip[];
      if (Array.isArray(parsed)) {
        setRecentTrips(parsed);
      }
    } catch (error) {
      console.error('Failed to load recent trips:', error);
    }
  }, []);

  return (
    <div className={styles.container}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.title}>
            🗺️ Travel App
          </h1>
          <p className={styles.subtitle}>
            友達と一緒に旅を計画しよう
          </p>
          <p className={styles.description}>
            スケジュール管理から割り勘計算まで、すべてがここに
          </p>

          <Link href="/trips/create">
            <Button variant="primary" size="lg" className={styles.ctaButton}>
              旅を計画する ✈️
            </Button>
          </Link>
        </div>

        {/* Floating Animation */}
        <div className={styles.floatingEmoji}>
          🧳
        </div>
      </section>

      {recentTrips.length > 0 && (
        <section className={styles.recentSection}>
          <div className={styles.sectionHeader}>
            <h2>最近の旅</h2>
            <p>この端末で作成した計画をすぐ開けます</p>
          </div>

          <div className={styles.recentGrid}>
            {recentTrips.map((trip) => (
              <Card key={trip.id} className={styles.recentCard}>
                <div className={styles.recentCardHeader}>
                  <h3>{trip.title}</h3>
                  <span className={styles.recentBadge}>最近使った旅</span>
                </div>
                <p className={styles.recentDates}>
                  📅 {trip.startDate} 〜 {trip.endDate}
                </p>
                <p className={styles.recentUpdated}>
                  更新: {new Date(trip.updatedAt).toLocaleString('ja-JP')}
                </p>
                <Link href={`/trips/${trip.id}`}>
                  <Button variant="secondary" className={styles.recentButton}>
                    続きを開く
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className={styles.features}>
        <h2>こんなことができます</h2>

        <div className={styles.featureGrid}>
          <Card className={styles.featureCard}>
            <div className={styles.featureIcon}>📅</div>
            <h3>スケジュール管理</h3>
            <p>日々のスケジュールを、観光・食事・宿泊など細かく管理</p>
          </Card>

          <Card className={styles.featureCard}>
            <div className={styles.featureIcon}>👥</div>
            <h3>メンバー管理</h3>
            <p>友達を招待して、一緒に計画・編集</p>
          </Card>

          <Card className={styles.featureCard}>
            <div className={styles.featureIcon}>💰</div>
            <h3>割り勘計算</h3>
            <p>支払いを記録すれば、自動で誰が誰にいくら返すかを計算</p>
          </Card>

          <Card className={styles.featureCard}>
            <div className={styles.featureIcon}>📄</div>
            <h3>PDF出力</h3>
            <p>旅のしおりをPDFで出力して、印刷できます</p>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.ctaSection}>
        <Card className={styles.ctaCard}>
          <h2>さあ、旅に出かけよう！</h2>
          <p>登録なし、無料で今すぐ使える</p>
          <Link href="/trips/create">
            <Button variant="primary" size="lg">
              旅を計画する
            </Button>
          </Link>
        </Card>
      </section>
    </div>
  );
}
