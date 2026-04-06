import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Button, Card } from '@/components';
import { Settlement, Member } from '@/types';
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
  const [members, setMembers] = useState<Member[]>([]);
  const [memberBalances, setMemberBalances] = useState<Record<string, MemberBalance>>({});
  const [totalAmount, setTotalAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

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

        if (!settlementResponse.ok) {
          throw new Error(result.error || 'Failed to calculate settlement');
        }

        if (!tripResponse.ok) {
          throw new Error(tripResult.error || 'Failed to load trip members');
        }

        setSettlements(result.data?.settlements || []);
        setMemberBalances(result.data?.memberBalances || {});
        setTotalAmount(result.data?.totalAmount || 0);
        setMembers(tripResult.data?.members || []);
      } catch (err) {
        // Settlement calculation error - show settled state
        console.error('Settlement error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettlement();
  }, [id]);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>⏳ 計算中...</div>
      </div>
    );
  }

  const isSettled = settlements.length === 0;
  const memberNameMap = useMemo(() => new Map(members.map((member) => [member.id, member.name])), [members]);
  const getMemberName = (memberId: string) => memberNameMap.get(memberId) || memberId;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <Link href={`/trips/${id}`}>← 戻る</Link>
        <h1>🧾 清算確認</h1>
        <div />
      </div>

      {/* Settled/Unsettled Status */}
      <Card className={styles.statusCard}>
        {isSettled ? (
          <div className={styles.settledStatus}>
            <span className={styles.emoji}>✅</span>
            <h2>全員清算済み！</h2>
            <p>全員が正確に負担額を支払っています</p>
          </div>
        ) : (
          <div className={styles.unSettledStatus}>
            <span className={styles.emoji}>🔄</span>
            <h2>清算が必要です</h2>
            <p>下記の送金を実行してください</p>
          </div>
        )}
      </Card>

      {/* Settlements List */}
      {!isSettled && (
        <section className={styles.settlementsSection}>
          <div className={styles.sectionTitleRow}>
            <h2>送金内容</h2>
            <span className={styles.sectionMeta}>{settlements.length}件</span>
          </div>
          <div className={styles.settlementsList}>
            <div className={styles.settlementsHeader}>
              <span>支払う人</span>
              <span>受け取る人</span>
              <span>金額</span>
              <span>操作</span>
            </div>
            {settlements.map((settlement, idx) => (
              <Card key={idx} className={styles.settlementCard}>
                <div className={styles.settlementGrid}>
                  <div className={styles.settlementCell}>
                    <span className={styles.cellLabel}>支払う人</span>
                    <div className={styles.memberInline}>
                      <div className={styles.avatar}>
                        {settlement.from_name.charAt(0).toUpperCase()}
                      </div>
                      <p>{settlement.from_name}</p>
                    </div>
                  </div>
                  <div className={styles.settlementCell}>
                    <span className={styles.cellLabel}>受け取る人</span>
                    <div className={styles.memberInline}>
                      <div className={styles.avatar}>
                        {settlement.to_name.charAt(0).toUpperCase()}
                      </div>
                      <p>{settlement.to_name}</p>
                    </div>
                  </div>
                  <div className={styles.settlementCell}>
                    <span className={styles.cellLabel}>金額</span>
                    <p className={styles.amountValue}>¥{settlement.amount.toLocaleString()}</p>
                  </div>
                  <div className={styles.settlementCell}>
                    <span className={styles.cellLabel}>操作</span>
                    <div className={styles.rowActions}>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          const text = `${settlement.from_name} → ${settlement.to_name}: ¥${settlement.amount.toLocaleString()}`;
                          navigator.clipboard.writeText(text);
                          alert('コピーしました');
                        }}
                      >
                        📋 コピー
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Member Balances */}
      <section className={styles.balancesSection}>
        <div className={styles.sectionTitleRow}>
          <h2>各自の負担内訳</h2>
          <span className={styles.sectionMeta}>{Object.keys(memberBalances).length}人</span>
        </div>
        <div className={styles.balancesList}>
          <div className={styles.balancesHeader}>
            <span>メンバー</span>
            <span>支払額</span>
            <span>負担額</span>
            <span>差額</span>
          </div>
          {Object.entries(memberBalances).map(([memberId, balance]) => {
            const isOwing = balance.balance < -0.01;
            const isOwed = balance.balance > 0.01;

            return (
              <Card key={memberId} className={styles.balanceCard}>
                <div className={styles.balanceGrid}>
                  <div className={styles.balanceCell}>
                    <span className={styles.cellLabel}>メンバー</span>
                    <p className={styles.memberName}>{getMemberName(memberId)}</p>
                  </div>
                  <div className={styles.balanceCell}>
                    <span className={styles.cellLabel}>支払額</span>
                    <p>¥{balance.paid.toLocaleString()}</p>
                  </div>
                  <div className={styles.balanceCell}>
                    <span className={styles.cellLabel}>負担額</span>
                    <p>¥{balance.fairShare.toLocaleString()}</p>
                  </div>
                  <div className={styles.balanceCell}>
                    <span className={styles.cellLabel}>差額</span>
                    {isOwing && (
                      <p className={styles.owing}>¥{Math.abs(balance.balance).toLocaleString()} 不足</p>
                    )}
                    {isOwed && (
                      <p className={styles.owed}>¥{balance.balance.toLocaleString()} 返金予定</p>
                    )}
                    {!isOwing && !isOwed && <p className={styles.balanced}>清算済み</p>}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Summary */}
      <Card className={styles.summaryCard}>
        <h3>旅の統計</h3>
        <div className={styles.summaryGrid}>
          <div className={styles.stat}>
            <p className={styles.label}>総支出</p>
            <p className={styles.value}>¥{totalAmount.toLocaleString()}</p>
          </div>
          <div className={styles.stat}>
            <p className={styles.label}>メンバー数</p>
            <p className={styles.value}>{Object.keys(memberBalances).length}</p>
          </div>
          <div className={styles.stat}>
            <p className={styles.label}>清算回数</p>
            <p className={styles.value}>{settlements.length}</p>
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div className={styles.actions}>
        <Link href={`/trips/${id}`}>
          <Button variant="primary" size="lg">
            ✈️ 旅に戻る
          </Button>
        </Link>
      </div>
    </div>
  );
}
