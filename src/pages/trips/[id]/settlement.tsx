import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Button, Card } from '@/components';
import { Settlement, Member, Payment } from '@/types';
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
  const [payments, setPayments] = useState<Payment[]>([]);
  const [activeTab, setActiveTab] = useState<'bulk' | 'individual'>('bulk');
  const [totalAmount, setTotalAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const memberNameMap = useMemo(
    () => new Map(members.map((member) => [member.id, member.name])),
    [members]
  );
  const isSettled = settlements.length === 0;
  const getMemberName = (memberId: string) => memberNameMap.get(memberId) || memberId;

  useEffect(() => {
    if (!id) return;

    const fetchSettlement = async () => {
      try {
        const [settlementResponse, tripResponse, paymentsResponse] = await Promise.all([
          fetch(`/api/trips/${id}/settlement`),
          fetch(`/api/trips/${id}`),
          fetch(`/api/trips/${id}/payments`),
        ]);

        const result = await settlementResponse.json();
        const tripResult = await tripResponse.json();
        const paymentsResult = await paymentsResponse.json();

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
        setPayments(paymentsResult.data || []);
      } catch (err) {
        // Settlement calculation error - show settled state
        console.error('Settlement error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettlement();
  }, [id]);

  const refreshSettlementData = async () => {
    const settlementResponse = await fetch(`/api/trips/${id}/settlement`);
    const settlementResult = await settlementResponse.json();
    if (settlementResponse.ok) {
      setSettlements(settlementResult.data?.settlements || []);
      setMemberBalances(settlementResult.data?.memberBalances || {});
      setTotalAmount(settlementResult.data?.totalAmount || 0);
    }
  };

  const handleToggleAllocationSettled = async (paymentId: string, memberId: string, isSettled: boolean) => {
    try {
      const response = await fetch(`/api/trips/${id}/payments`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, memberId, isSettled }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to update settlement status');

      setPayments((current) =>
        current.map((payment) => (payment.id === paymentId ? result.data[0] : payment))
      );

      await refreshSettlementData();
    } catch (err) {
      alert('清算ステータスの更新に失敗しました');
    }
  };

  const handleMarkBulkSettlementComplete = async (fromMemberId: string, toMemberId: string) => {
    const targetAllocations = payments.flatMap((payment) =>
      payment.payer_id !== toMemberId
        ? []
        : (payment.allocation_statuses || [])
            .filter((allocation) => allocation.member_id === fromMemberId && !allocation.is_settled)
            .map((allocation) => ({ paymentId: payment.id, memberId: allocation.member_id }))
    );

    const targetSummary = payments
      .filter((payment) => payment.payer_id === toMemberId)
      .flatMap((payment) => (payment.allocation_statuses || []).filter((allocation) => allocation.member_id === fromMemberId));

    if (targetAllocations.length === 0) {
      const hasAnyRelation = targetSummary.length > 0;
      alert(hasAnyRelation ? 'このメンバー間の未清算項目はありません' : 'このメンバー間に対応する個別清算項目がありません');
      return;
    }

    try {
      for (const allocation of targetAllocations) {
        const response = await fetch(`/api/trips/${id}/payments`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentId: allocation.paymentId,
            memberId: allocation.memberId,
            isSettled: true,
          }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to mark settlement complete');
        setPayments((current) => current.map((payment) => (payment.id === allocation.paymentId ? result.data[0] : payment)));
      }

      await refreshSettlementData();
    } catch (err) {
      alert('一括清算ステータスの更新に失敗しました');
    }
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>⏳ 計算中...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <Link href={`/trips/${id}`}>← 戻る</Link>
        <h1>🧾 清算確認</h1>
        <div />
      </div>

      <div className={styles.tabBar}>
        <button type="button" className={`${styles.tabButton} ${activeTab === 'bulk' ? styles.tabButtonActive : ''}`} onClick={() => setActiveTab('bulk')}>一括清算</button>
        <button type="button" className={`${styles.tabButton} ${activeTab === 'individual' ? styles.tabButtonActive : ''}`} onClick={() => setActiveTab('individual')}>個別清算</button>
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
      {activeTab === 'bulk' && !isSettled && (
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
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleMarkBulkSettlementComplete(settlement.from_member_id, settlement.to_member_id)}
                      >
                        清算済みにする
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'individual' && (
        <section className={styles.individualSection}>
          <div className={styles.sectionTitleRow}>
            <h2>個別清算</h2>
            <span className={styles.sectionMeta}>{payments.length}件</span>
          </div>
          <div className={styles.individualList}>
            {payments.map((payment) => (
              <Card key={payment.id} className={styles.individualCard}>
                <div className={styles.individualHeader}>
                  <div>
                    <h3>{payment.description || '支払い'}</h3>
                    <p className={styles.individualMeta}>
                      立替: {getMemberName(payment.payer_id)} / ¥{payment.amount.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className={styles.individualAllocations}>
                  {payment.allocation_statuses?.map((allocation) => (
                    <label key={`${payment.id}-${allocation.member_id}`} className={styles.individualAllocationItem}>
                      <input
                        type="checkbox"
                        checked={allocation.is_settled}
                        onChange={(e) => handleToggleAllocationSettled(payment.id, allocation.member_id, e.target.checked)}
                      />
                      <span>
                        {getMemberName(allocation.member_id)}
                        {allocation.is_settled ? '（清算済み）' : '（未清算）'}
                      </span>
                    </label>
                  ))}
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

    </div>
  );
}
