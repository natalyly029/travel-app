# 🚀 5分で本番デプロイ - Quick Start

**このドキュメントは最小限の手順です。詳細は VERCEL_SETUP.md を参照。**

---

## 前提条件
- GitHub アカウント ✅
- Vercel アカウント（無料）

---

## デプロイ手順（5分）

### 1️⃣ Vercel にログイン
```
https://vercel.com/login
```
GitHub でサインインする

### 2️⃣ 新しいプロジェクト作成
```
Dashboard → Add New → Project
```

### 3️⃣ GitHub から Import
```
Import Git Repository を選択
↓
"travel-app" で検索
↓
natalyly029/travel-app を選択
↓
Import をクリック
```

### 4️⃣ 環境変数を追加

**Environment Variables** セクション:

```
NEXT_PUBLIC_SUPABASE_URL
= https://ssqifnxhbywabvglnppj.supabase.co

NEXT_PUBLIC_SUPABASE_ANON_KEY
= [Supabase Dashboard → Settings → API から取得]

SUPABASE_SERVICE_ROLE_KEY
= [Supabase Dashboard → Settings → API から取得]

NEXT_PUBLIC_APP_NAME
= Travel App
```

### 5️⃣ Deploy をクリック
```
Deploy ボタン をクリック
↓
ビルド開始（1-3分待機）
↓
✅ Deployment complete!
```

### 6️⃣ URL を確認
```
Production: https://travel-app-xxxx.vercel.app
```

---

## 💬 Supabase API キーを取得する方法

```
https://supabase.com/dashboard/project/ssqifnxhbywabvglnppj/settings/api
```

開いて：
1. **URL** → コピー → `NEXT_PUBLIC_SUPABASE_URL` に貼り付け
2. **Anon key** → コピー → `NEXT_PUBLIC_SUPABASE_ANON_KEY` に貼り付け
3. **Service role key** → コピー → `SUPABASE_SERVICE_ROLE_KEY` に貼り付け

---

## ✅ デプロイ後のテスト

```
https://travel-app-xxxx.vercel.app
↓
Home page が表示される ✅
↓
"新しい旅を作成" ボタンをクリック ✅
↓
旅のタイトルを入力 → 作成 ✅
↓
Success!
```

---

## 🆘 エラーが出たら

### Build failed
→ Vercel logs を確認：Redeploy ボタン → Logs タブ

### Supabase connection error
→ API キーが正しいか確認 → Redeploy

### RLS policy error
→ Supabase Studio で RLS を enable（DEPLOYMENT.md 参照）

---

## 📋 詳細が必要なら
- **DEPLOYMENT.md** - 詳細セットアップ
- **VERCEL_SETUP.md** - トラブルシューティング
- **README.md** - 技術スタック

---

**🎉 これであなたの旅行アプリが本番稼働！**
