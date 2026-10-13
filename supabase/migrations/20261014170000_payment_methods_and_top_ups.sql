-- Payments tab (uix-spec 2.6): saved payment methods + wallet top-ups.

create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  passenger_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('momo', 'card')),
  momo_network text check (momo_network in ('mtn', 'telecel', 'airteltigo')),
  momo_number text check (momo_number ~ '^\+233[25][0-9]{8}$'),
  -- Cards: only what a provider returns after its hosted page (never the card number).
  card_brand text check (char_length(card_brand) between 1 and 40),
  card_last4 text check (card_last4 ~ '^[0-9]{4}$'),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  check (
    (kind = 'momo' and momo_network is not null and momo_number is not null and card_last4 is null and card_brand is null)
    or (kind = 'card' and card_last4 is not null and card_brand is not null and momo_number is null and momo_network is null)
  ),
  unique (passenger_id, momo_number)
);
create unique index payment_methods_one_default on public.payment_methods (passenger_id) where is_default;

alter table public.payment_methods enable row level security;
create policy "read own methods" on public.payment_methods
  for select to authenticated using ((select auth.uid()) = passenger_id);
create policy "add own methods" on public.payment_methods
  for insert to authenticated with check ((select auth.uid()) = passenger_id);
create policy "remove own methods" on public.payment_methods
  for delete to authenticated using ((select auth.uid()) = passenger_id);
create policy "update own methods" on public.payment_methods
  for update to authenticated using ((select auth.uid()) = passenger_id) with check ((select auth.uid()) = passenger_id);

-- The first method a passenger adds becomes their default.
create function public.payment_methods_first_is_default()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from public.payment_methods where passenger_id = new.passenger_id and is_default) then
    new.is_default := true;
  end if;
  return new;
end;
$$;
create trigger payment_methods_first_default before insert on public.payment_methods
for each row execute function public.payment_methods_first_is_default();

-- Removing the default promotes the newest remaining method.
create function public.payment_methods_keep_a_default()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.is_default then
    update public.payment_methods set is_default = true
    where id = (
      select id from public.payment_methods
      where passenger_id = old.passenger_id
      order by created_at desc
      limit 1
    );
  end if;
  return old;
end;
$$;
create trigger payment_methods_keep_default after delete on public.payment_methods
for each row execute function public.payment_methods_keep_a_default();

/** Make one of the caller's methods the default (two steps: the one-default index is immediate). */
create function public.set_default_payment_method(p_method_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from public.payment_methods where id = p_method_id and passenger_id = auth.uid()) then
    raise exception 'not_found';
  end if;
  update public.payment_methods set is_default = false where passenger_id = auth.uid() and is_default and id <> p_method_id;
  update public.payment_methods set is_default = true where id = p_method_id;
end;
$$;
revoke execute on function public.set_default_payment_method(uuid) from public, anon;

-- ─── Wallet top-ups (credited only by the `pay` edge function after the provider approves) ──

/** Top-up limits (decision 2026-10-14): GHS 5 – GHS 1,000 per top-up. */
create function public.top_up_limits() returns int4range language sql immutable as $$ select int4range(500, 100000, '[]') $$;

create function public.credit_wallet(p_passenger_id uuid, p_amount_pesewas integer, p_provider_ref text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_balance integer;
begin
  if not (p_amount_pesewas <@ public.top_up_limits()) then
    raise exception 'amount_out_of_range';
  end if;
  update public.wallets set balance_pesewas = balance_pesewas + p_amount_pesewas, updated_at = now()
    where passenger_id = p_passenger_id
    returning balance_pesewas into v_balance;
  if v_balance is null then
    raise exception 'no_wallet';
  end if;
  insert into public.wallet_transactions (passenger_id, amount_pesewas, kind)
  values (p_passenger_id, p_amount_pesewas, 'top_up');
  return v_balance;
end;
$$;
revoke execute on function public.credit_wallet(uuid, integer, text) from public, anon, authenticated;
