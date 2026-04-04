# Supabase RLS ポリシー修正ガイド

エラー: "infinite recursion detected in policy for relation "members""

---

## 原因

members テーブルの RLS ポリシーが循環参照を起こしています。

---

## 修正手順

### Step 1: Supabase Studio を開く

```
https://supabase.com/dashboard/project/ssqifnxhbywabvglnppj
```

ログイン → dashboard を開く

---

### Step 2: SQL Editor を開く

左パネル → **SQL Editor** をクリック

---

### Step 3: 既存の members テーブルのポリシーを確認

左パネル → **Authentication → Policies** → members テーブル

現在のポリシーを確認して、削除します。

---

### Step 4: RLS ポリシーをリセット

**SQL Editor** で以下を実行:

```sql
-- members テーブルの既存ポリシーをすべて削除
DROP POLICY IF EXISTS "Public read access" ON members;
DROP POLICY IF EXISTS "Members can read own trip" ON members;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON members;
DROP POLICY IF EXISTS "Users can update own record" ON members;
DROP POLICY IF EXISTS "Users can delete own record" ON members;

-- RLS を無効にしてから再度有効化
ALTER TABLE members DISABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- シンプルなポリシーを作成
CREATE POLICY "Public read access for public trips"
ON members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM trips 
    WHERE trips.id = members.trip_id 
    AND trips.is_public = true
  )
);

CREATE POLICY "Allow insert to members table"
ON members FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow update to members table"
ON members FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow delete from members table"
ON members FOR DELETE
USING (true);
```

---

### Step 5: Execute をクリック

SQL が実行されます。

---

### Step 6: trips テーブルのポリシーも確認

**SQL Editor** で:

```sql
-- trips テーブルのポリシーを確認
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('trips', 'members', 'days', 'events', 'payments');
```

実行 → ポリシー一覧を確認

---

### Step 7: 本番環境で再度テスト

Trip 作成ページで:
```
https://travel-manager-cyan.vercel.app/trips/create
```

再度テストして、エラーが解消されたか確認

---

## もし解消されない場合

**最後の手段: すべての RLS ポリシーを削除（開発用）**

```sql
-- すべてのテーブルで RLS を無効化
ALTER TABLE trips DISABLE ROW LEVEL SECURITY;
ALTER TABLE members DISABLE ROW LEVEL SECURITY;
ALTER TABLE days DISABLE ROW LEVEL SECURITY;
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE payment_allocations DISABLE ROW LEVEL SECURITY;

-- 再度有効化（ポリシーなし）
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE days ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;

-- 公開ポリシーを追加
CREATE POLICY "Public access" ON trips FOR SELECT USING (is_public = true);
CREATE POLICY "Public access" ON members FOR SELECT USING (true);
CREATE POLICY "Public access" ON days FOR SELECT USING (true);
CREATE POLICY "Public access" ON events FOR SELECT USING (true);
CREATE POLICY "Public access" ON payments FOR SELECT USING (true);
CREATE POLICY "Public access" ON payment_allocations FOR SELECT USING (true);

-- Write access
CREATE POLICY "Allow all writes" ON trips FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all writes" ON members FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all writes" ON days FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all writes" ON events FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all writes" ON payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all writes" ON payment_allocations FOR INSERT WITH CHECK (true);
```

---

## テストチェックリスト

修正後:

- [ ] Vercel キャッシュをクリア（Settings → Deployments → Redeploy）
- [ ] Trip Create ページにアクセス
- [ ] タイトル + Date + Template を入力
- [ ] 「旅を作成する」をクリック
- [ ] Trip Detail ページが表示される ✅

成功したら、フィードバックをください！

---

## サポート

- Supabase RLS Docs: https://supabase.com/docs/guides/database/postgres/row-level-security
- Policy Management: https://supabase.com/dashboard/project/ssqifnxhbywabvglnppj/auth/policies
