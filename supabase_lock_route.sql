-- Global 85 — lock Istanbul + Kenya and open the interest board.
-- Run in the Supabase SQL editor (Joe / jshrug). Safe to re-run.

-- 1. Route is locked. Home and Porter read this; the app also hardcodes the
--    same pair so the UI does not wait on this row.
insert into cohort_state (cohort_id, anchor_winner, companion_winner)
values ('global85', 'Istanbul', 'Kenya')
on conflict (cohort_id) do update
  set anchor_winner = excluded.anchor_winner,
      companion_winner = excluded.companion_winner;

-- 2. New members default to Istanbul, not the leftover Singapore default.
alter table members alter column default_city set default 'Istanbul';
update members
  set default_city = 'Istanbul'
  where default_city in ('Singapore', 'Ho Chi Minh City', 'HCMC', 'Vietnam');

-- 3. Anyone in the cohort can add a place. Owner or admin can edit/delete.
drop policy if exists "explore_write" on explore_items;
drop policy if exists "explore_insert_member" on explore_items;
drop policy if exists "explore_update_own" on explore_items;
drop policy if exists "explore_delete_own" on explore_items;

create policy "explore_insert_member" on explore_items
  for insert with check (auth.uid() = created_by_uid);

create policy "explore_update_own" on explore_items
  for update using (auth.uid() = created_by_uid or is_admin());

create policy "explore_delete_own" on explore_items
  for delete using (auth.uid() = created_by_uid or is_admin());

-- 4. Shared docs shelf. Anyone in the cohort can drop a link.
create table if not exists shared_links (
  id               uuid primary key default gen_random_uuid(),
  cohort_id        text not null default 'global85',
  url              text not null,
  title            text not null,
  notes            text not null default '',
  created_at       timestamptz not null default now(),
  created_by_uid   uuid references auth.users(id) on delete set null,
  created_by_name  text not null default 'Member'
);

alter table shared_links enable row level security;

drop policy if exists "shared_links_select" on shared_links;
drop policy if exists "shared_links_insert" on shared_links;
drop policy if exists "shared_links_delete" on shared_links;

create policy "shared_links_select" on shared_links
  for select using (auth.uid() is not null);

create policy "shared_links_insert" on shared_links
  for insert with check (auth.uid() = created_by_uid);

create policy "shared_links_delete" on shared_links
  for delete using (auth.uid() = created_by_uid or is_admin());

do $$
begin
  alter publication supabase_realtime add table shared_links;
exception
  when duplicate_object then null;
end $$;

-- 5. Trip-readiness on the roster. No passport numbers, no medical details.
alter table members add column if not exists passport_valid text not null default 'unknown';
alter table members add column if not exists visa_turkey text not null default 'unknown';
alter table members add column if not exists visa_kenya text not null default 'unknown';
alter table members add column if not exists vaccines_started text not null default 'unknown';
alter table members add column if not exists room_preference text not null default 'unknown';
