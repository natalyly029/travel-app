import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Button, Card, TripNav } from '@/components';
import { Trip, TripDocument } from '@/types';
import { DOCUMENT_CATEGORIES, DOCUMENT_CATEGORY_LABELS, type DocumentCategory } from '@/lib/tripUtils';
import styles from '@/styles/Documents.module.css';

const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;
const DOCUMENT_BUCKET = 'trip-documents';

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
  const [category, setCategory] = useState<DocumentCategory>('other');
  const [isPinned, setIsPinned] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      try {
        const [tripRes, docsRes] = await Promise.all([fetch(`/api/trips/${id}`), fetch(`/api/trips/${id}/documents`)]);
        const tripData = await parseApiResponse(tripRes);
        const docsData = await parseApiResponse(docsRes);
        setTrip(tripData.data.trip);
        setDocuments(docsData.data || []);
      } catch {
        setError('資料の読み込みに失敗しました');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const sortedDocuments = useMemo(() => [...documents].sort((a, b) => Number(Boolean(b.is_pinned)) - Number(Boolean(a.is_pinned))), [documents]);

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
      const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${id}/${Date.now()}-${safeFileName}`;
      const { supabase } = await import('@/lib/supabase');
      const { error: uploadError } = await supabase.storage.from(DOCUMENT_BUCKET).upload(filePath, file, { contentType: file.type, upsert: false });
      if (uploadError) throw new Error(`Storage upload error: ${uploadError.message}`);

      const response = await fetch(`/api/trips/${id}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, filePath, fileName: file.name, fileMimeType: file.type, fileSize: file.size, category, is_pinned: isPinned }),
      });
      const result = await parseApiResponse(response);
      if (!response.ok) throw new Error(result.error || 'Failed to upload document');
      setDocuments((current) => [...result.data, ...current]);
      setTitle('');
      setFile(null);
      setCategory('other');
      setIsPinned(false);
      setIsAdding(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '資料のアップロードに失敗しました');
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('この資料を削除しますか？')) return;
    try {
      const response = await fetch(`/api/trips/${id}/documents`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ documentId }) });
      if (!response.ok) throw new Error('Failed to delete document');
      setDocuments((current) => current.filter((document) => document.id !== documentId));
    } catch {
      alert('資料の削除に失敗しました');
    }
  };

  const handleTogglePin = async (document: TripDocument) => {
    try {
      const response = await fetch(`/api/trips/${id}/documents`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: document.id, is_pinned: !document.is_pinned }),
      });
      const result = await parseApiResponse(response);
      if (!response.ok) throw new Error(result.error || 'Failed to update document');
      setDocuments((current) => current.map((item) => (item.id === document.id ? result.data[0] : item)));
    } catch {
      alert('ピン留めの更新に失敗しました');
    }
  };

  const handleCategoryChange = async (document: TripDocument, nextCategory: DocumentCategory) => {
    try {
      const response = await fetch(`/api/trips/${id}/documents`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: document.id, category: nextCategory }),
      });
      const result = await parseApiResponse(response);
      if (!response.ok) throw new Error(result.error || 'Failed to update document');
      setDocuments((current) => current.map((item) => (item.id === document.id ? result.data[0] : item)));
    } catch {
      alert('カテゴリ更新に失敗しました');
    }
  };

  if (isLoading) return <div className={styles.container}><div className={styles.loading}>⏳ 読み込み中...</div></div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}><Link href={`/trips/${id}`}>← 戻る</Link><h1>📎 資料</h1><div /></div>

      <TripNav tripId={typeof id === 'string' ? id : ''} />

      <section className={styles.topCardSection}>
        <Card className={styles.topCard}>
          <div><p className={styles.eyebrow}>共有資料</p><h2>{trip?.title}</h2><p className={styles.meta}>{documents.length}件の資料 / ピン留め {documents.filter((item) => item.is_pinned).length}件</p></div>
          {!isAdding && <Button variant="primary" onClick={() => setIsAdding(true)}>+ 資料を追加</Button>}
        </Card>
      </section>

      <section className={styles.documentsSection}>
        {error && <div className={styles.errorMessage}>{error}</div>}

        {isAdding && (
          <div className={styles.uploadSection}>
            <div className={styles.sectionHeader}><h3>アップロード資料</h3><p>旅に必要な資料を追加します</p></div>
            <Card className={styles.formCard}>
              <form onSubmit={handleUpload} className={styles.form}>
                <div className={styles.formGroup}><label>タイトル *</label><input value={title} onChange={(e) => setTitle(e.target.value)} className={styles.input} placeholder="例: e-ticket / ホテル予約表" required /></div>
                <div className={styles.formGroup}><label>カテゴリ</label><select value={category} onChange={(e) => setCategory(e.target.value as DocumentCategory)} className={styles.input}>{DOCUMENT_CATEGORIES.map((item) => <option key={item} value={item}>{DOCUMENT_CATEGORY_LABELS[item]}</option>)}</select></div>
                <div className={styles.formGroup}><label className={styles.pinOption}><input type="checkbox" checked={isPinned} onChange={(e) => setIsPinned(e.target.checked)} /> <span>重要資料としてピン留めする</span></label></div>
                <div className={styles.formGroup}><label>ファイル *</label><input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" onChange={(e) => setFile(e.target.files?.[0] || null)} className={styles.input} required /><p className={styles.hint}>PDF / PNG / JPG / WEBP、10MB以下</p></div>
                <div className={styles.formActions}><Button type="submit" variant="primary">アップロード</Button><Button type="button" variant="secondary" onClick={() => { setIsAdding(false); setFile(null); setTitle(''); setCategory('other'); setIsPinned(false); }}>キャンセル</Button></div>
              </form>
            </Card>
          </div>
        )}

        <div className={styles.listSection}>
          <div className={styles.sectionHeader}><h3>アップロード済み資料</h3><p>{documents.length}件</p></div>
          {sortedDocuments.length === 0 ? (
            <p className={styles.empty}>まだ資料がありません</p>
          ) : (
            <div className={styles.documentsList}>
              {sortedDocuments.map((document) => (
                <Card key={document.id} className={`${styles.documentCard} ${document.is_pinned ? styles.documentCardPinned : ''}`}>
                  <div className={styles.documentMain}>
                    <div>
                      <div className={styles.documentTitleRow}>
                        <h3>{document.title}</h3>
                        {document.is_pinned && <span className={styles.pinnedBadge}>PINNED</span>}
                        <span className={styles.categoryBadge}>{DOCUMENT_CATEGORY_LABELS[(document.category as DocumentCategory) || 'other']}</span>
                      </div>
                      <p className={styles.documentMeta}>{document.file_name}</p>
                    </div>
                    <div className={styles.actions}>
                      <select value={(document.category as DocumentCategory) || 'other'} onChange={(e) => handleCategoryChange(document, e.target.value as DocumentCategory)} className={styles.inlineSelect}>{DOCUMENT_CATEGORIES.map((item) => <option key={item} value={item}>{DOCUMENT_CATEGORY_LABELS[item]}</option>)}</select>
                      <Button variant="secondary" size="sm" onClick={() => handleTogglePin(document)}>{document.is_pinned ? 'ピン解除' : 'ピン留め'}</Button>
                      {document.file_url && <a href={document.file_url} target="_blank" rel="noreferrer" className={styles.openLink}>開く</a>}
                      <Button variant="secondary" size="sm" onClick={() => handleDelete(document.id)}>削除</Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
