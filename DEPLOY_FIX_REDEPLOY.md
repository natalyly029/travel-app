# Vercel Redeploy 実行手順

`vercel.json` を修正しました。Vercel が自動で redeploy を開始します。

---

## 📋 確認手順

### Step 1: Vercel ダッシュボードを開く

```
https://vercel.com/dashboard
```

### Step 2: travel-app プロジェクトを開く

左パネル → Projects → travel-app

### Step 3: Deployments タブを見る

**状態を確認:**

| 状態 | 意味 | 対応 |
|------|------|------|
| **Building...** | 自動 redeploy 中 | 1-3分待機 |
| **Ready** | デプロイ成功 ✅ | Production URL でテスト |
| **Error** | ビルド失敗 | Logs を確認 |

---

## ✅ デプロイ成功の確認

**Deployments** 一覧の最新エントリが:

```
✅ "Ready" と表示 → 成功！
```

クリック → **Production** をクリック → ホームページが表示されたら完成！

---

## 本番 URL

```
https://travel-app-[ID].vercel.app
```

このリンクがあなたの本番環境です。ブックマークしてください！

---

## 環境変数の確認（念のため）

Settings → Environment Variables で、4つが設定されているか最終確認:

```
✅ NEXT_PUBLIC_SUPABASE_URL = https://ssqifnxhbywabvglnppj.supabase.co
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY = [JWT token]
✅ SUPABASE_SERVICE_ROLE_KEY = [JWT token]
✅ NEXT_PUBLIC_APP_NAME = Travel App
```

ない場合 → Add New Variable で追加

---

## テストフロー

本番 URL にアクセス:

```
1. ホームページ読み込まれる ✅
2. 「新しい旅を作成」ボタン見える ✅
3. クリック → フォーム表示 ✅
4. Title + Date 入力 → Create ✅
5. Trip Detail ページ表示 ✅
6. Schedule, Members, Payments, Settlement タブ見える ✅
```

すべて ✅ なら本番稼働成功！

---

## 次のステップ

本番 URL が確定したら、教えてください 🚀

