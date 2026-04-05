import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Button, Card } from '@/components';
import { Trip, Member } from '@/types';
import styles from '@/styles/Members.module.css';

export default function MembersPage() {
  const router = useRouter();
  const { id } = router.query;
  const [trip, setTrip] = useState<Trip | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        // Fetch trip
        const tripRes = await fetch(`/api/trips/${id}`);
        const tripData = await tripRes.json();
        setTrip(tripData.data.trip);

        // Fetch members
        const membersRes = await fetch(`/api/trips/${id}/members`);
        const membersData = await membersRes.json();
        setMembers(membersData.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name) {
      alert('名前を入力してください');
      return;
    }

    try {
      const response = await fetch(`/api/trips/${id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add member');
      }

      setMembers([...members, ...result.data]);
      setFormData({ name: '' });
      setIsAddingMember(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add member');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('このメンバーを削除しますか？')) return;

    try {
      const response = await fetch(`/api/trips/${id}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId }),
      });

      if (!response.ok) throw new Error('Failed to remove member');

      setMembers(members.filter((m) => m.id !== memberId));
    } catch (err) {
      alert('メンバーの削除に失敗しました');
    }
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>⏳ 読み込み中...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <Link href={`/trips/${id}`}>← 戻る</Link>
        <h1>👥 メンバー管理</h1>
        <div />
      </div>

      {/* Share Section */}
      <Card className={styles.shareCard}>
        <h3>🔗 友達を招待</h3>
        <p>このリンクを友達に送って、そのまま一緒に旅を編集できます</p>
        <code className={styles.shareLink}>
          {typeof window !== 'undefined'
            ? `${window.location.origin}/trips/join/${trip?.share_token}`
            : 'リンク読み込み中...'}
        </code>
        <Button
          variant="secondary"
          onClick={() => {
            const link = `${window.location.origin}/trips/join/${trip?.share_token}`;
            navigator.clipboard.writeText(link);
            alert('リンクをコピーしました！');
          }}
          className={styles.copyButton}
        >
          📋 リンクをコピー
        </Button>
      </Card>

      {/* Members List */}
      <section className={styles.membersSection}>
        <div className={styles.sectionHeader}>
          <h2>メンバー一覧 ({members.length})</h2>
          {!isAddingMember && (
            <Button
              variant="primary"
              onClick={() => setIsAddingMember(true)}
              size="sm"
            >
              + 追加
            </Button>
          )}
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}

        {/* Add Member Form */}
        {isAddingMember && (
          <Card className={styles.formCard}>
            <form onSubmit={handleAddMember} className={styles.form}>
              <div className={styles.formGroup}>
                <label>名前 *</label>
                <input
                  type="text"
                  placeholder="例: 太郎"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className={styles.input}
                  required
                />
              </div>

              <div className={styles.formActions}>
                <Button type="submit" variant="primary">
                  追加する
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsAddingMember(false)}
                >
                  キャンセル
                </Button>
              </div>
            </form>
          </Card>
        )}

        <div className={styles.membersList}>
          {members.length === 0 ? (
            <p className={styles.empty}>メンバーを追加しましょう</p>
          ) : (
            <>
              <div className={styles.membersHeader}>
                <span>メンバー</span>
                <span>操作</span>
              </div>
              {members.map((member) => (
                <Card key={member.id} className={styles.memberCard}>
                  <div className={styles.memberRow}>
                    <div className={styles.memberCell}>
                      <span className={styles.cellLabel}>メンバー</span>
                      <div className={styles.memberInline}>
                        <div className={styles.memberAvatar}>
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div className={styles.memberInfo}>
                          <h4>{member.name}</h4>
                        </div>
                      </div>
                    </div>
                    <div className={styles.memberCell}>
                      <span className={styles.cellLabel}>操作</span>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleRemoveMember(member.id)}
                        className={styles.deleteButton}
                      >
                        削除
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
