-- Account settings (uix-spec 2.8) + Help & Support requests.

alter table public.profiles
  add column language text not null default 'en' check (language in ('en')), -- English only for now (2026-10-14)
  add column notify_trip_alerts boolean not null default true, -- bus approaching / arrival alerts
  add column notify_offers boolean not null default false, -- promotions and offers
  add column use_areas_for_planning boolean not null default true; -- residential/work areas → routing insights

-- "Report a problem" (Help & Support). HQ reads these with the service role.
create table public.support_requests (
  id uuid primary key default gen_random_uuid(),
  passenger_id uuid not null references auth.users (id) on delete cascade,
  category text not null check (category in ('trip', 'payment', 'ticket', 'account', 'other')),
  message text not null check (char_length(btrim(message)) between 10 and 2000),
  payment_id uuid references public.payments (id),
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved')),
  created_at timestamptz not null default now()
);
alter table public.support_requests enable row level security;
create policy "read own requests" on public.support_requests
  for select to authenticated using ((select auth.uid()) = passenger_id);
create policy "file own requests" on public.support_requests
  for insert to authenticated with check ((select auth.uid()) = passenger_id and status = 'open');
