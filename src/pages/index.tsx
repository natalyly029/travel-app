import React from 'react';
import Link from 'next/link';
import { Button, Card } from '@/components';
import styles from '@/styles/Home.module.css';

export default function Home() {
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
