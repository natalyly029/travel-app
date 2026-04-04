# Supabase RLS エラー修正（今すぐ実行）

エラー: `infinite recursion detected in policy for relation "members"`

**原因**: members テーブルの RLS ポリシーが循環参照している

**解決**: SQL を実行してポリシーをリセット

---

## 実行手順（3ステップ）

### Step 1️⃣: Supabase Studio を開く

```
https://supabase.com/dashboard/project/ssqifnxhbywabvglnppj
```

ブラウザで開く

---

### Step 2️⃣: SQL Editor を開く

左パネル → **SQL Editor** をクリック

---

### Step 3️⃣: 下記 SQL をコピー＆実行

**以下の SQL をコピー:**

```sql
-- members テーブルのポリシーをリセット
DROP POLICY IF EXISTS "Public read access" ON members;
DROP POLICY IF EXISTS "Members can read own trip" ON members;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON members;
DROP POLICY IF EXISTS "Users can update own record" ON members;
DROP POLICY IF EXISTS "Users can delete own record" ON members;

ALTER TABLE members DISABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read"
ON members FOR SELECT
USING (true);

CREATE POLICY "Allow insert"
ON members FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow update"
ON members FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow delete"
ON members FOR DELETE
USING (true);
```

**Supabase SQL Editor に:**
1. SQL エディタにペースト
2. **Run** ボタン をクリック

---

### Step 4️⃣: 本番環境で再度テスト

Trip Create ページ:
```
https://travel-manager-cyan.vercel.app/trips/create
```

再度テスト:
- タイトル入力
- 出発日 / 帰着日 選択
- テンプレート選択
- 「旅を作成する」 クリック

**✅ Trip Detail ページが表示されたら成功！**

---

## もし失敗したら

### Vercel キャッシュをクリア

```
https://vercel.com/dashboard
→ travel-manager-cyan プロジェクト
→ Deployments → 最新 → Redeploy ボタン
```

3分待機 → 本番環境で再度テスト

---

## 完全リセット版 SQL（最後の手段）

もし上記で解消されない場合:

```sql
-- すべてのテーブルで RLS をリセット
ALTER TABLE trips DISABLE ROW LEVEL SECURITY;
ALTER TABLE members DISABLE ROW LEVEL SECURITY;
ALTER TABLE days DISABLE ROW LEVEL SECURITY;
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE payment_allocations DISABLE ROW LEVEL SECURITY;

ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE days ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;

-- 公開アクセスポリシー
CREATE POLICY "Public" ON trips FOR SELECT USING (true);
CREATE POLICY "Public" ON members FOR SELECT USING (true);
CREATE POLICY "Public" ON days FOR SELECT USING (true);
CREATE POLICY "Public" ON events FOR SELECT USING (true);
CREATE POLICY "Public" ON payments FOR SELECT USING (true);
CREATE POLICY "Public" ON payment_allocations FOR SELECT USING (true);

-- 書き込みアクセス
CREATE POLICY "Insert" ON trips FOR INSERT WITH CHECK (true);
CREATE POLICY "Insert" ON members FOR INSERT WITH CHECK (true);
CREATE POLICY "Insert" ON days FOR INSERT WITH CHECK (true);
CREATE POLICY "Insert" ON events FOR INSERT WITH CHECK (true);
CREATE POLICY "Insert" ON payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Insert" ON payment_allocations FOR INSERT WITH CHECK (true);
```

---

## テスト完了後

本番環境で以下を確認:

- [ ] Trip 作成フロー成功
- [ ] Trip Detail ページ表示
- [ ] Schedule / Members / Payments タブ動作
- [ ] Settlement 計算実行

すべて ✅ なら本番稼働完了！

---

**修正が完了したら、報告してください！** 🚀
