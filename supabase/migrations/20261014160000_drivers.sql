-- Drivers (uix-spec §3). Only Approved drivers may start trips (CLAUDE.md §6).
-- Owner linkage + invite codes arrive with the Bus Owner dashboard.

create type public.driver_status as enum ('pending', 'approved', 'rejected');

create table public.drivers (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null check (char_length(btrim(first_name)) between 1 and 80),
  last_name text not null check (char_length(btrim(last_name)) between 1 and 80),
  status public.driver_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger drivers_touch before update on public.drivers
for each row execute function public.touch_updated_at();

alter table public.drivers enable row level security;
create policy "drivers read own row" on public.drivers
  for select to authenticated using ((select auth.uid()) = id);
-- No client writes: status changes come from the owner/HQ side (service role) only.
