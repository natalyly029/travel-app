import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Button, Card, TripNav } from '@/components';
import { CompletedSettlementTransfer, Settlement, Member } from '@/types';
import styles from '@/styles/Settlement.module.css';

interface MemberBalance {
  paid: number;
  fairShare: number;
  balance: number;
}

export default function SettlementPage() {
  const router = useRouter();
  const { id } = router.query;
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [completedSettlements, setCompletedSettlements] = useState<CompletedSettlementTransfer[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [memberBalances, setMemberBalances] = useState<Record<string, MemberBalance>>({});
  const [isUpdatingSettlement, setIsUpdatingSettlement] = useState<string | null>(null);
  const [totalAmount, setTotalAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const memberNameMap = useMemo(() => new Map(members.map((member) => [member.id, member.name])), [members]);
  const isSettled = settlements.length === 0;
  const getMemberName = (memberId: string) => memberNameMap.get(memberId) || memberId;
  const settlementKey = (fromMemberId: string, toMemberId: string, amount?: number, completedAt?: string | null) => `${fromMemberId}:${toMemberId}:${amount || 0}:${completedAt || ''}`;
  const unsettledSummary = useMemo(() => ({ count: settlements.length, amount: settlements.reduce((sum, item) => sum + item.amount, 0) }), [settlements]);

  useEffect(() => {
    if (!id) return;

    const fetchSettlement = async () => {
      try {
        const [settlementResponse, tripResponse] = await Promise.all([
          fetch(`/api/trips/${id}/settlement`),
          fetch(`/api/trips/${id}`),
        ]);

        const result = await settlementResponse.json();
        const tripResult = await tripResponse.json();

        if (!settlementResponse.ok) throw new Error(result.error || 'Failed to calculate settlement');
        if (!tripResponse.ok) throw new Error(tripResult.error || 'Failed to load trip members');

        setSettlements(result.data?.settlements || []);
        setCompletedSettlements(result.data?.completedSettlements || []);
        setMemberBalances(result.data?.memberBalances || {});
        setTotalAmount(result.data?.totalAmount || 0);
        setMembers(tripResult.data?.members || []);
      } catch (err) {
        console.error('Settlement error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettlement();
  }, [id]);

  const syncSettlementData = (data: { settlements: Settlement[]; completedSettlements: CompletedSettlementTransfer[]; memberBalances: Record<string, MemberBalance>; totalAmount: number; }) => {
    setSettlements(data.settlements || []);
    setCompletedSettlements(data.completedSettlements || []);
    setMemberBalances(data.memberBalances || {});
    setTotalAmount(data.totalAmount || 0);
  };

  const handleMarkBulkSettlementComplete = async (settlement: Settlement) => {
    if (!window.confirm(`${settlement.from_name} から ${settlement.to_name} へ ¥${settlement.amount.toLocaleString()} を清算済みにしますか？`)) return;
    const key = settlementKey(settlement.from_member_id, settlement.to_member_id, settlement.amount);
    setIsUpdatingSettlement(key);

    try {
      const response = await fetch(`/api/trips/${id}/settlement`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromMemberId: settlement.from_member_id, toMemberId: settlement.to_member_id, amount: settlement.amount }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to complete settlement');
      syncSettlementData(result.data);
    } catch {
      alert('一括清算ステータスの更新に失敗しました');
    } finally {
      setIsUpdatingSettlement(null);
    }
  };

  const handleUndoSettlement = async (settlement: CompletedSettlementTransfer) => {
    if (!window.confirm('この清算済み履歴を取り消しますか？')) return;
    const key = settlementKey(settlement.from_member_id, settlement.to_member_id, settlement.amount, settlement.completed_at);
    setIsUpdatingSettlement(key);

    try {
      const response = await fetch(`/api/trips/${id}/settlement`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromMemberId: settlement.from_member_id,
          toMemberId: settlement.to_member_id,
          amount: settlement.amount,
          completedAt: settlement.completed_at,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to undo settlement');
      syncSettlementData(result.data);
    } catch {
      alert('清算履歴の取り消しに失敗しました');
    } finally {
      setIsUpdatingSettlement(null);
    }
  };

  if (isLoading) return <div className={styles.container}><div className={styles.loading}>⏳ 計算中...</div></div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href={`/trips/${id}`}>← 戻る</Link>
        <h1>🧾 清算確認</h1>
        <div />
      </div>

      <TripNav tripId={typeof id === 'string' ? id : ''} />

      <Card className={styles.statusCard}>
        {isSettled ? (
          <div className={styles.settledStatus}><span className={styles.emoji}>✅</span><h2>全員清算済み！</h2><p>未清算はありません</p></div>
        ) : (
          <div className={styles.unSettledStatus}><span className={styles.emoji}>🔄</span><h2>清算が必要です</h2><p>下記の送金を実行してください</p></div>
        )}
      </Card>

      <Card className={styles.summaryCard}>
        <h3>未清算サマリー</h3>
        <div className={styles.summaryGrid}>
          <div className={styles.stat}><p className={styles.label}>未清算ペア</p><p className={styles.value}>{unsettledSummary.count}</p></div>
          <div className={styles.stat}><p className={styles.label}>未清算合計</p><p className={styles.value}>¥{unsettledSummary.amount.toLocaleString()}</p></div>
          <div className={styles.stat}><p className={styles.label}>総支出</p><p className={styles.value}>¥{totalAmount.toLocaleString()}</p></div>
        </div>
      </Card>

      {!isSettled && (
        <section className={styles.settlementsSection}>
          <div className={styles.sectionTitleRow}><h2>未清算一覧</h2><span className={styles.sectionMeta}>{settlements.length}件</span></div>
          <div className={styles.settlementsList}>
            <div className={styles.settlementsHeader}><span>支払う人</span><span>受け取る人</span><span>金額</span><span>操作</span></div>
            {settlements.map((settlement, idx) => (
              <Card key={idx} className={styles.settlementCard}>
                <div className={styles.settlementGrid}>
                  <div className={styles.settlementCell}><span className={styles.cellLabel}>支払う人</span><div className={styles.memberInline}><div className={styles.avatar}>{settlement.from_name.charAt(0).toUpperCase()}</div><p>{settlement.from_name}</p></div></div>
                  <div className={styles.settlementCell}><span className={styles.cellLabel}>受け取る人</span><div className={styles.memberInline}><div className={styles.avatar}>{settlement.to_name.charAt(0).toUpperCase()}</div><p>{settlement.to_name}</p></div></div>
                  <div className={styles.settlementCell}><span className={styles.cellLabel}>金額</span><p className={styles.amountValue}>¥{settlement.amount.toLocaleString()}</p></div>
                  <div className={styles.settlementCell}>
                    <span className={styles.cellLabel}>操作</span>
                    {settlement.history && settlement.history.length > 0 && (
                      <div className={styles.historyBlock}><p className={styles.historyTitle}>過去の清算履歴</p><ul className={styles.historyList}>{settlement.history.map((item, historyIdx) => <li key={historyIdx}>¥{item.amount.toLocaleString()}{item.completed_at ? ` / ${new Date(item.completed_at).toLocaleString('ja-JP')}` : ''}</li>)}</ul></div>
                    )}
                    <div className={styles.rowActions}>
                      <Button variant="secondary" size="sm" onClick={() => navigator.clipboard.writeText(`${settlement.from_name} → ${settlement.to_name}: ¥${settlement.amount.toLocaleString()}`)}>📋 コピー</Button>
                      <Button variant="primary" size="sm" onClick={() => handleMarkBulkSettlementComplete(settlement)} disabled={isUpdatingSettlement === settlementKey(settlement.from_member_id, settlement.to_member_id, settlement.amount)}>
                        {isUpdatingSettlement === settlementKey(settlement.from_member_id, settlement.to_member_id, settlement.amount) ? '更新中...' : '清算済みにする'}
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section className={styles.settlementsSection}>
        <div className={styles.sectionTitleRow}><h2>清算履歴</h2><span className={styles.sectionMeta}>{completedSettlements.length}件</span></div>
        {completedSettlements.length === 0 ? (
          <p className={styles.emptyState}>まだ清算済み履歴はありません</p>
        ) : (
          <div className={styles.settlementsList}>
            {completedSettlements.map((settlement, idx) => {
              const rowKey = settlementKey(settlement.from_member_id, settlement.to_member_id, settlement.amount, settlement.completed_at);
              return (
                <Card key={`${rowKey}-${idx}`} className={styles.historyCard}>
                  <div className={styles.historyRow}>
                    <div><p className={styles.historyTitle}>{settlement.from_name} → {settlement.to_name}</p><p className={styles.historyMeta}>¥{settlement.amount.toLocaleString()} ・ {settlement.completed_at ? new Date(settlement.completed_at).toLocaleString('ja-JP') : '日時不明'}</p></div>
                    <Button variant="secondary" size="sm" onClick={() => handleUndoSettlement(settlement)} disabled={isUpdatingSettlement === rowKey}>{isUpdatingSettlement === rowKey ? '更新中...' : '取り消す'}</Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section className={styles.balancesSection}>
        <div className={styles.sectionTitleRow}><h2>各自の負担内訳</h2><span className={styles.sectionMeta}>{Object.keys(memberBalances).length}人</span></div>
        <div className={styles.balancesList}>
          <div className={styles.balancesHeader}><span>メンバー</span><span>支払額</span><span>負担額</span><span>差額</span></div>
          {Object.entries(memberBalances).map(([memberId, balance]) => {
            const isOwing = balance.balance < -0.01;
            const isOwed = balance.balance > 0.01;
            return (
              <Card key={memberId} className={styles.balanceCard}>
                <div className={styles.balanceGrid}>
                  <div className={styles.balanceCell}><span className={styles.cellLabel}>メンバー</span><p className={styles.memberName}>{getMemberName(memberId)}</p></div>
                  <div className={styles.balanceCell}><span className={styles.cellLabel}>支払額</span><p>¥{balance.paid.toLocaleString()}</p></div>
                  <div className={styles.balanceCell}><span className={styles.cellLabel}>負担額</span><p>¥{balance.fairShare.toLocaleString()}</p></div>
                  <div className={styles.balanceCell}><span className={styles.cellLabel}>差額</span>{isOwing ? <p className={styles.owing}>¥{Math.abs(balance.balance).toLocaleString()} 不足</p> : isOwed ? <p className={styles.owed}>¥{balance.balance.toLocaleString()} 返金予定</p> : <p className={styles.balanced}>清算済み</p>}</div>
                </div>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
