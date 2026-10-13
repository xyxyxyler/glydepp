-- Passenger profile (uix-spec 2.1 Basic Profile Setup) + onboarding progress.
-- One row per auth user; a passenger can only see and change their own row.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null check (char_length(btrim(first_name)) between 1 and 80),
  last_name text not null check (char_length(btrim(last_name)) between 1 and 80),
  -- "This information helps us optimize bus allocation and routing" (spec helper text).
  residential_area text not null check (char_length(btrim(residential_area)) between 1 and 120),
  work_location text not null check (char_length(btrim(work_location)) between 1 and 120),
  company_name text not null check (char_length(btrim(company_name)) between 1 and 120),
  terms_accepted_at timestamptz, -- set by the Terms & Conditions screen
  onboarded_at timestamptz, -- set when Permissions is done; onboarding never shows again
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;

-- (select auth.uid()) is evaluated once per statement (Supabase RLS performance guidance).
create policy "read own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "create own profile" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);
create policy "update own profile" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
