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
  wa_message_id text,                              -- Telegram message ID ("tg_" prefix) or album ID ("tg_group_" prefix), for deduplication. Column name is a holdover from the original Meta WhatsApp integration (removed Session 9) — not worth a migration to rename.
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
-- (drop-then-create makes this safe to re-run — "create policy" has no IF NOT EXISTS)
drop policy if exists "Public can submit enquiries" on enquiries;
create policy "Public can submit enquiries"
  on enquiries for insert
  with check (true);

-- ── 3b. TELEGRAM MEDIA GROUP STAGING TABLE ───────────
-- Telegram sends each photo in a multi-photo album as a SEPARATE webhook call,
-- all sharing the same media_group_id but only one carrying the caption.
-- This table buffers those photos until the album finishes arriving, so they
-- can be merged into ONE product (mirrors the Admin Upload multi-photo flow).
-- Server-only — never read by the storefront (no public policies = fully locked).
create table if not exists telegram_media_groups (
  media_group_id text        primary key,
  chat_id        text        not null,
  image_urls     text[]      not null default '{}',
  caption        text,
  update_count   integer     not null default 0,
  processed      boolean     not null default false,
  created_at     timestamptz default now()
);

alter table telegram_media_groups enable row level security;

-- Atomically appends a photo to a media group and bumps update_count.
-- Used by app/api/telegram/route.ts to avoid a read-then-write race when
-- multiple album photos arrive within milliseconds of each other.
create or replace function append_telegram_media_group(
  p_media_group_id text,
  p_chat_id text,
  p_image_url text,
  p_caption text
) returns integer as $$
declare
  v_count integer;
begin
  insert into telegram_media_groups (media_group_id, chat_id, image_urls, caption, update_count)
  values (p_media_group_id, p_chat_id, array[p_image_url], nullif(p_caption, ''), 1)
  on conflict (media_group_id) do update
    set image_urls   = telegram_media_groups.image_urls || p_image_url,
        caption       = coalesce(telegram_media_groups.caption, nullif(p_caption, '')),
        update_count  = telegram_media_groups.update_count + 1
  returning update_count into v_count;

  return v_count;
end;
$$ language plpgsql;

-- ── 4. ROW LEVEL SECURITY ────────────────────────────
-- Controls who can read/write each table

alter table products     enable row level security;
alter table interactions enable row level security;

-- Anyone visiting the website can see available products
-- (drop-then-create makes this safe to re-run — "create policy" has no IF NOT EXISTS)
drop policy if exists "Public can view available products" on products;
create policy "Public can view available products"
  on products for select
  using (status = 'available');

-- Anyone can log an interaction (like, view, save)
drop policy if exists "Public can log interactions" on interactions;
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

-- (drop-then-create makes this safe to re-run — "create trigger" has no IF NOT EXISTS)
drop trigger if exists products_updated_at on products;
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
