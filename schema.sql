-- ════════════════════════════════════════════════════
-- WhatsApp E-Store · Database Schema
-- Run this ONCE in: Supabase → SQL Editor → New Query
-- ════════════════════════════════════════════════════

-- ── 1. PRODUCTS TABLE ────────────────────────────────
-- Stores every product listed via WhatsApp bot
create table if not exists products (
  id            uuid        primary key default gen_random_uuid(),
  name          text        not null,
  description   text,
  price         numeric(12, 2),
  currency      text        default 'NGN',
  category      text        default 'Other',
  image_url     text,
  status        text        default 'available',   -- 'available' | 'sold'
  wa_message_id text,                              -- External message ID (Meta or "tg_"-prefixed Telegram) for deduplication
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ── 1b. MULTI-IMAGE COLUMN (migration — skip if already added) ───────────────
alter table products add column if not exists image_urls text[] default '{}';

-- ── 2. INTERACTIONS TABLE ────────────────────────────
-- Logs every visitor action (view, like, save, enquiry)
create table if not exists interactions (
  id          uuid        primary key default gen_random_uuid(),
  product_id  uuid        references products(id) on delete cascade,
  type        text        not null,               -- 'view' | 'like' | 'save' | 'enquiry'
  visitor_id  text,                               -- anonymous session ID from browser
  created_at  timestamptz default now()
);

-- ── 3. ENQUIRIES TABLE ───────────────────────────────
-- Stores "Request to Buy" submissions from visitors
-- Run in Supabase SQL Editor if this table doesn't exist yet
create table if not exists enquiries (
  id           uuid        primary key default gen_random_uuid(),
  product_id   uuid        references products(id) on delete cascade,
  product_name text        not null,
  buyer_name   text        not null,
  buyer_phone  text        not null,
  message      text,
  created_at   timestamptz default now()
);

alter table enquiries enable row level security;

-- Anyone can submit an enquiry
create policy "Public can submit enquiries"
  on enquiries for insert
  with check (true);

-- ── 4. ROW LEVEL SECURITY ────────────────────────────
-- Controls who can read/write each table

alter table products     enable row level security;
alter table interactions enable row level security;

-- Anyone visiting the website can see available products
create policy "Public can view available products"
  on products for select
  using (status = 'available');

-- Anyone can log an interaction (like, view, save)
create policy "Public can log interactions"
  on interactions for insert
  with check (true);

-- ── 5. HELPER FUNCTIONS ──────────────────────────────

-- Auto-update the updated_at timestamp when a product changes
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger products_updated_at
  before update on products
  for each row execute function update_updated_at();

-- ── 6. QUICK-VIEW: PRODUCT STATS ─────────────────────
-- A view that joins products with interaction counts
-- Use this in your dashboard later: select * from product_stats;
create or replace view product_stats as
  select
    p.id,
    p.name,
    p.price,
    p.status,
    p.created_at,
    count(*) filter (where i.type = 'view')    as views,
    count(*) filter (where i.type = 'like')    as likes,
    count(*) filter (where i.type = 'save')    as saves,
    count(*) filter (where i.type = 'enquiry') as enquiries
  from products p
  left join interactions i on i.product_id = p.id
  group by p.id;
