import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Button, Card, TripNav } from '@/components';
import { Day, Trip, TripSpot } from '@/types';
import styles from '@/styles/Spots.module.css';

const PRIORITY_OPTIONS = [
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
] as const;

const STATUS_OPTIONS = [
  { value: 'interested', label: '行きたい' },
  { value: 'considering', label: '検討中' },
  { value: 'visited', label: '行った' },
  { value: 'skipped', label: '見送り' },
] as const;

const EMPTY_FORM = {
  name: '',
  area: '',
  notes: '',
  url: '',
  priority: 'medium',
  status: 'interested',
};

export default function SpotsPage() {
  const router = useRouter();
  const { id } = router.query;
  const [trip, setTrip] = useState<Trip | null>(null);
  const [days, setDays] = useState<Day[]>([]);
  const [spots, setSpots] = useState<TripSpot[]>([]);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [isAdding, setIsAdding] = useState(false);
  const [scheduleTargetDayBySpot, setScheduleTargetDayBySpot] = useState<Record<string, string>>({});
  const [scheduleTimeBySpot, setScheduleTimeBySpot] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        const [tripRes, spotsRes] = await Promise.all([
          fetch(`/api/trips/${id}`),
          fetch(`/api/trips/${id}/spots`),
        ]);
        const tripResult = await tripRes.json();
        const spotsResult = await spotsRes.json();
        if (!tripRes.ok) throw new Error(tripResult.error || 'Failed to load trip');
        if (!spotsRes.ok) throw new Error(spotsResult.error || 'Failed to load spots');
        setTrip(tripResult.data.trip);
        setDays(tripResult.data.days || []);
        setSpots(spotsResult.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load spots');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const groupedSpots = useMemo(() => {
    return [...spots].sort((a, b) => {
      const statusOrder = ['interested', 'considering', 'visited', 'skipped'];
      const priorityOrder = ['high', 'medium', 'low'];
      const statusDiff = statusOrder.indexOf(a.status || 'interested') - statusOrder.indexOf(b.status || 'interested');
      if (statusDiff !== 0) return statusDiff;
      const priorityDiff = priorityOrder.indexOf(a.priority || 'medium') - priorityOrder.indexOf(b.priority || 'medium');
      if (priorityDiff !== 0) return priorityDiff;
      return (b.created_at || '').localeCompare(a.created_at || '');
    });
  }, [spots]);

  const handleCreateSpot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name) {
      setError('スポット名を入力してください');
      return;
    }

    try {
      const response = await fetch(`/api/trips/${id}/spots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to create spot');
      setSpots((current) => [...result.data, ...current]);
      setFormData(EMPTY_FORM);
      setIsAdding(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create spot');
    }
  };

  const handleDeleteSpot = async (spotId: string) => {
    if (!confirm('このスポットを削除しますか？')) return;

    try {
      const response = await fetch(`/api/trips/${id}/spots`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spotId }),
      });
      if (!response.ok) throw new Error('Failed to delete spot');
      setSpots((current) => current.filter((spot) => spot.id !== spotId));
    } catch {
      alert('スポットの削除に失敗しました');
    }
  };

  const handleQuickStatusChange = async (spot: TripSpot, status: TripSpot['status']) => {
    try {
      const response = await fetch(`/api/trips/${id}/spots`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spotId: spot.id,
          name: spot.name,
          area: spot.area,
          notes: spot.notes,
          url: spot.url,
          priority: spot.priority,
          status,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to update spot');
      setSpots((current) => current.map((item) => (item.id === spot.id ? result.data[0] : item)));
    } catch {
      alert('ステータス更新に失敗しました');
    }
  };

  const handleAddToSchedule = async (spot: TripSpot) => {
    const selectedDayId = scheduleTargetDayBySpot[spot.id] || days[0]?.id;
    const selectedDay = days.find((day) => day.id === selectedDayId);

    if (!selectedDayId || !selectedDay) {
      alert('追加先の日程を選択してください');
      return;
    }

    try {
      const response = await fetch(`/api/trips/${id}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          day_id: selectedDayId,
          type: 'activity',
          title: spot.name,
          start_time: scheduleTimeBySpot[spot.id] || '',
          location: spot.area || '',
          notes: spot.notes || '',
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to add schedule item');
      alert(`Day ${selectedDay.day_number} の予定に追加しました`);
    } catch {
      alert('予定への追加に失敗しました');
    }
  };

  if (isLoading) {
    return <div className={styles.container}><div className={styles.loading}>⏳ 読み込み中...</div></div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href={`/trips/${id}`}>← 戻る</Link>
        <h1>📍 気になるスポット</h1>
        <div />
      </div>

      <TripNav tripId={typeof id === 'string' ? id : ''} />

      <Card className={styles.summaryCard}>
        <div>
          <p className={styles.eyebrow}>候補スポット管理</p>
          <h2>{trip?.title}</h2>
          <p className={styles.summaryMeta}>{spots.length}件の候補を保存中</p>
        </div>
        {!isAdding && (
          <Button variant="primary" onClick={() => setIsAdding(true)}>
            + スポットを追加
          </Button>
        )}
      </Card>

      {error && <div className={styles.errorMessage}>{error}</div>}

      {isAdding && (
        <Card className={styles.formCard}>
          <form onSubmit={handleCreateSpot} className={styles.form}>
            <div className={styles.formGroup}>
              <label>スポット名 *</label>
              <input className={styles.input} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="例: 清水寺" required />
            </div>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>エリア</label>
                <input className={styles.input} value={formData.area} onChange={(e) => setFormData({ ...formData, area: e.target.value })} placeholder="例: 東山" />
              </div>
              <div className={styles.formGroup}>
                <label>URL</label>
                <input className={styles.input} value={formData.url} onChange={(e) => setFormData({ ...formData, url: e.target.value })} placeholder="Google Maps / 公式URL" />
              </div>
            </div>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>優先度</label>
                <select className={styles.input} value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })}>
                  {PRIORITY_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>状態</label>
                <select className={styles.input} value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                  {STATUS_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </div>
            </div>
            <div className={styles.formGroup}>
              <label>メモ</label>
              <textarea className={styles.textarea} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} placeholder="行きたい理由、営業時間、メモなど" />
            </div>
            <div className={styles.formActions}>
              <Button type="submit" variant="primary">保存する</Button>
              <Button type="button" variant="secondary" onClick={() => { setIsAdding(false); setFormData(EMPTY_FORM); }}>閉じる</Button>
            </div>
          </form>
        </Card>
      )}

      <section className={styles.listSection}>
        {groupedSpots.length === 0 ? (
          <p className={styles.empty}>まだ気になるスポットはありません</p>
        ) : (
          <div className={styles.spotList}>
            {groupedSpots.map((spot) => (
              <Card key={spot.id} className={styles.spotCard}>
                <div className={styles.spotTopRow}>
                  <div>
                    <div className={styles.badgeRow}>
                      <span className={styles.priorityBadge}>{spot.priority === 'high' ? '優先高' : spot.priority === 'low' ? '優先低' : '優先中'}</span>
                      <span className={styles.statusBadge}>{STATUS_OPTIONS.find((item) => item.value === spot.status)?.label || '行きたい'}</span>
                    </div>
                    <h3>{spot.name}</h3>
                    <p className={styles.spotMeta}>{spot.area || 'エリア未設定'}</p>
                  </div>
                  <div className={styles.actionGroup}>
                    <select
                      className={styles.daySelect}
                      value={scheduleTargetDayBySpot[spot.id] || days[0]?.id || ''}
                      onChange={(e) => setScheduleTargetDayBySpot((current) => ({ ...current, [spot.id]: e.target.value }))}
                    >
                      {days.map((day) => (
                        <option key={day.id} value={day.id}>
                          Day {day.day_number}
                        </option>
                      ))}
                    </select>
                    <input
                      type="time"
                      className={styles.daySelect}
                      value={scheduleTimeBySpot[spot.id] || ''}
                      onChange={(e) => setScheduleTimeBySpot((current) => ({ ...current, [spot.id]: e.target.value }))}
                    />
                    <Button variant="secondary" size="sm" onClick={() => handleAddToSchedule(spot)}>予定に追加</Button>
                    <Button variant="secondary" size="sm" onClick={() => handleDeleteSpot(spot.id)}>削除</Button>
                  </div>
                </div>

                {spot.notes && <p className={styles.notes}>{spot.notes}</p>}
                {spot.url && <a href={spot.url} target="_blank" rel="noreferrer" className={styles.link}>リンクを開く</a>}

                <div className={styles.quickActions}>
                  {STATUS_OPTIONS.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      className={`${styles.statusButton} ${spot.status === item.value ? styles.statusButtonActive : ''}`}
                      onClick={() => handleQuickStatusChange(spot, item.value)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
