# Payment Receipts Setup

無料枠運用を前提に、支払いに PDF 領収書を1件だけ添付する設定です。

## 方針

- 添付は **PDF のみ**
- 1支払いにつき **1ファイル**
- サイズ上限は **3MB**
- 保存先 bucket は `payment-receipts`
- payment 削除時は Storage 側の PDF も削除

## 1. payments テーブルに列追加

```sql
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS receipt_path TEXT,
  ADD COLUMN IF NOT EXISTS receipt_name TEXT,
  ADD COLUMN IF NOT EXISTS receipt_size INTEGER,
  ADD COLUMN IF NOT EXISTS receipt_mime_type TEXT;
```

## 2. Supabase Storage bucket を作成

Bucket name:

```text
payment-receipts
```

想定は公開 bucket です。アプリでは `getPublicUrl()` で公開URLを生成しています。

## 3. 必要な環境変数

サーバー側で Storage に upload / delete するため、以下が必要です。

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## 4. 無料枠向け運用ルール

- スマホスキャン時は白黒 / 低解像度を推奨
- 3MBを超える PDF は事前圧縮
- 不要な支払いを削除すると PDF も削除される
- レシート/領収書専用として使う

## 5. 現在の実装仕様

- フロントは base64 で API に送信
- API が Supabase Storage に保存
- 支払い一覧で PDF リンク表示
- `application/pdf` 以外は拒否
- 3MB超は拒否

将来的に容量が増えたら、以下を検討:
- 2MB制限へ引き下げ
- 領収書画像 → PDF 変換前提に統一
- 非公開 bucket + signed URL 運用へ変更
