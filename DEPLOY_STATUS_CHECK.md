# Vercel デプロイ状態確認ガイド

プロジェクトが作成されているが、デプロイ状態が不明な場合。

---

## 🔍 確認方法（5ステップ）

### Step 1: Vercel ダッシュボードにログイン
```
https://vercel.com/dashboard
```
GitHub アカウントでログイン

---

### Step 2: プロジェクト一覧から travel-app を探す

**左パネル → Projects** に travel-app があるか確認

**ない場合**:
- プロジェクト名が異なる可能性
- Vercel 左上の検索で「travel」と入力して検索

---

### Step 3: travel-app プロジェクトを開く

クリック → プロジェクト詳細ページが開く

---

### Step 4: デプロイ状態を確認

| 表示 | 意味 | 対応 |
|------|------|------|
| **No deployments yet** | ビルドされていない | 環境変数確認後、Create Deployment |
| **Building...** | ビルド中 | 1-3分待機 |
| **Ready** | デプロイ成功 ✅ | Production URL をクリック |
| **Error** | ビルド失敗 | Logs を確認して修正 |
| **Suspended** | サスペンド中 | Vercel support に連絡 |

---

### Step 5: Production URL にアクセス

**Deployments** タブで最新デプロイを確認

```
Production: https://travel-app-[ID].vercel.app ← これ
```

このリンクをクリック → Home page が表示されたら成功 ✅

---

## 環境変数チェック

**Settings → Environment Variables** を開く

### 必須 4つの変数

```
1️⃣ NEXT_PUBLIC_SUPABASE_URL
   値: https://ssqifnxhbywabvglnppj.supabase.co

2️⃣ NEXT_PUBLIC_SUPABASE_ANON_KEY
   値: [Supabase API 設定から長いJWT]

3️⃣ SUPABASE_SERVICE_ROLE_KEY
   値: [Supabase API 設定から別のJWT]

4️⃣ NEXT_PUBLIC_APP_NAME
   値: Travel App
```

### ない場合

**Add New Variable** → Key/Value 入力 → Save

4つ全て追加したら → **Deployments → Create Deployment** をクリック

---

## デプロイを手動で開始

### 方法 A: Create Deployment ボタン
```
Deployments タブ → Create Deployment → Deploy
```

### 方法 B: Redeploy
```
Deployments → 最新デプロイ → ... → Redeploy
```

### 方法 C: GitHub Push（自動）
```
git push origin main
→ Vercel が自動でビルド・デプロイ開始
```

---

## ビルドログを確認

**Deployments** → 最新デプロイ をクリック → **Logs** タブ

```
✅ "npm run build" が実行される
✅ TypeScript がコンパイルされる
✅ "Ready" と表示
✅ Production URL が表示
```

エラーが出ている場合:
- メッセージを読む
- DEPLOY_TROUBLESHOOT.md で対応を確認

---

## テスト手順

Production URL が表示されたら:

```
1. ホームページが読み込まれる ✅
2. CSS デザイン（紫/ピンク）が見える ✅
3. 「新しい旅を作成」 ボタンがある ✅
4. クリック → フォーム表示 ✅
5. Title + Date 入力 → Create ✅
6. Trip Detail ページ表示 ✅
7. Schedule, Members, Payments, Settlement タブ見える ✅
```

すべて ✅ なら **本番稼働成功！**

---

## よくある質問

### Q: Deployment がずっと "Building..." なんだけど？
**A**: 10分以上続く場合は失敗している可能性。Logs を確認してください。

### Q: Build failed と出た
**A**: Logs タブでエラーメッセージを確認 → DEPLOY_TROUBLESHOOT.md を参照

### Q: Production URL が表示されない
**A**: Settings → Environment Variables で 4つの変数がすべて設定されているか確認

### Q: 本番環境にアクセスしたら 404 エラー
**A**: ページが存在しません。ホーム URL にアクセス: `https://travel-app-[ID].vercel.app/`

### Q: Supabase connection error が出た
**A**: API キーが正しいか確認。DEPLOY_TROUBLESHOOT.md の "Supabase connection error" セクション参照

---

## 完了確認

- [ ] Vercel にログイン
- [ ] travel-app プロジェクトが見える
- [ ] Deployments タブで状態確認
- [ ] 環境変数 4つが設定されている
- [ ] デプロイ開始（手動）
- [ ] "Ready" で成功
- [ ] Production URL でテスト
- [ ] ホームページ読み込み確認 ✅

すべて完了したら、Production URL を教えてください！

