# Trip Spots Setup

気になるスポット候補を trip ごとに管理するためのセットアップです。

```sql
create table if not exists trip_spots (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  name text not null,
  area text,
  notes text,
  url text,
  priority text default 'medium',
  status text default 'interested',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

## status の想定値
- interested
- considering
- visited
- skipped

## priority の想定値
- high
- medium
- low
```
