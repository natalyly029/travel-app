# Vercel デプロイ手順書 - Travel App

**所要時間**: 約 5-10 分  
**難易度**: 簡単（ブラウザ操作のみ）

---

## 前提条件

- GitHub アカウント（リポジトリへのアクセス）
- Vercel アカウント（https://vercel.com にサインアップ）
- Supabase API キー（既に .env.local に存在）

---

## Step 1: Supabase API キーを取得

### 1-1. Supabase Dashboard を開く

```
https://supabase.com/dashboard/project/ssqifnxhbywabvglnppj/settings/api
```

### 1-2. 3つのキーをコピー

**📋 以下の3つを新しいテキストエディタに貼り付けて保管:**

```
NEXT_PUBLIC_SUPABASE_URL: https://ssqifnxhbywabvglnppj.supabase.co

NEXT_PUBLIC_SUPABASE_ANON_KEY: [Anon key セクションから]

SUPABASE_SERVICE_ROLE_KEY: [Service role key セクションから]
```

> **⚠️ 注意**: Service Role Key は秘密です。共有 URL やパスワードで送信しないこと

---

## Step 2: Vercel にログイン

1. https://vercel.com/login にアクセス
2. GitHub でログイン（または Vercel アカウント）
3. ダッシュボードが表示されることを確認

---

## Step 3: GitHub リポジトリをインポート

1. Vercel ダッシュボード → **Add New** → **Project**
2. **Import Git Repository** を選択
3. 検索ボックスに `travel-app` と入力
4. リスト から `natalyly029/travel-app` を選択
5. **Import** をクリック

---

## Step 4: プロジェクト設定

### 4-1. プロジェクト名
```
Project Name: travel-app
```

### 4-2. フレームワーク
- 自動検出: ✅ Next.js

### 4-3. ビルド設定（デフォルトで OK）
```
Build Command: npm run build
Install Command: npm install
Output Directory: .next
Root Directory: ./
```

### 4-4. 環境変数を追加

**Environment Variables** セクションで、以下 4つを追加:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ssqifnxhbywabvglnppj.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | [Step 1 で取得した Anon Key] |
| `SUPABASE_SERVICE_ROLE_KEY` | [Step 1 で取得した Service Role Key] |
| `NEXT_PUBLIC_APP_NAME` | `Travel App` |

**追加方法:**
1. **Add New** をクリック
2. Key, Value を入力
3. **Save** をクリック
4. 4つ全て追加するまで繰り返す

---

## Step 5: デプロイを開始

1. **Deploy** ボタンをクリック
2. ビルドが開始（1-3分）
3. 完了時に Vercel URL が表示

```
✅ Production: https://travel-app-xxxx.vercel.app
```

---

## Step 6: 本番サイトを検証

デプロイ完了後、生成された URL にアクセス:

### テストチェックリスト

- [ ] **Home page** が読み込まれる
- [ ] **Create Trip** ボタンがクリック可能
- [ ] **Create Trip** フォームが動作
- [ ] **Trip Detail** ページが表示される
- [ ] **Schedule Editor** で日程が見える
- [ ] **Members** タブで招待リンクが表示
- [ ] **Payments** に支払い追加可能
- [ ] **Settlement** で計算が実行される
- [ ] **Join リンク** (`/trips/join/:token`) が動作
- [ ] Network tab で API が 200/201 応答

---

## Step 7: カスタムドメイン（オプション）

Vercel URL ではなく自分のドメインを使いたい場合:

1. Vercel ダッシュボーム → travel-app → Settings
2. **Domains** → Add → ドメイン入力
3. DNS レコード追加（Vercel が指示）
4. DNS 伝播待ち（数分～24時間）

**例**: `travel-app.example.com`

---

## トラブルシューティング

### ❌ Build failed: "Cannot find module"

**原因**: 環境変数が設定されていない

**解決**:
1. Vercel ダッシュボード → Settings → Environment Variables
2. 4つの変数が正しく入力されているか確認
3. 値に余分なスペースがないか確認
4. **Redeploy** をクリック

### ❌ "Supabase connection error"

**原因**: API キーが間違っているか期限切れ

**解決**:
1. Supabase Dashboard で API キー再確認
2. Vercel env vars で値を更新
3. **Redeploy** をクリック

### ❌ "RLS policy error" (500 error)

**原因**: Supabase の Row Level Security (RLS) 設定問題

**解決**:
1. Supabase Studio → SQL Editor
2. 実行:
   ```sql
   ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "Enable public access" 
   ON trips FOR SELECT USING (is_public = true);
   ```
3. Vercel で **Redeploy**

### ❌ "Next.js version mismatch"

**解決**:
```bash
# ローカルで確認
npm install
npm run build

# エラーなら修正して push
git add .
git commit -m "Fix build errors"
git push
# Vercel が自動で redeploy
```

---

## よくある質問

### Q: デプロイ後、ローカルと違う動作をします

**A**: キャッシュの問題です。Vercel ダッシュボード → Deployments → 最新 → **Redeploy** をクリック

### Q: 環境変数を変更したい

**A**: Vercel Settings → Environment Variables で編集 → Redeploy

### Q: ロールバック（前のバージョンに戻す）したい

**A**: Deployments タブ → 前のデプロイ → **Promote to Production**

### Q: 本番でテスト用の trip を削除したい

**A**: Supabase Studio → Table Editor → trips → 該当行を削除

---

## 確認コマンド（デプロイ後）

### Vercel CLI でステータス確認

```bash
vercel --prod

# 出力例:
# > Vercel CLI 33.1.0
# > production: https://travel-app-xxxx.vercel.app [v1]
```

### Git で最新確認

```bash
git log --oneline | head -5

# 出力例:
# 13fb782 Add Vercel deployment setup
# 6354a96 Implement Link Sharing
# f6b795c Phase 6: Settlement Calculation
# ...
```

---

## 本番運用チェックリスト

- [ ] ドメイン（Vercel URL またはカスタム）に常時アクセス可能
- [ ] HTTPS が自動有効（Vercel が自動設定）
- [ ] エラーログが Vercel 上で確認可能
- [ ] Supabase データベースが正常動作
- [ ] ユーザーが旅を作成 → 招待 → 参加 できる
- [ ] 複数ユーザーで支払いや清算が計算される
- [ ] PDF 出力は不要（フェーズ 3 で実装予定）

---

## 次のステップ

デプロイ完了後:

1. **ユーザーテスト**: 友達と実際の旅で使ってみる
2. **フィードバック収集**: 使いやすさ、機能要望
3. **Phase 3**: PDF export, Real-time collaboration など

---

**🎉 デプロイ完了！本番環境で旅行アプリが稼働します。**

サポートが必要な場合は、このドキュメントの **トラブルシューティング** セクションを参照してください。
