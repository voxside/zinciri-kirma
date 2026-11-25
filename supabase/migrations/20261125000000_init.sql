-- Zinciri Kırma — başlangıç şeması (V1 + V2)
-- Supabase Dashboard > SQL Editor'e yapıştırıp çalıştırılabilir
-- ya da: npx supabase db push

create extension if not exists vector;
create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────
-- Enum'lar
-- ─────────────────────────────────────────────────────────────
-- todo = "Rutin" (arayüz adı), project = "Projeler"
create type task_category as enum ('todo','project','shopping','call');
create type level3        as enum ('low','medium','high');
create type task_status   as enum ('pending','done','skipped','snoozed');
create type task_source   as enum ('manual','ai_chat','calendar','birthday','routine','skill','ingest');
create type chain_status  as enum ('in_progress','full','saved','broken','frozen');
create type checkin_slot  as enum ('morning','midday','evening','adhoc');
create type memory_kind   as enum ('identity','goal','routine','rule','note','file');
create type task_face     as enum ('front','back');

-- ─────────────────────────────────────────────────────────────
-- Yardımcılar
-- ─────────────────────────────────────────────────────────────
-- synced_at: sunucu saatiyle "bu satır en son ne zaman yazıldı".
-- İstemci, son çektiği synced_at'ten sonrasını ister (pull imleci).
create or replace function set_synced_at() returns trigger
language plpgsql as $$
begin
  new.synced_at := clock_timestamp();
  return new;
end $$;

-- ─────────────────────────────────────────────────────────────
-- Profil
-- ─────────────────────────────────────────────────────────────
create table profiles (
  id                 uuid primary key references auth.users on delete cascade,
  display_name       text,
  timezone           text not null default 'Europe/Istanbul',
  morning_time       time not null default '07:30',
  evening_nudge_time time not null default '21:00',
  day_start          time not null default '08:00',   -- müsaitlik penceresi
  day_end            time not null default '23:00',
  coach_intensity    smallint not null default 4 check (coach_intensity between 1 and 5),
  push_token         text,
  created_at         timestamptz not null default now()
);

-- Yeni kullanıcı kaydında profil satırı otomatik açılır.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- Sabit / tekrarlayan kurallar ("Anne ve babanı aramayı unutma")
-- ─────────────────────────────────────────────────────────────
create table recurring_rules (
  id               uuid primary key,
  user_id          uuid not null references profiles on delete cascade,
  system_key       text,                          -- 'family_call' gibi sistem kuralları
  category         task_category not null,
  face             task_face not null default 'front',
  title            text not null,
  interval_days    smallint not null default 1 check (interval_days in (1,3,7,14)),
  anchor_date      date not null default current_date,  -- vade günleri buna göre
  pin_order        smallint,
  is_locked        boolean not null default false,
  counts_for_chain boolean not null default true,
  active           boolean not null default true,
  -- Üretilen günlük kopyaların şablonu
  priority         level3 not null default 'medium',
  energy_required  level3 not null default 'medium',
  est_minutes      smallint,
  due_time         time,
  contact_phone    text,
  is_minimum       boolean not null default false,
  updated_at       timestamptz not null default now(),
  synced_at        timestamptz not null default now(),
  deleted_at       timestamptz,
  unique (user_id, system_key)
);

-- ─────────────────────────────────────────────────────────────
-- Yetenek bölmeleri
-- ─────────────────────────────────────────────────────────────
create table skill_hubs (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references profiles on delete cascade,
  name              text not null,
  vision            text,
  color             text,
  weekly_target_min smallint default 120,
  last_practiced_at timestamptz,
  neglect_count     smallint not null default 0,
  archived          boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  synced_at         timestamptz not null default now(),
  deleted_at        timestamptz
);

