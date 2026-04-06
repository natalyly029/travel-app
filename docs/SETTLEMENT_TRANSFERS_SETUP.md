# Settlement Transfers Setup

清算を個別 allocation ではなく、メンバー間ペアの送金単位で管理するためのセットアップです。

## 追加するテーブル

```sql
create table if not exists settlement_transfers (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  from_member_id uuid not null references members(id) on delete cascade,
  to_member_id uuid not null references members(id) on delete cascade,
  amount numeric not null,
  is_completed boolean not null default false,
  completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trip_id, from_member_id, to_member_id)
);
```

## 運用ルール

- 清算一覧は `A → B` のペア単位で表示
- `清算済み` にしたペアは `settlement_transfers` に保存
- 同じ trip / from / to ペアは1レコードで管理
- 完了済みのペアは UI 上の未清算一覧から非表示

## 補足

金額が変わった場合は、現在の計算結果と保存済み `amount` が一致しなければ再度一覧に表示されます。
