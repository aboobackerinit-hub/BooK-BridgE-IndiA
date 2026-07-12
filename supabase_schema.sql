-- BookBridge India — Supabase schema (RESET + CREATE)
-- ⚠️ WARNING: This DROPS existing tables named users/books/posts/cart/orders/messages
-- Only run this if the current data in these tables is throwaway.
--
-- HOW TO RUN:
--   Supabase Dashboard → SQL Editor → New query → paste ENTIRE FILE → RUN
--   Then tell the main agent: "schema created"

-- ============================================================
-- 0) DROP existing tables (safe - CASCADE removes dependencies)
-- ============================================================
drop table if exists public.messages cascade;
drop table if exists public.orders   cascade;
drop table if exists public.cart     cascade;
drop table if exists public.posts    cascade;
drop table if exists public.books    cascade;
drop table if exists public.users    cascade;

-- ============================================================
-- 1) TABLES
-- ============================================================

create extension if not exists "uuid-ossp";

create table public.users (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  password_hash text not null,
  name text not null,
  role text not null default 'user',
  bbid text unique not null,
  bio text default '',
  avatar_url text default '',
  address text default '',
  phone text default '',
  privacy_public boolean default true,
  notifications_enabled boolean default true,
  approved boolean default true,
  suspended boolean default false,
  followers text[] default '{}',
  following text[] default '{}',
  blocked text[] default '{}',
  email_prefs jsonb default '{}',
  created_at timestamptz default now()
);

create table public.books (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  author text not null,
  description text default '',
  price numeric(10,2) not null default 0,
  stock integer default 1,
  category text default 'General',
  condition text default 'New',
  image_url text default '',
  isbn text default '',
  edition text default '',
  language text default 'English',
  owner_id uuid references public.users(id) on delete cascade,
  owner_role text default 'user',
  approved boolean default true,
  featured boolean default false,
  created_at timestamptz default now()
);

create table public.posts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  text text not null,
  image_url text default '',
  book_id uuid references public.books(id) on delete set null,
  likes text[] default '{}',
  comments jsonb default '[]',
  created_at timestamptz default now()
);

create table public.cart (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  quantity integer default 1,
  created_at timestamptz default now(),
  unique(user_id, book_id)
);

create table public.orders (
  id uuid primary key default uuid_generate_v4(),
  order_no text unique not null,
  user_id uuid not null references public.users(id) on delete cascade,
  user_name text not null,
  items jsonb not null default '[]',
  address text not null,
  phone text not null,
  payment_method text default 'cod',
  total numeric(10,2) not null,
  status text default 'New',
  created_at timestamptz default now()
);

create table public.messages (
  id uuid primary key default uuid_generate_v4(),
  thread_id text not null,
  from_user_id uuid not null references public.users(id) on delete cascade,
  from_user_name text not null,
  to_user_id uuid not null references public.users(id) on delete cascade,
  text text not null,
  read boolean default false,
  created_at timestamptz default now()
);

create index idx_books_owner    on public.books(owner_id);
create index idx_posts_created  on public.posts(created_at desc);
create index idx_messages_thread on public.messages(thread_id, created_at);
create index idx_cart_user      on public.cart(user_id);
create index idx_orders_user    on public.orders(user_id);

-- ============================================================
-- 2) RLS
-- ============================================================
alter table public.users     enable row level security;
alter table public.books     enable row level security;
alter table public.posts     enable row level security;
alter table public.cart      enable row level security;
alter table public.orders    enable row level security;
alter table public.messages  enable row level security;

drop policy if exists "users_public_read" on public.users;
create policy "users_public_read" on public.users for select using (true);

drop policy if exists "books_public_read" on public.books;
create policy "books_public_read" on public.books for select using (true);

drop policy if exists "posts_public_read" on public.posts;
create policy "posts_public_read" on public.posts for select using (true);

-- Cart/orders/messages have NO anon read policy — only backend (service_role) accesses these.

-- ============================================================
-- 3) STORAGE BUCKET
-- ============================================================
insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do nothing;

drop policy if exists "images_public_read" on storage.objects;
create policy "images_public_read" on storage.objects
  for select using (bucket_id = 'images');

-- ============================================================
-- VERIFY
-- ============================================================
-- select count(*) from public.users;   -- should be 0
-- select count(*) from public.books;   -- should be 0
