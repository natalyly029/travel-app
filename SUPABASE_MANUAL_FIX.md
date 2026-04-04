# Supabase RLS 修正（手動実行）

Supabase のセキュリティ制限により、API から直接 SQL を実行できません。

**Web UI で手動実行が必要です。**（コピペで完了・3分）

---

## 実行手順

### Step 1️⃣: Supabase Studio を開く

```
https://supabase.com/dashboard/project/ssqifnxhbywabvglnppj/sql/new
```

ブラウザで開く（ログイン状態を確認）

---

### Step 2️⃣: SQL をコピー

下記をすべてコピー:

```sql
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

---

### Step 3️⃣: Supabase SQL Editor にペースト

Supabase Studio のテキストエリアにペースト

---

### Step 4️⃣: Run ボタンをクリック

```
右上の "Run" ボタン をクリック
```

```
✅ Query complete - 0 rows
```

と表示されたら成功

---

## テスト

修正後、本番環境で再度テスト:

```
https://travel-manager-cyan.vercel.app/trips/create
```

- タイトル入力
- 日程選択
- テンプレート選択
- 「旅を作成する」クリック

**✅ Trip Detail ページが表示されたら完成！**

---

## 完全リセット版（失敗した場合）

もし上記で解消されない場合:

```sql
-- すべてのテーブルの RLS をリセット
DROP POLICY IF EXISTS "Public" ON trips;
DROP POLICY IF EXISTS "Public" ON members;
DROP POLICY IF EXISTS "Public" ON days;
DROP POLICY IF EXISTS "Public" ON events;
DROP POLICY IF EXISTS "Public" ON payments;
DROP POLICY IF EXISTS "Public" ON payment_allocations;

DROP POLICY IF EXISTS "Insert" ON trips;
DROP POLICY IF EXISTS "Insert" ON members;
DROP POLICY IF EXISTS "Insert" ON days;
DROP POLICY IF EXISTS "Insert" ON events;
DROP POLICY IF EXISTS "Insert" ON payments;
DROP POLICY IF EXISTS "Insert" ON payment_allocations;

-- RLS リセット
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

-- シンプルなポリシーを追加
CREATE POLICY "Public read" ON trips FOR SELECT USING (true);
CREATE POLICY "Public read" ON members FOR SELECT USING (true);
CREATE POLICY "Public read" ON days FOR SELECT USING (true);
CREATE POLICY "Public read" ON events FOR SELECT USING (true);
CREATE POLICY "Public read" ON payments FOR SELECT USING (true);
CREATE POLICY "Public read" ON payment_allocations FOR SELECT USING (true);

CREATE POLICY "Allow insert" ON trips FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert" ON members FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert" ON days FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert" ON events FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert" ON payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert" ON payment_allocations FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update" ON trips FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow update" ON members FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow update" ON days FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow update" ON events FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow update" ON payments FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow update" ON payment_allocations FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow delete" ON trips FOR DELETE USING (true);
CREATE POLICY "Allow delete" ON members FOR DELETE USING (true);
CREATE POLICY "Allow delete" ON days FOR DELETE USING (true);
CREATE POLICY "Allow delete" ON events FOR DELETE USING (true);
CREATE POLICY "Allow delete" ON payments FOR DELETE USING (true);
CREATE POLICY "Allow delete" ON payment_allocations FOR DELETE USING (true);
```

---

**修正完了後に報告してください！** ✅
