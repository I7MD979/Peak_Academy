-- Peak Academy — multi-provider payment support
-- Safe to run even if 20260609_master_schema_v2.sql was not applied yet.

-- ========== Create payments table if missing (from schema v2 + provider columns) ==========
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid,
  student_id uuid not null references public.users(id) on delete cascade,
  amount numeric(10,2) not null,
  original_amount numeric(10,2),
  discount_amount numeric(10,2) default 0,
  platform_fee numeric(10,2),
  teacher_earning numeric(10,2),
  paymob_order_id text,
  paymob_transaction_id text,
  payment_method text,
  promotion_id uuid,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'refunded')),
  paid_at timestamptz,
  legacy_transaction_id text,
  created_at timestamptz not null default now(),
  provider text default 'paymob',
  provider_order_id text,
  provider_txn_id text,
  idempotency_key text,
  metadata jsonb default '{}'
);

-- Optional FKs when parent tables exist
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'enrollments'
  ) and not exists (
    select 1 from pg_constraint where conname = 'payments_enrollment_id_fkey'
  ) then
    alter table public.payments
      add constraint payments_enrollment_id_fkey
      foreign key (enrollment_id) references public.enrollments(id) on delete cascade;
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'promotions'
  ) and not exists (
    select 1 from pg_constraint where conname = 'payments_promotion_id_fkey'
  ) then
    alter table public.payments
      add constraint payments_promotion_id_fkey
      foreign key (promotion_id) references public.promotions(id) on delete set null;
  end if;
end $$;

-- ========== Extend existing payments table (no-op if columns already exist) ==========
alter table public.payments
  add column if not exists provider text default 'paymob',
  add column if not exists provider_order_id text,
  add column if not exists provider_txn_id text,
  add column if not exists idempotency_key text,
  add column if not exists metadata jsonb default '{}',
  add column if not exists paymob_order_id text,
  add column if not exists paymob_transaction_id text,
  add column if not exists payment_method text,
  add column if not exists paid_at timestamptz,
  add column if not exists promotion_id uuid,
  add column if not exists original_amount numeric(10,2),
  add column if not exists discount_amount numeric(10,2) default 0,
  add column if not exists platform_fee numeric(10,2),
  add column if not exists teacher_earning numeric(10,2),
  add column if not exists legacy_transaction_id text,
  add column if not exists created_at timestamptz default now();

update public.payments
set provider_order_id = paymob_order_id
where provider_order_id is null and paymob_order_id is not null;

update public.payments
set provider = 'paymob'
where provider is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'chk_payments_provider'
  ) then
    alter table public.payments
      add constraint chk_payments_provider
      check (provider in ('paymob', 'fawry', 'vodafone_cash', 'instapay'));
  end if;
exception when others then
  null;
end $$;

create index if not exists idx_payments_student on public.payments(student_id);
create index if not exists idx_payments_paymob on public.payments(paymob_order_id);

create unique index if not exists idx_payments_idempotency
  on public.payments(idempotency_key)
  where idempotency_key is not null;

create index if not exists idx_payments_provider on public.payments(provider);
create index if not exists idx_payments_provider_order on public.payments(provider_order_id);

-- ========== InstaPay receipts ==========
create table if not exists public.instapay_receipts (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid references public.payments(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  reference_code text not null,
  receipt_url text,
  bank_ref text,
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected')),
  verified_by uuid references public.users(id) on delete set null,
  verified_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_instapay_receipts_payment on public.instapay_receipts(payment_id);
create index if not exists idx_instapay_receipts_status on public.instapay_receipts(status);

alter table public.instapay_receipts enable row level security;

drop policy if exists instapay_receipts_self on public.instapay_receipts;
create policy instapay_receipts_self on public.instapay_receipts
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists instapay_receipts_insert_own on public.instapay_receipts;
create policy instapay_receipts_insert_own on public.instapay_receipts
  for insert to authenticated
  with check (user_id = auth.uid());

-- RLS on payments (read own rows)
alter table public.payments enable row level security;

drop policy if exists payments_select_own on public.payments;
create policy payments_select_own on public.payments
  for select to authenticated
  using (student_id = auth.uid());
