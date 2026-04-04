-- Trip Planning App - Initial Schema

create extension if not exists "uuid-ossp";

-- Trips table
create table if not exists trips (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  start_date date not null,
  end_date date not null,
  template text default 'postcard', -- postcard, brutalist, soft, minimalist, maximalist
  created_by uuid not null,
  share_token text unique,
  is_public boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_trips_created_by on trips(created_by);
create index idx_trips_share_token on trips(share_token);

-- Members table
create table if not exists members (
  id uuid primary key default uuid_generate_v4(),
  trip_id uuid not null references trips(id) on delete cascade,
  user_id uuid,
  name text not null,
  email text,
  role text default 'editor', -- organizer, editor, viewer
  joined_at timestamptz default now(),
  created_at timestamptz default now()
);

create index idx_members_trip_id on members(trip_id);
create index idx_members_user_id on members(user_id);
create unique index idx_members_email_per_trip on members(trip_id, email) where email is not null;

-- Days (generated from trip dates, stored for performance)
create table if not exists days (
  id uuid primary key default uuid_generate_v4(),
  trip_id uuid not null references trips(id) on delete cascade,
  date date not null,
  day_number integer not null,
  label text,
  created_at timestamptz default now()
);

create index idx_days_trip_id on days(trip_id);
create unique index idx_days_trip_date on days(trip_id, date);

-- Events (Schedule items)
create table if not exists events (
  id uuid primary key default uuid_generate_v4(),
  day_id uuid not null references days(id) on delete cascade,
  trip_id uuid not null references trips(id) on delete cascade,
  type text not null, -- sightseeing, food, accommodation, packing, note, payment, transport, activity
  title text not null,
  start_time text, -- HH:MM format
  location text,
  notes text,
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_events_day_id on events(day_id);
create index idx_events_trip_id on events(trip_id);
create index idx_events_created_by on events(created_by);

-- Payments (Expense tracking)
create table if not exists payments (
  id uuid primary key default uuid_generate_v4(),
  trip_id uuid not null references trips(id) on delete cascade,
  payer_id uuid not null references members(id) on delete cascade,
  amount numeric(10, 2) not null,
  currency text not null default 'JPY', -- JPY, USD, GBP, EUR
  amount_jpy numeric(10, 2), -- normalized to JPY for settlement
  description text,
  payment_date date not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_payments_trip_id on payments(trip_id);
create index idx_payments_payer_id on payments(payer_id);
create index idx_payments_date on payments(payment_date);

-- Payment allocation (who this payment covers)
create table if not exists payment_allocations (
  id uuid primary key default uuid_generate_v4(),
  payment_id uuid not null references payments(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  created_at timestamptz default now()
);

create index idx_payment_allocations_payment_id on payment_allocations(payment_id);
create index idx_payment_allocations_member_id on payment_allocations(member_id);
create unique index idx_payment_allocations_unique on payment_allocations(payment_id, member_id);

-- Enable RLS
alter table trips enable row level security;
alter table members enable row level security;
alter table days enable row level security;
alter table events enable row level security;
alter table payments enable row level security;
alter table payment_allocations enable row level security;

-- RLS Policies
create policy "trips_viewable_if_member_or_public"
  on trips for select
  using (is_public = true or created_by = auth.uid() or id in (
    select trip_id from members where user_id = auth.uid()
  ));

create policy "trips_insert_own"
  on trips for insert
  with check (created_by = auth.uid());

create policy "trips_update_own"
  on trips for update
  using (created_by = auth.uid());

create policy "trips_delete_own"
  on trips for delete
  using (created_by = auth.uid());

create policy "members_viewable_if_trip_visible"
  on members for select
  using (trip_id in (
    select id from trips where is_public = true or created_by = auth.uid() or id in (
      select trip_id from members where user_id = auth.uid()
    )
  ));

create policy "events_viewable_if_trip_visible"
  on events for select
  using (trip_id in (
    select id from trips where is_public = true or created_by = auth.uid() or id in (
      select trip_id from members where user_id = auth.uid()
    )
  ));

create policy "payments_viewable_if_trip_visible"
  on payments for select
  using (trip_id in (
    select id from trips where is_public = true or created_by = auth.uid() or id in (
      select trip_id from members where user_id = auth.uid()
    )
  ));

create policy "days_viewable_if_trip_visible"
  on days for select
  using (trip_id in (
    select id from trips where is_public = true or created_by = auth.uid() or id in (
      select trip_id from members where user_id = auth.uid()
    )
  ));