create table skill_tasks (
  id          uuid primary key default gen_random_uuid(),
  hub_id      uuid not null references skill_hubs on delete cascade,
  user_id     uuid not null references profiles on delete cascade,
  kind        text not null check (kind in ('goal','practice','idea')),
  title       text not null,
  notes       text,
  energy      level3 not null default 'medium',
  est_minutes smallint default 20,
  per_week    smallint,
  status      text not null default 'active' check (status in ('active','done','archived')),
  source      text not null default 'manual' check (source in ('manual','ai_chat','ingest')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  synced_at   timestamptz not null default now(),
  deleted_at  timestamptz
);

create table skill_chat_messages (
  id         bigserial primary key,
  hub_id     uuid not null references skill_hubs on delete cascade,
  user_id    uuid not null references profiles on delete cascade,
  role       text not null check (role in ('user','assistant')),
  content    jsonb not null,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Hızlı yakalama (Apple Watch / iPhone Kestirmeler)
-- ─────────────────────────────────────────────────────────────
create table ingest_keys (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles on delete cascade,
  key_hash     text not null unique,        -- SHA-256(hex); anahtarın kendisi saklanmaz
  key_prefix   text not null,               -- arayüzde tanımak için: "zk_3f9a…"
  label        text,
  last_used_at timestamptz,
  revoked_at   timestamptz,
  created_at   timestamptz not null default now()
);

create table ingest_logs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles on delete cascade,
  key_id       uuid references ingest_keys on delete set null,
  source       text,
  raw_text     text not null,
  captured_at  timestamptz not null,
  client_id    text,
  status       text not null check (status in ('ok','partial','failed')),
  parsed       jsonb,
  created_refs jsonb,
  latency_ms   integer,
  error        text,
  created_at   timestamptz not null default now(),
  unique (user_id, client_id)
);

-- ─────────────────────────────────────────────────────────────
-- Görevler (Yapılacaklar / Alınacaklar / Aranacaklar, ön + arka yüz)
-- ─────────────────────────────────────────────────────────────
create table tasks (
  id              uuid primary key,
  user_id         uuid not null references profiles on delete cascade,
  category        task_category not null,
  face            task_face not null default 'front',
  title           text not null,
  notes           text,
  priority        level3 not null default 'medium',
  energy_required level3 not null default 'medium',
  est_minutes     smallint,
  due_date        date,                       -- Alınacaklar: hedef tarih · Projeler: teslim
  due_time        time,                       -- görevi yapacağım saat (sıralama)
  status          task_status not null default 'pending',
  quantity        text,
  price           numeric(12,2),              -- Alınacaklar
  currency        text check (currency in ('TRY','USD','EUR')),
  contact_name    text,
  contact_phone   text,
  effort_minutes  integer,                    -- Projeler: toplam efor
  span_days       smallint,                   -- Projeler: kaç güne yayılacak
  progress        smallint check (progress between 0 and 100),
  source          task_source not null default 'manual',
  source_ref      text,
  plan_date       date,                       -- null = "Sonra" (zincire sayılmaz)
  is_minimum      boolean not null default false,
  rule_id         uuid references recurring_rules on delete set null,
  skill_task_id   uuid references skill_tasks on delete set null,
  ingest_id       uuid references ingest_logs on delete set null,
  slot_start      timestamptz,
  slot_end        timestamptz,
  needs_review    boolean not null default false,
  hidden_at       timestamptz,                -- tamamlandıktan sonra listeden kaldırıldı (puan kalır)
  completed_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  synced_at       timestamptz not null default now(),
  deleted_at      timestamptz
);
create index tasks_user_plan on tasks (user_id, plan_date);
create index tasks_user_synced on tasks (user_id, synced_at);
-- Sabit kuraldan her gün yalnızca bir kopya
create unique index tasks_rule_day on tasks (rule_id, plan_date)
  where rule_id is not null and deleted_at is null;

-- Silinemez kuralın kendisi ve günlük kopyaları silinemez.
create or replace function guard_locked() returns trigger
language plpgsql as $$
declare locked boolean;
begin
  -- Hesap silinirken (cascade) engelleme.
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then
    return old;
  end if;

  if tg_table_name = 'recurring_rules' then
    -- Sistem kuralı ("Anne ve babanı ara") kilidi açılamaz, durdurulamaz.
    if tg_op = 'UPDATE' and old.system_key is not null
       and (not new.is_locked or not new.active) then
      raise exception 'Sistem kuralı kaldırılamaz.';
    end if;
    locked := old.is_locked;
  else
    select r.is_locked into locked from recurring_rules r where r.id = old.rule_id;
  end if;

  if coalesce(locked, false) then
    if tg_op = 'DELETE' then
      raise exception 'Bu kural sabittir ve silinemez.';
    elsif new.deleted_at is not null and old.deleted_at is null then
      raise exception 'Bu kural sabittir ve silinemez.';
    end if;
  end if;
  return coalesce(new, old);
end $$;

create trigger recurring_rules_guard before update or delete on recurring_rules
  for each row execute function guard_locked();
create trigger tasks_guard before update or delete on tasks
  for each row execute function guard_locked();

-- ─────────────────────────────────────────────────────────────
-- Zincir geçmişi
-- ─────────────────────────────────────────────────────────────
create table chain_days (
  user_id       uuid not null references profiles on delete cascade,
  day           date not null,
  status        chain_status not null default 'in_progress',
  target_points smallint not null default 0,
  earned_points smallint not null default 0,
  progress      numeric generated always as
                  (case when target_points = 0 then 0
                        else least(1, earned_points::numeric / target_points) end) stored,
  mvd_mode      boolean not null default false,
  -- Gün kapanırken alınan anlık görüntü: tamamlananlar / yapılmayanlar.
  -- Devreden görevler ertesi güne geçse de geçmiş gün kartı doğru kalır.
  snapshot      jsonb not null default '{"done":[],"missed":[]}',
  closed_at     timestamptz,
  updated_at    timestamptz not null default now(),
  synced_at     timestamptz not null default now(),
  primary key (user_id, day)
);

-- ─────────────────────────────────────────────────────────────
-- Haftalık müsaitlik
-- ─────────────────────────────────────────────────────────────
create table weekly_blocks (                    -- katman 1: sabit / tekrarlayan
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles on delete cascade,
  weekday     smallint not null check (weekday between 0 and 6),   -- 0 = Pazar
  start_time  time not null,
  end_time    time not null check (end_time > start_time),
  kind        text not null check (kind in ('class','work','busy','sleep')),
  label       text,
  valid_from  date not null default current_date,
  valid_until date,
  updated_at  timestamptz not null default now(),
  synced_at   timestamptz not null default now(),
  deleted_at  timestamptz
);

create table calendar_events (                  -- katman 2: düzensiz / tek seferlik
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles on delete cascade,
  source      text not null check (source in ('manual','ingest','google','apple')),
  external_id text,
  title       text not null,
  starts_at   timestamptz not null,
  ends_at     timestamptz,
  all_day     boolean not null default false,
  location    text,
  kind        text not null default 'event' check (kind in ('event','birthday','holiday')),
  ingest_id   uuid references ingest_logs on delete set null,
  updated_at  timestamptz not null default now(),
  synced_at   timestamptz not null default now(),
  deleted_at  timestamptz,
  unique (user_id, source, external_id)
);
create index calendar_events_user_time on calendar_events (user_id, starts_at);

-- ─────────────────────────────────────────────────────────────
-- Ruh hali, hafıza, sohbet
-- ─────────────────────────────────────────────────────────────
create table mood_logs (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references profiles on delete cascade,
  logged_at timestamptz not null default now(),
  slot      checkin_slot not null,
  energy    smallint not null check (energy between 1 and 5),
  mood      smallint check (mood between 1 and 5),
  tags      text[] not null default '{}',
  note      text
);
create index mood_logs_user_time on mood_logs (user_id, logged_at desc);

create table memory_items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles on delete cascade,
  kind       memory_kind not null,
  title      text not null,
  content    text not null,
  file_path  text,
  pinned     boolean not null default false,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table memory_chunks (
  id        bigserial primary key,
  memory_id uuid not null references memory_items on delete cascade,
  user_id   uuid not null references profiles on delete cascade,
  chunk     text not null,
  embedding vector(1024)
);
create index memory_chunks_embedding on memory_chunks using hnsw (embedding vector_cosine_ops);

create table chat_messages (
  id         bigserial primary key,
  user_id    uuid not null references profiles on delete cascade,
  role       text not null,
  content    jsonb not null,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- synced_at tetikleyicileri (senkronize edilen tablolar)
-- ─────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['tasks','recurring_rules','chain_days','skill_hubs','skill_tasks','weekly_blocks','calendar_events']
  loop
    execute format('create trigger %I before insert or update on %I for each row execute function set_synced_at()',
                   t || '_synced_at', t);
  end loop;
end $$;

-- ─────────────────────────────────────────────────────────────
-- Row Level Security: herkes yalnızca kendi satırlarını görür
-- ─────────────────────────────────────────────────────────────
alter table profiles enable row level security;
create policy own_profile on profiles for all
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

do $$
declare t text;
begin
  foreach t in array array[
    'recurring_rules','skill_hubs','skill_tasks','skill_chat_messages','ingest_keys','ingest_logs',
    'tasks','chain_days','weekly_blocks','calendar_events','mood_logs','memory_items','memory_chunks','chat_messages']
  loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy own_rows on %I for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;
-- Not: ingest anahtarını uygulama üretir, kullanıcıya bir kez gösterir ve yalnızca
-- SHA-256 özetini ingest_keys'e yazar. Uç (Edge Function) özet üzerinden doğrular.
