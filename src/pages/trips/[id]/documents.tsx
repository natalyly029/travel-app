import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Button, Card } from '@/components';
import { Trip, TripDocument } from '@/types';
import styles from '@/styles/Documents.module.css';

const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;

async function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') return reject(new Error('Failed to read file'));
      const [, base64 = ''] = result.split(',');
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

async function parseApiResponse(response: Response) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(text || 'Unexpected server response');
  }
}

export default function DocumentsPage() {
  const router = useRouter();
  const { id } = router.query;
  const [trip, setTrip] = useState<Trip | null>(null);
  const [documents, setDocuments] = useState<TripDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        const [tripRes, docsRes] = await Promise.all([
          fetch(`/api/trips/${id}`),
          fetch(`/api/trips/${id}/documents`),
        ]);
        const tripData = await parseApiResponse(tripRes);
        const docsData = await parseApiResponse(docsRes);
        setTrip(tripData.data.trip);
        setDocuments(docsData.data || []);
      } catch (err) {
        setError('資料の読み込みに失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!file || !title) {
      setError('タイトルとファイルを指定してください');
      return;
    }

    if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
      setError('ファイルは10MB以下にしてください');
      return;
    }

    try {
      const fileBase64 = await fileToBase64(file);
      const response = await fetch(`/api/trips/${id}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          fileBase64,
          fileName: file.name,
          fileMimeType: file.type,
        }),
      });
      const result = await parseApiResponse(response);
      if (!response.ok) throw new Error(result.error || 'Failed to upload document');
      setDocuments((current) => [...result.data, ...current]);
      setTitle('');
      setFile(null);
      setIsAdding(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '資料のアップロードに失敗しました');
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('この資料を削除しますか？')) return;

    try {
      const response = await fetch(`/api/trips/${id}/documents`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId }),
      });
      if (!response.ok) throw new Error('Failed to delete document');
      setDocuments((current) => current.filter((document) => document.id !== documentId));
    } catch (err) {
      alert('資料の削除に失敗しました');
    }
  };

  if (isLoading) {
    return <div className={styles.container}><div className={styles.loading}>⏳ 読み込み中...</div></div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href={`/trips/${id}`}>← 戻る</Link>
        <h1>📎 資料</h1>
        <div />
      </div>

      <section className={styles.topCardSection}>
        <Card className={styles.topCard}>
          <div>
            <p className={styles.eyebrow}>共有資料</p>
            <h2>{trip?.title}</h2>
            <p className={styles.meta}>{documents.length}件の資料</p>
          </div>
          {!isAdding && (
            <Button variant="primary" onClick={() => setIsAdding(true)}>+ 資料を追加</Button>
          )}
        </Card>
      </section>

      <section className={styles.documentsSection}>
        {error && <div className={styles.errorMessage}>{error}</div>}

        {isAdding && (
          <Card className={styles.formCard}>
            <form onSubmit={handleUpload} className={styles.form}>
              <div className={styles.formGroup}>
                <label>タイトル *</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} className={styles.input} placeholder="例: e-ticket / ホテル予約表" required />
              </div>
              <div className={styles.formGroup}>
                <label>ファイル *</label>
                <input type="file" accept="application/pdf,image/png,image/jpeg,image/webp,text/plain" onChange={(e) => setFile(e.target.files?.[0] || null)} className={styles.input} required />
                <p className={styles.hint}>PDF / PNG / JPG / WEBP / TXT、10MB以下</p>
              </div>
              <div className={styles.formActions}>
                <Button type="submit" variant="primary">アップロード</Button>
                <Button type="button" variant="secondary" onClick={() => { setIsAdding(false); setFile(null); setTitle(''); }}>キャンセル</Button>
              </div>
            </form>
          </Card>
        )}

        {documents.length === 0 ? (
          <p className={styles.empty}>まだ資料がありません</p>
        ) : (
          <div className={styles.documentsList}>
            {documents.map((document) => (
              <Card key={document.id} className={styles.documentCard}>
                <div className={styles.documentMain}>
                  <div>
                    <h3>{document.title}</h3>
                    <p className={styles.documentMeta}>{document.file_name}</p>
                  </div>
                  <div className={styles.actions}>
                    {document.file_url && (
                      <a href={document.file_url} target="_blank" rel="noreferrer" className={styles.openLink}>開く</a>
                    )}
                    <Button variant="secondary" size="sm" onClick={() => handleDelete(document.id)}>削除</Button>
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
