import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Button, Card } from '@/components';
import { Member, Payment } from '@/types';
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
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
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
        const membersRes = await fetch(`/api/trips/${id}/members`);
        const membersData = await membersRes.json();
        setMembers(membersData.data || []);
        if (membersData.data?.length > 0) {
          setFormData((prev) => ({
            ...prev,
            payer_id: membersData.data[0].id,
          }));
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

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.payer_id || !formData.amount) {
      alert('必須項目を入力してください');
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
          receiptBase64,
          receiptName: receiptFile?.name || null,
          receiptMimeType: receiptFile?.type || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add payment');
      }

      setPayments([...result.data, ...payments]);
      setFormData({
        payer_id: formData.payer_id,
        amount: '',
        description: '',
        payment_date: new Date().toISOString().split('T')[0],
      });
      setReceiptFile(null);
      setIsAddingPayment(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add payment');
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

      setPayments(payments.filter((p) => p.id !== paymentId));
    } catch (err) {
      alert('支払いの削除に失敗しました');
    }
  };

  const getMemberName = (memberId: string) => {
    return members.find((m) => m.id === memberId)?.name || '不明';
  };

  const totalAmount = payments.reduce(
    (sum, p) => sum + (typeof p.amount === 'number' ? p.amount : 0),
    0
  );

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

      <Card className={styles.summaryCard}>
        <div className={styles.summaryContent}>
          <h3>旅の総支出</h3>
          <p className={styles.totalAmount}>¥{totalAmount.toLocaleString()}</p>
          <span className={styles.itemCount}>{payments.length} 件の支払い</span>
        </div>
      </Card>

      <section className={styles.paymentsSection}>
        <div className={styles.sectionHeader}>
          <h2>支払い一覧</h2>
          {!isAddingPayment && (
            <Button
              variant="primary"
              onClick={() => setIsAddingPayment(true)}
              size="sm"
            >
              + 追加
            </Button>
          )}
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}

        {isAddingPayment && (
          <Card className={styles.formCard}>
            <form onSubmit={handleAddPayment} className={styles.form}>
              <div className={styles.formGroup}>
                <label>支払者 *</label>
                <select
                  value={formData.payer_id}
                  onChange={(e) =>
                    setFormData({ ...formData, payer_id: e.target.value })
                  }
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
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>領収書PDF（オプション / 3MB以下）</label>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                  className={styles.input}
                />
                <p className={styles.fileHint}>
                  PDFのみ添付できます。無料枠運用のため3MB以下に制限しています。
                </p>
                {receiptFile && (
                  <p className={styles.fileMeta}>
                    添付予定: {receiptFile.name} ({(receiptFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>

              <div className={styles.formActions}>
                <Button type="submit" variant="primary">
                  追加する
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setIsAddingPayment(false);
                    setReceiptFile(null);
                  }}
                >
                  キャンセル
                </Button>
              </div>
            </form>
          </Card>
        )}

        {payments.length === 0 ? (
          <p className={styles.empty}>支払い記録がありません</p>
        ) : (
          <div className={styles.paymentsList}>
            {payments.map((payment) => (
              <Card key={payment.id} className={styles.paymentCard}>
                <div className={styles.paymentHeader}>
                  <h4>{getMemberName(payment.payer_id)}</h4>
                  <span className={styles.amount}>
                    ¥{(typeof payment.amount === 'number' ? payment.amount : 0).toLocaleString()}
                  </span>
                </div>
                <div className={styles.paymentDetails}>
                  <p className={styles.date}>
                    📅 {new Date(payment.payment_date).toLocaleDateString('ja-JP')}
                  </p>
                  {payment.description && (
                    <p className={styles.description}>{payment.description}</p>
                  )}
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
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleDeletePayment(payment.id)}
                  className={styles.deleteButton}
                >
                  削除
                </Button>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
