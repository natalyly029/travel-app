# Supabase スキーマ修正（UUID エラー対応）

エラー: `invalid input syntax for type uuid: "anonymous"`

**原因**: members テーブルの `user_id` カラムが UUID 型だが、NULL 値を受け入れていない

**解決**: スキーマを修正して柔軟に対応

---

## 実行手順

### Supabase Studio → SQL Editor で実行

```sql
-- Step 1: members テーブルの user_id を nullable に
ALTER TABLE members ALTER COLUMN user_id DROP NOT NULL;

-- Step 2: trips テーブルの created_by をテキストに
ALTER TABLE trips ALTER COLUMN created_by TYPE text;
ALTER TABLE trips ALTER COLUMN created_by SET DEFAULT 'anonymous';

-- Step 3: スキーマを確認
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name IN ('trips', 'members')
  AND column_name IN ('user_id', 'created_by')
ORDER BY table_name, ordinal_position;
```

**実行** → 完了

---

## Vercel キャッシュクリア

```
https://vercel.com/dashboard
→ travel-manager-cyan
→ Deployments
→ 最新の「...」 → Redeploy
```

5分待機

---

## テスト

本番環境で再度試す:

```
https://travel-manager-cyan.vercel.app/trips/create
```

- タイトル入力
- 日程選択
- テンプレート選択
- 「旅を作成する」クリック

**✅ Trip Detail ページが表示されたら成功！**

---

修正完了したら報告してください！
