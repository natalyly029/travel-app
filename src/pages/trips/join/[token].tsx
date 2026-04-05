import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Button, Card } from '@/components';
import { Trip } from '@/types';
import styles from '@/styles/JoinTrip.module.css';

export default function JoinTripPage() {
  const router = useRouter();
  const { token } = router.query;
  const [trip, setTrip] = useState<Trip | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;

    const fetchTrip = async () => {
      try {
        const response = await fetch(`/api/trips/join/${token}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || '招待リンクが無効です');
        }

        setTrip(result.data.trip);
        router.replace(`/trips/${result.data.trip.id}`);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : '旅の情報を取得できませんでした'
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrip();
  }, [token, router]);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <Card className={styles.redirectCard}>
          <h2>✈️ 旅程を開いています</h2>
          <p>{trip?.title || '共有リンクを確認中...'}</p>
          <p className={styles.helperText}>入力なしでそのまま旅のページへ移動します。</p>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <Card className={styles.errorCard}>
          <h2>❌ エラー</h2>
          <p>{error}</p>
          <Link href="/">
            <Button variant="primary">ホームに戻る</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Card className={styles.redirectCard}>
        <h2>旅程へ移動します</h2>
        <p>{trip?.title}</p>
      </Card>
    </div>
  );
}
