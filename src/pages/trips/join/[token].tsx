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
  const [yourName, setYourName] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      } catch (err) {
        setError(
          err instanceof Error ? err.message : '旅の情報を取得できませんでした'
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrip();
  }, [token]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (!yourName) {
      alert('名前を入力してください');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`/api/trips/join/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: yourName,
          email,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '参加に失敗しました');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(`/trips/${result.data.trip_id}`);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : '参加処理に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>⏳ リンクを確認中...</div>
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

  if (success) {
    return (
      <div className={styles.container}>
        <Card className={styles.successCard}>
          <h2>✅ 参加完了！</h2>
          <p>旅詳細ページにリダイレクト中...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Hero Section */}
        <Card className={styles.heroCard}>
          <h1>🎉 旅に招待されました</h1>
          <p className={styles.tripTitle}>{trip?.title}</p>
          <p className={styles.tripDescription}>{trip?.description}</p>

          <div className={styles.tripDetails}>
            <div className={styles.detail}>
              <span>📅 日程</span>
              <p>
                {trip?.start_date && trip?.end_date && (
                  <>
                    {new Date(trip.start_date).toLocaleDateString('ja-JP')} 〜{' '}
                    {new Date(trip.end_date).toLocaleDateString('ja-JP')}
                  </>
                )}
              </p>
            </div>
            {trip?.template && (
              <div className={styles.detail}>
                <span>🎨 テンプレート</span>
                <p>{trip.template}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Join Form */}
        <Card className={styles.formCard}>
          <h2>参加する</h2>
          <form onSubmit={handleJoin} className={styles.form}>
            <div className={styles.formGroup}>
              <label>あなたの名前 *</label>
              <input
                type="text"
                placeholder="例: 太郎"
                value={yourName}
                onChange={(e) => setYourName(e.target.value)}
                className={styles.input}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>メールアドレス（オプション）</label>
              <input
                type="email"
                placeholder="例: taro@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles.input}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isSubmitting}
              className={styles.submitButton}
            >
              {isSubmitting ? '参加中...' : '旅に参加する'}
            </Button>
          </form>
        </Card>

        {/* Help Text */}
        <div className={styles.helpText}>
          <p>
            これで旅の計画、スケジュール、支払い管理に参加できます。
          </p>
        </div>
      </div>
    </div>
  );
}
