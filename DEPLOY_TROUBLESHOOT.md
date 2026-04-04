# Vercel デプロイ トラブルシューティング

プロジェクトは作成されているが、デプロイされていない場合の対応。

---

## Step 1: Vercel ダッシュボードを確認

### 1-1. Vercel にログイン
```
https://vercel.com/dashboard
```

### 1-2. travel-app プロジェクトを探す

ダッシュボード左パネル → **Projects** → `travel-app` を検索

---

## Step 2: デプロイ状態を確認

プロジェクトを開いて、以下を確認:

### Deployments タブ
```
✅ "No deployments yet" と表示 → まだビルドされていない
✅ "Building..." → ビルド中
✅ URL 表示 → デプロイ完了 ✅
```

---

## Step 3: デプロイを開始（もしまだなら）

### A. 環境変数が設定されているか確認

**Settings → Environment Variables** を確認:

```
Must have 4 variables:
☑ NEXT_PUBLIC_SUPABASE_URL = https://ssqifnxhbywabvglnppj.supabase.co
☑ NEXT_PUBLIC_SUPABASE_ANON_KEY = [長い JWT key]
☑ SUPABASE_SERVICE_ROLE_KEY = [長い JWT key]
☑ NEXT_PUBLIC_APP_NAME = Travel App
```

**ない場合**:
1. **Settings → Environment Variables**
2. **Add New Variable** をクリック
3. Key, Value 入力
4. **Save** をクリック
5. 4つ全て追加

### B. デプロイを手動で開始

**Deployments** タブ → **Create Deployment** ボタン をクリック

または

**... (メニュー) → Redeploy** をクリック

---

## Step 4: ビルドが開始される

```
✅ "Building..." が表示
✅ 1-3分待機
✅ "Ready" に変わる
✅ Production URL が表示される
```

**Production URL 例**:
```
https://travel-app-abc123xyz.vercel.app
```

---

## Step 5: 本番環境をテスト

Production URL にアクセス:

```
https://travel-app-abc123xyz.vercel.app
```

### テストチェックリスト

- [ ] Home page 読み込まれる
- [ ] CSS が正しく表示される（purple/pink/mint colors）
- [ ] 「新しい旅を作成」 ボタンがクリック可能
- [ ] Trip Title + Date を入力 → Create をクリック
- [ ] Trip Detail ページが表示される
- [ ] Schedule, Members, Payments, Settlement タブが見える

すべて ✅ なら **デプロイ成功！**

---

## よくある問題 & 解決策

### ❌ "Build failed"

**原因**: TypeScript エラーまたは環境変数が足りない

**解決**:
1. Vercel ダッシュボード → Deployments → 失敗したデプロイ → **Logs** を開く
2. エラーメッセージを確認
3. よくある原因:
   - 環境変数が足りない
   - 環境変数に余分なスペースがある
   - API キーが間違っている

**対応**:
- Settings → Environment Variables を再確認
- 値に余分なスペースないか確認
- Redeploy をクリック

### ❌ "Cannot find module '@/types'"

**原因**: tsconfig.json の path alias 問題

**解決**:
- これはローカル issue（本来は発生しない）
- GitHub で最新版を確認: https://github.com/natalyly029/travel-app
- リポジトリを再度インポート → Redeploy

### ❌ "Supabase connection error"

**原因**: API キーが間違っているか期限切れ

**解決**:
1. Supabase Dashboard を開く:
   ```
   https://supabase.com/dashboard/project/ssqifnxhbywabvglnppj/settings/api
   ```

2. 新しいキーをコピー:
   - `NEXT_PUBLIC_SUPABASE_URL` - 最上部のURL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - "Anon key" セクション
   - `SUPABASE_SERVICE_ROLE_KEY` - "Service role key" セクション

3. Vercel Settings → Environment Variables で値を更新

4. Deployments → Redeploy をクリック

### ❌ "500 Internal Server Error"

**原因**: Supabase RLS (Row Level Security) 設定

**解決**:
1. Supabase Studio を開く
2. SQL Editor で実行:
   ```sql
   ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
   
   CREATE POLICY "Public read access"
   ON trips FOR SELECT
   USING (is_public = true);
   ```

3. Vercel で Redeploy

---

## デバッグ：ローカルで再ビルド

万が一 Vercel ビルドが失敗する場合、ローカルで確認:

```bash
cd /Users/nkhome/.openclaw/workspace/travel-app

# 環境変数確認
cat .env.local | head -3

# ビルド実行
npm run build

# エラーメッセージ確認
# → GitHub に push → Vercel 自動 redeploy
```

---

## ✅ 最終確認チェックリスト

- [ ] Vercel ダッシュボード にログイン
- [ ] travel-app プロジェクトが表示される
- [ ] Deployments タブで状態確認
- [ ] 環境変数 4つが全て設定されている
- [ ] デプロイが "Ready" 状態
- [ ] Production URL が表示される
- [ ] URL にアクセスして本番環境動作確認

すべて ✅ なら**本番稼働完了！**

---

## サポート

- **Vercel Status**: https://www.vercel-status.com/
- **Supabase Status**: https://status.supabase.com/
- **Deployment Logs**: Vercel Dashboard → Deployments → Log

