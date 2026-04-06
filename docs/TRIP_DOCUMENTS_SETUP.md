# Trip Documents Setup

旅行の領収書以外の資料をアップロードするための設定です。

## 追加するもの

### 1. Supabase Storage bucket

Bucket name:

```text
trip-documents
```

推奨:
- public bucket: ON
- max file size: 10 MB
- allowed MIME types:
  - application/pdf
  - image/png
  - image/jpeg
  - image/webp
  - text/plain

### 2. テーブル作成

```sql
create table if not exists trip_documents (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  title text not null,
  file_path text not null,
  file_name text not null,
  file_size integer,
  file_mime_type text,
  created_at timestamp default now()
);
```

## 実装仕様

- 旅ごとに資料をアップロード可能
- 受け付ける形式:
  - PDF
  - PNG
  - JPG
  - WEBP
  - TXT
- サイズ上限: 10MB
- 一覧表示 / 開く / 削除に対応
