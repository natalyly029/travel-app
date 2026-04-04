import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { Button, Card } from '@/components';
import styles from '@/styles/CreateTrip.module.css';

const TEMPLATES = [
  {
    id: 'postcard',
    name: 'ビンテージ',
    emoji: '📮',
    description: 'ロマンチックな旅',
  },
  {
    id: 'brutalist',
    name: 'シンプル',
    emoji: '⬛',
    description: 'ミニマルで洗練',
  },
  {
    id: 'soft',
    name: 'ふんわり',
    emoji: '☁️',
    description: 'フレンドリーで優しい',
  },
  {
    id: 'minimalist',
    name: '和テイスト',
    emoji: '🍃',
    description: '静寂で清廉',
  },
  {
    id: 'maximalist',
    name: 'ポップ',
    emoji: '🎨',
    description: 'カラフルで楽しい',
  },
];

export default function CreateTrip() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('soft');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          start_date: startDate,
          end_date: endDate,
          template: selectedTemplate,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create trip');
      }

      // Redirect to trip detail page
      router.push(`/trips/${result.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = title && startDate && endDate && startDate <= endDate;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>🗺️ 新しい旅を計画しよう</h1>
        <p>基本情報から始めましょう</p>
      </div>

      <div className={styles.formWrapper}>
        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Title Input */}
          <div className={styles.formGroup}>
            <label htmlFor="title">旅のタイトル *</label>
            <input
              id="title"
              type="text"
              placeholder="例: 京都ぶらり旅 🏯"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={styles.input}
              required
            />
          </div>

          {/* Description Input */}
          <div className={styles.formGroup}>
            <label htmlFor="description">説明（オプション）</label>
            <textarea
              id="description"
              placeholder="旅の概要や目的を記入"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={styles.textarea}
              rows={3}
            />
          </div>

          {/* Date Range */}
          <div className={styles.dateGroup}>
            <div className={styles.formGroup}>
              <label htmlFor="startDate">出発日 *</label>
              <input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={styles.input}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="endDate">帰着日 *</label>
              <input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={styles.input}
                required
              />
            </div>
          </div>

          {/* Template Selection */}
          <div className={styles.formGroup}>
            <label>デザインテンプレート *</label>
            <div className={styles.templateGrid}>
              {TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.id}
                  type="button"
                  className={`${styles.templateCard} ${
                    selectedTemplate === tmpl.id ? styles.selected : ''
                  }`}
                  onClick={() => setSelectedTemplate(tmpl.id)}
                  aria-pressed={selectedTemplate === tmpl.id}
                >
                  <div className={styles.templateEmoji}>{tmpl.emoji}</div>
                  <h4>{tmpl.name}</h4>
                  <p>{tmpl.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && <div className={styles.errorMessage}>{error}</div>}

          {/* Submit Button */}
          <div className={styles.actions}>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={!isFormValid || isLoading}
              className={styles.submitButton}
            >
              {isLoading ? '作成中...' : '旅を作成する ✈️'}
            </Button>
          </div>
        </form>
      </div>

      {/* Tips */}
      <div className={styles.tips}>
        <Card>
          <h3>💡 Tips</h3>
          <ul>
            <li>後から詳細を追加・編集できます</li>
            <li>テンプレートはいつでも変更可能</li>
            <li>URLを共有してメンバーを招待できます</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
