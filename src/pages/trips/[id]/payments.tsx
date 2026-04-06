import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Button, Card, TripNav } from '@/components';
import { Member, Payment } from '@/types';
import { QUICK_PAYMENT_CATEGORIES } from '@/lib/tripUtils';
import styles from '@/styles/Payments.module.css';

const MAX_RECEIPT_SIZE_BYTES = 3 * 1024 * 1024;

async function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Failed to read receipt file'));
        return;
      }

      const [, base64 = ''] = result.split(',');
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Failed to read receipt file'));
    reader.readAsDataURL(file);
  });
}

export default function PaymentsPage() {
  const router = useRouter();
  const { id } = router.query;

  const [members, setMembers] = useState<Member[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<string>('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');
  const [payerFilter, setPayerFilter] = useState<string>('all');
  const [receiptFilter, setReceiptFilter] = useState<'all' | 'with-receipt' | 'without-receipt'>('all');
  const [formData, setFormData] = useState({
    payer_id: '',
    amount: '',
    description: '',
    payment_date: new Date().toISOString().split('T')[0],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        const tripRes = await fetch(`/api/trips/${id}`);
        const tripData = await tripRes.json();
        const fetchedMembers = tripData.data.members || [];
        setMembers(fetchedMembers);
        if (fetchedMembers.length > 0) {
          setFormData((prev) => ({
            ...prev,
            payer_id: fetchedMembers[0].id,
          }));
          setSelectedMemberIds(fetchedMembers.map((member: Member) => member.id));
        }

        const paymentsRes = await fetch(`/api/trips/${id}/payments`);
        const paymentsData = await paymentsRes.json();
        setPayments(paymentsData.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const resetForm = () => {
    setFormData({
      payer_id: members[0]?.id || '',
      amount: '',
      description: '',
      payment_date: new Date().toISOString().split('T')[0],
    });
    setReceiptFile(null);
    setSelectedMemberIds(members[0]?.id ? [members[0].id] : []);
    setEditingPaymentId('');
  };

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMemberIds((current) =>
      current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId]
    );
  };

  const handlePayerChange = (payerId: string) => {
    setFormData({ ...formData, payer_id: payerId });
    setSelectedMemberIds((current) => {
      if (current.includes(payerId)) return current;
      return [...current, payerId];
    });
  };

  const handleSelectAllMembers = () => {
    setSelectedMemberIds(members.map((member) => member.id));
  };

  const handleSplitWithEveryone = () => {
    handleSelectAllMembers();
  };

  const handleClearMemberSelection = () => {
    setSelectedMemberIds([]);
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.payer_id || !formData.amount) {
      alert('必須項目を入力してください');
      return;
    }

    if (selectedMemberIds.length === 0) {
      setError('請求対象メンバーを1人以上選択してください');
      return;
    }

    if (receiptFile) {
      if (receiptFile.type !== 'application/pdf') {
        setError('添付できるのはPDFのみです');
        return;
      }

      if (receiptFile.size > MAX_RECEIPT_SIZE_BYTES) {
        setError('PDFは3MB以下にしてください');
        return;
      }
    }

    try {
      const receiptBase64 = receiptFile ? await fileToBase64(receiptFile) : null;

      const response = await fetch(`/api/trips/${id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          allocated_member_ids: selectedMemberIds,
          receiptBase64,
          receiptName: receiptFile?.name || null,
          receiptMimeType: receiptFile?.type || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add payment');
      }

      setPayments((current) => [...result.data, ...current]);
      const nextPayerId = formData.payer_id || members[0]?.id || '';
      setReceiptFile(null);
      setFormData({
        payer_id: nextPayerId,
        amount: '',
        description: '',
        payment_date: new Date().toISOString().split('T')[0],
      });
      setSelectedMemberIds(members.map((member) => member.id));
      setIsAddingPayment(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add payment');
    }
  };

  const handleStartEdit = (payment: Payment) => {
    setIsAddingPayment(false);
    setEditingPaymentId(payment.id);
    setReceiptFile(null);
    setFormData({
      payer_id: payment.payer_id,
      amount: String(payment.amount),
      description: payment.description || '',
      payment_date: payment.payment_date,
    });
    setSelectedMemberIds(payment.allocated_member_ids || []);
    setError('');
  };

  const handleUpdatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!editingPaymentId) return;
    if (!formData.payer_id || !formData.amount) {
      setError('必須項目を入力してください');
      return;
    }
    if (selectedMemberIds.length === 0) {
      setError('請求対象メンバーを1人以上選択してください');
      return;
    }

    try {
      const response = await fetch(`/api/trips/${id}/payments`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: editingPaymentId,
          ...formData,
          allocated_member_ids: selectedMemberIds,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update payment');
      }

      setPayments((current) =>
        current.map((payment) =>
          payment.id === editingPaymentId ? result.data[0] : payment
        )
      );
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update payment');
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm('この支払いを削除しますか？')) return;

    try {
      const response = await fetch(`/api/trips/${id}/payments`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId }),
      });

      if (!response.ok) throw new Error('Failed to delete payment');

      setPayments((current) => current.filter((p) => p.id !== paymentId));
      if (editingPaymentId === paymentId) {
        resetForm();
      }
    } catch (err) {
      alert('支払いの削除に失敗しました');
    }
  };

  const memberNameMap = useMemo(() => {
    return new Map(members.map((member) => [member.id, member.name]));
  }, [members]);

  const getMemberName = (memberId: string) => memberNameMap.get(memberId) || '不明';

  const filteredPayments = useMemo(() => {
    return payments
      .filter((payment) => {
        if (payerFilter !== 'all' && payment.payer_id !== payerFilter) {
          return false;
        }

        if (receiptFilter === 'with-receipt' && !payment.receipt_url) {
          return false;
        }

        if (receiptFilter === 'without-receipt' && payment.receipt_url) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOrder === 'date-desc') {
          return b.payment_date.localeCompare(a.payment_date);
        }
        if (sortOrder === 'date-asc') {
          return a.payment_date.localeCompare(b.payment_date);
        }
        if (sortOrder === 'amount-desc') {
          return (b.amount || 0) - (a.amount || 0);
        }
        return (a.amount || 0) - (b.amount || 0);
      });
  }, [payments, payerFilter, receiptFilter, sortOrder]);

  const totalAmount = useMemo(
    () => payments.reduce((sum, p) => sum + (typeof p.amount === 'number' ? p.amount : 0), 0),
    [payments]
  );

  const receiptCount = useMemo(
    () => payments.filter((payment) => payment.receipt_url).length,
    [payments]
  );

  const memberSummaries = useMemo(() => {
    return members
      .map((member) => {
        let totalPaid = 0;
        let paidCount = 0;
        let involvedCount = 0;

        for (const payment of payments) {
          if (payment.payer_id === member.id) {
            totalPaid += typeof payment.amount === 'number' ? payment.amount : 0;
            paidCount += 1;
          }
          if (payment.allocated_member_ids?.includes(member.id)) {
            involvedCount += 1;
          }
        }

        return {
          member,
          totalPaid,
          paidCount,
          involvedCount,
        };
      })
      .sort((a, b) => b.totalPaid - a.totalPaid);
  }, [members, payments]);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>⏳ 読み込み中...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href={`/trips/${id}`}>← 戻る</Link>
        <h1>💰 支払い記録</h1>
        <div />
      </div>

      <TripNav tripId={typeof id === 'string' ? id : ''} />

      <Card className={styles.summaryCard}>
        <div className={styles.summaryContent}>
          <div>
            <h3>旅の総支出</h3>
            <p className={styles.totalAmount}>¥{totalAmount.toLocaleString()}</p>
          </div>
          <div className={styles.summaryStats}>
            <span className={styles.itemCount}>{payments.length} 件の支払い</span>
            <span className={styles.itemCount}>{receiptCount} 件のPDF添付</span>
          </div>
        </div>
      </Card>

      <section className={styles.paymentsSection}>
        <div className={styles.sectionHeader}>
          <h2>支払い一覧</h2>
          {!isAddingPayment && !editingPaymentId && (
            <Button
              variant="primary"
              onClick={() => {
                resetForm();
                setSelectedMemberIds(members.map((member) => member.id));
                setIsAddingPayment(true);
              }}
              size="sm"
            >
              + 追加
            </Button>
          )}
        </div>

        <div className={styles.memberSummaryGrid}>
          {memberSummaries.map(({ member, totalPaid, paidCount, involvedCount }) => (
            <Card key={member.id} className={styles.memberSummaryCard}>
              <div className={styles.memberSummaryHeader}>
                <h3>{member.name}</h3>
                <span className={styles.memberSummaryBadge}>{paidCount}件支払い</span>
              </div>
              <p className={styles.memberSummaryAmount}>¥{totalPaid.toLocaleString()}</p>
              <p className={styles.memberSummaryMeta}>請求対象に含まれた回数: {involvedCount}件</p>
            </Card>
          ))}
        </div>

        <Card className={styles.filterCard}>
          <div className={styles.filterGrid}>
            <div className={styles.formGroup}>
              <label>並び順</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc')}
                className={styles.select}
              >
                <option value="date-desc">日付が新しい順</option>
                <option value="date-asc">日付が古い順</option>
                <option value="amount-desc">金額が大きい順</option>
                <option value="amount-asc">金額が小さい順</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>支払者で絞り込み</label>
              <select
                value={payerFilter}
                onChange={(e) => setPayerFilter(e.target.value)}
                className={styles.select}
              >
                <option value="all">全員</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>PDF添付</label>
              <select
                value={receiptFilter}
                onChange={(e) => setReceiptFilter(e.target.value as 'all' | 'with-receipt' | 'without-receipt')}
                className={styles.select}
              >
                <option value="all">すべて</option>
                <option value="with-receipt">PDFあり</option>
                <option value="without-receipt">PDFなし</option>
              </select>
            </div>
          </div>
        </Card>

        {error && <div className={styles.errorMessage}>{error}</div>}

        {(isAddingPayment || !!editingPaymentId) && (
          <Card className={styles.formCard}>
            <form onSubmit={editingPaymentId ? handleUpdatePayment : handleAddPayment} className={styles.form}>
              <div className={styles.formHeaderRow}>
                <h3>{editingPaymentId ? '支払いを編集' : '支払いを追加'}</h3>
                <div className={styles.inlineActions}>
                  <Button type="button" variant="secondary" size="sm" onClick={handleSplitWithEveryone}>
                    全員で割る
                  </Button>
                  <Button type="button" variant="secondary" size="sm" onClick={handleSelectAllMembers}>
                    全員選択
                  </Button>
                  <Button type="button" variant="secondary" size="sm" onClick={handleClearMemberSelection}>
                    全解除
                  </Button>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>支払者 *</label>
                <select
                  value={formData.payer_id}
                  onChange={(e) => handlePayerChange(e.target.value)}
                  className={styles.select}
                  required
                >
                  <option value="">選択してください</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>請求対象メンバー *</label>
                <div className={styles.memberChecklist}>
                  {members.map((member) => (
                    <label key={member.id} className={styles.memberOption}>
                      <input
                        type="checkbox"
                        checked={selectedMemberIds.includes(member.id)}
                        onChange={() => toggleMemberSelection(member.id)}
                      />
                      <span>{member.name}</span>
                    </label>
                  ))}
                </div>
                <p className={styles.fileHint}>
                  支払者を変更すると、その人は自動で請求対象に含めます。
                </p>
              </div>

              <div className={styles.formGroup}>
                <label>金額（円） *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="例: 5000"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  className={styles.input}
                  required
                />
              </div>

              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>日付 *</label>
                  <input
                    type="date"
                    value={formData.payment_date}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        payment_date: e.target.value,
                      })
                    }
                    className={styles.input}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>説明（オプション）</label>
                  <input
                    type="text"
                    placeholder="例: 宿泊代"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        description: e.target.value,
                      })
                    }
                    className={styles.input}
                  />
                  <div className={styles.quickCategoryRow}>
                    {QUICK_PAYMENT_CATEGORIES.map((category) => (
                      <button
                        key={category}
                        type="button"
                        className={styles.quickCategoryButton}
                        onClick={() => setFormData({ ...formData, description: category })}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {!editingPaymentId && (
                <div className={styles.formGroup}>
                  <label>領収書PDF（オプション / 3MB以下）</label>
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                    className={styles.input}
                  />
                  <p className={styles.fileHint}>
                    PDFのみ添付できます。3MB以下にしてください。
                  </p>
                  {receiptFile && (
                    <p className={styles.fileMeta}>
                      添付予定: {receiptFile.name} ({(receiptFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>
              )}

              <div className={styles.formActions}>
                <Button type="submit" variant="primary">
                  {editingPaymentId ? '更新する' : '追加する'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setIsAddingPayment(false);
                    resetForm();
                  }}
                >
                  キャンセル
                </Button>
              </div>
            </form>
          </Card>
        )}

        {filteredPayments.length === 0 ? (
          <p className={styles.empty}>条件に一致する支払い記録がありません</p>
        ) : (
          <div className={styles.paymentsList}>
            <div className={styles.paymentsListHeader}>
              <span>支払者</span>
              <span>日付</span>
              <span>内容</span>
              <span>対象</span>
              <span>金額</span>
              <span>操作</span>
            </div>
            {filteredPayments.map((payment) => (
              <Card key={payment.id} className={styles.paymentCard}>
                <div className={styles.paymentGrid}>
                  <div className={styles.paymentCell}>
                    <span className={styles.cellLabel}>支払者</span>
                    <h4>{getMemberName(payment.payer_id)}</h4>
                  </div>
                  <div className={styles.paymentCell}>
                    <span className={styles.cellLabel}>日付</span>
                    <p className={styles.date}>{new Date(payment.payment_date).toLocaleDateString('ja-JP')}</p>
                  </div>
                  <div className={styles.paymentCell}>
                    <span className={styles.cellLabel}>内容</span>
                    <p className={styles.description}>{payment.description || '—'}</p>
                    {payment.receipt_url && (
                      <a
                        href={payment.receipt_url}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.receiptLink}
                      >
                        📄 {payment.receipt_name || '領収書PDFを開く'}
                      </a>
                    )}
                  </div>
                  <div className={styles.paymentCell}>
                    <span className={styles.cellLabel}>対象</span>
                    <p className={styles.billedMembers}>
                      {payment.allocated_member_ids && payment.allocated_member_ids.length > 0
                        ? `${payment.allocated_member_ids.length}人: ${payment.allocated_member_ids.map(getMemberName).join(' / ')}`
                        : '—'}
                    </p>
                  </div>
                  <div className={styles.paymentCell}>
                    <span className={styles.cellLabel}>金額</span>
                    <span className={styles.amount}>
                      ¥{(typeof payment.amount === 'number' ? payment.amount : 0).toLocaleString()}
                    </span>
                  </div>
                  <div className={styles.paymentCell}>
                    <span className={styles.cellLabel}>操作</span>
                    <div className={styles.cardActions}>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleStartEdit(payment)}
                        className={styles.actionButton}
                      >
                        編集
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleDeletePayment(payment.id)}
                        className={styles.actionButton}
                      >
                        削除
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
