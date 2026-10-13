-- Payment (uix-spec 2.3) — server-authoritative booking:
--   hold_seats()        Proceed to Payment: validate, price on the server, hold seats 3 min
--   confirm_payment()   provider said yes: held → reserved (one ticket per seat)
--   record_payment_failure()  provider said no: hold stays so the passenger can retry
-- Payments are MOCKED in the prototype (CLAUDE.md §4) behind the PaymentProvider interface in
-- the `pay` edge function; only that function (service role) may confirm or fail a payment.

-- ─── Payments ───────────────────────────────────────────────────────────────

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  passenger_id uuid not null references auth.users (id) on delete cascade,
  trip_id uuid not null references public.trips (id),
  amount_pesewas integer not null check (amount_pesewas >= 0),
  status text not null default 'pending' check (status in ('pending', 'succeeded', 'expired')),
  method text check (method in ('wallet', 'momo', 'card')), -- last method tried
  provider text, -- e.g. 'mock', 'wallet'
  provider_ref text,
  failure_reason text, -- last failed attempt, plain language
  attempts smallint not null default 0,
  expires_at timestamptz not null, -- end of the seat hold
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index payments_passenger_idx on public.payments (passenger_id, created_at desc);

-- ─── Tickets: holds ─────────────────────────────────────────────────────────

alter table public.tickets
  add column payment_id uuid references public.payments (id),
  add column hold_expires_at timestamptz,
  add constraint tickets_hold_has_expiry check ((status = 'held') = (hold_expires_at is not null));
create index tickets_payment_idx on public.tickets (payment_id);

-- Held seats block others too. Expired holds are released (cancelled) before any new hold.
alter table public.tickets drop constraint tickets_no_seat_overlap;
alter table public.tickets add constraint tickets_no_seat_overlap exclude using gist (
  trip_id with =,
  seat_no with =,
  int4range(pickup_idx, dropoff_idx) with &&
) where (status in ('held', 'reserved', 'boarded'));

-- Passengers can read their own tickets (Ticket screen, My trips). Writes go through functions.
create policy "read own tickets" on public.tickets
  for select to authenticated using ((select auth.uid()) = passenger_id);

alter table public.payments enable row level security;
create policy "read own payments" on public.payments
  for select to authenticated using ((select auth.uid()) = passenger_id);

-- ─── Wallet (prototype: each passenger starts with a labelled test balance) ─

create table public.wallets (
  passenger_id uuid primary key references auth.users (id) on delete cascade,
  balance_pesewas integer not null default 0 check (balance_pesewas >= 0),
  updated_at timestamptz not null default now()
);
create table public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  passenger_id uuid not null references auth.users (id) on delete cascade,
  amount_pesewas integer not null, -- + credit, − debit
  kind text not null check (kind in ('test_credit', 'payment', 'refund', 'top_up')),
  payment_id uuid references public.payments (id),
  created_at timestamptz not null default now()
);
alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;
create policy "read own wallet" on public.wallets
  for select to authenticated using ((select auth.uid()) = passenger_id);
create policy "read own wallet transactions" on public.wallet_transactions
  for select to authenticated using ((select auth.uid()) = passenger_id);

/** Prototype test balance credited when a wallet is first opened. */
create function public.wallet_test_credit_pesewas() returns integer language sql immutable as $$ select 10000 $$;

-- The caller's wallet balance; opens the wallet (with the test credit) on first use.
create function public.my_wallet()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_balance integer;
begin
  if v_uid is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  insert into public.wallets (passenger_id, balance_pesewas)
  values (v_uid, public.wallet_test_credit_pesewas())
  on conflict (passenger_id) do nothing;
  if found then
    insert into public.wallet_transactions (passenger_id, amount_pesewas, kind)
    values (v_uid, public.wallet_test_credit_pesewas(), 'test_credit');
  end if;
  select balance_pesewas into v_balance from public.wallets where passenger_id = v_uid;
  return v_balance;
end;
$$;

-- ─── Fare (server copy of packages/domain seatFare — keep identical) ────────

create function public.seat_fare_pesewas(p_route_code text, p_distance_m integer)
returns integer
language sql
stable
set search_path = ''
as $$
  select base + r.booking_fee_pesewas + round(base * r.platform_fee_bps / 10000.0)::integer
  from public.fare_rules r,
       lateral (select round((r.base_pesewas + r.per_km_pesewas * p_distance_m / 1000.0) * r.peak_multiplier)::integer as base) b
  where r.route_code = p_route_code and r.active;
$$;

-- ─── Holds ──────────────────────────────────────────────────────────────────

create function public.release_expired_holds(p_trip_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.payments p set status = 'expired'
  where p.trip_id = p_trip_id and p.status = 'pending' and p.expires_at <= now();
  update public.tickets t set status = 'cancelled', hold_expires_at = null
  where t.trip_id = p_trip_id and t.status = 'held' and t.hold_expires_at <= now();
$$;

/**
 * Proceed to Payment. p_seats: [{"dropoff_stop_id": uuid, "seat_no": int}, ...] — one per
 * passenger, all from p_pickup_stop_id. Prices on the server, holds the seats for 3 minutes and
 * returns {payment_id, amount_pesewas, expires_at, tickets:[{id, seat_no, fare_pesewas}]}.
 * Errors (SQLSTATE P0001, message = code): not_bookable, bus_passed, bad_stops, seat_taken,
 * fare_not_set.
 */
create function public.hold_seats(p_trip_id uuid, p_pickup_stop_id uuid, p_seats jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_trip record;
  v_pickup record;
  v_payment uuid;
  v_expires timestamptz := now() + interval '3 minutes';
  v_total integer := 0;
  v_seat jsonb;
  v_dropoff record;
  v_fare integer;
  v_tickets jsonb := '[]'::jsonb;
  v_ticket uuid;
begin
  if v_uid is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  if jsonb_typeof(p_seats) <> 'array' or jsonb_array_length(p_seats) = 0 then
    raise exception 'bad_stops';
  end if;

  -- One hold at a time per trip (serialises seat races).
  select t.id, t.status, t.departs_at, r.id as route_id, r.code
    into v_trip
  from public.trips t join public.routes r on r.id = t.route_id
  where t.id = p_trip_id
  for update of t;
  if v_trip.id is null or v_trip.status not in ('scheduled', 'active')
     or (v_trip.departs_at at time zone 'Africa/Accra')::date <> (now() at time zone 'Africa/Accra')::date then
    raise exception 'not_bookable';
  end if;

  perform public.release_expired_holds(p_trip_id);
  -- Coming back to pay again replaces this passenger's previous unpaid hold on the trip.
  update public.payments set status = 'expired'
    where trip_id = p_trip_id and passenger_id = v_uid and status = 'pending';
  update public.tickets set status = 'cancelled', hold_expires_at = null
    where trip_id = p_trip_id and passenger_id = v_uid and status = 'held';

  select rs.stop_idx, rs.distance_m into v_pickup
  from public.route_stops rs where rs.route_id = v_trip.route_id and rs.stop_id = p_pickup_stop_id;
  if v_pickup.stop_idx is null then
    raise exception 'bad_stops';
  end if;
  if not public.trip_can_board_at(p_trip_id, v_pickup.stop_idx) then
    raise exception 'bus_passed';
  end if;

  insert into public.payments (passenger_id, trip_id, amount_pesewas, expires_at)
  values (v_uid, p_trip_id, 0, v_expires)
  returning id into v_payment;

  for v_seat in select * from jsonb_array_elements(p_seats) loop
    select rs.stop_idx, rs.distance_m into v_dropoff
    from public.route_stops rs
    where rs.route_id = v_trip.route_id and rs.stop_id = (v_seat ->> 'dropoff_stop_id')::uuid;
    if v_dropoff.stop_idx is null or v_dropoff.stop_idx <= v_pickup.stop_idx then
      raise exception 'bad_stops';
    end if;
    v_fare := public.seat_fare_pesewas(v_trip.code, v_dropoff.distance_m - v_pickup.distance_m);
    if v_fare is null then
      raise exception 'fare_not_set';
    end if;
    begin
      insert into public.tickets (trip_id, seat_no, pickup_idx, dropoff_idx, status, fare_pesewas,
                                  passenger_id, payment_id, hold_expires_at)
      values (p_trip_id, (v_seat ->> 'seat_no')::smallint, v_pickup.stop_idx, v_dropoff.stop_idx, 'held', v_fare,
              v_uid, v_payment, v_expires)
      returning id into v_ticket;
    exception when exclusion_violation then
      raise exception 'seat_taken' using detail = (v_seat ->> 'seat_no');
    end;
    v_total := v_total + v_fare;
    v_tickets := v_tickets || jsonb_build_object('id', v_ticket, 'seat_no', (v_seat ->> 'seat_no')::int, 'fare_pesewas', v_fare);
  end loop;

  update public.payments set amount_pesewas = v_total where id = v_payment;
  return jsonb_build_object('payment_id', v_payment, 'amount_pesewas', v_total, 'expires_at', v_expires, 'tickets', v_tickets);
end;
$$;

-- ─── Outcomes (service role only: called by the `pay` edge function) ────────

/**
 * The provider approved (or the wallet covers it): tickets held → reserved.
 * Returns 'succeeded' | 'expired' | 'insufficient_funds' | 'not_pending'.
 */
create function public.confirm_payment(p_payment_id uuid, p_method text, p_provider text, p_provider_ref text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pay record;
begin
  select * into v_pay from public.payments where id = p_payment_id for update;
  if v_pay.id is null or v_pay.status <> 'pending' then
    return 'not_pending';
  end if;
  if v_pay.expires_at <= now()
     or exists (select 1 from public.tickets where payment_id = p_payment_id and status <> 'held') then
    update public.payments set status = 'expired' where id = p_payment_id;
    update public.tickets set status = 'cancelled', hold_expires_at = null
      where payment_id = p_payment_id and status = 'held';
    return 'expired';
  end if;

  if p_method = 'wallet' then
    update public.wallets set balance_pesewas = balance_pesewas - v_pay.amount_pesewas, updated_at = now()
      where passenger_id = v_pay.passenger_id and balance_pesewas >= v_pay.amount_pesewas;
    if not found then
      update public.payments
        set method = p_method, failure_reason = 'Not enough money in your wallet.', attempts = attempts + 1
        where id = p_payment_id;
      return 'insufficient_funds';
    end if;
    insert into public.wallet_transactions (passenger_id, amount_pesewas, kind, payment_id)
    values (v_pay.passenger_id, -v_pay.amount_pesewas, 'payment', p_payment_id);
  end if;

  update public.payments
    set status = 'succeeded', method = p_method, provider = p_provider, provider_ref = p_provider_ref,
        failure_reason = null, attempts = attempts + 1, paid_at = now()
    where id = p_payment_id;
  update public.tickets set status = 'reserved', hold_expires_at = null
    where payment_id = p_payment_id and status = 'held';
  return 'succeeded';
end;
$$;

/** The provider declined: keep the hold (retry or another method) until it expires. */
create function public.record_payment_failure(p_payment_id uuid, p_method text, p_reason text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.payments set method = p_method, failure_reason = p_reason, attempts = attempts + 1
  where id = p_payment_id and status = 'pending';
$$;

revoke execute on function public.confirm_payment(uuid, text, text, text) from public, anon, authenticated;
revoke execute on function public.record_payment_failure(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.release_expired_holds(uuid) from public, anon, authenticated;
revoke execute on function public.hold_seats(uuid, uuid, jsonb) from public, anon;
revoke execute on function public.my_wallet() from public, anon;

-- ─── Seat counts ignore expired holds ───────────────────────────────────────

create or replace function public.trip_seat_segments(p_trip_id uuid)
returns table (seat_no smallint, pickup_idx smallint, dropoff_idx smallint)
language sql
stable
security definer
set search_path = ''
as $$
  select t.seat_no, t.pickup_idx, t.dropoff_idx
  from public.tickets t
  where t.trip_id = p_trip_id
    and (t.status in ('reserved', 'boarded') or (t.status = 'held' and t.hold_expires_at > now()));
$$;

create or replace function public.trip_options(p_pickup_stop_id uuid, p_dropoff_stop_id uuid)
returns table (
  trip_id uuid,
  route_id uuid,
  route_code text,
  direction public.route_direction,
  plate text,
  departs_at timestamptz,
  trip_status public.trip_status,
  pickup_idx smallint,
  dropoff_idx smallint,
  pickup_distance_m integer,
  dropoff_distance_m integer,
  route_length_m integer,
  free_flow_s integer,
  bus_distance_m integer,
  bus_recorded_at timestamptz,
  seat_count smallint,
  seats_free integer,
  passed boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    t.id, r.id, r.code, r.direction, b.plate, t.departs_at, t.status,
    pu.stop_idx, dr.stop_idx, pu.distance_m, dr.distance_m, r.length_m, r.free_flow_s,
    bp.distance_m, bp.recorded_at,
    l.seat_count,
    l.seat_count - (
      select count(distinct tk.seat_no)::integer
      from public.tickets tk
      where tk.trip_id = t.id
        and (tk.status in ('reserved', 'boarded') or (tk.status = 'held' and tk.hold_expires_at > now()))
        and int4range(tk.pickup_idx, tk.dropoff_idx) && int4range(pu.stop_idx, dr.stop_idx)
    ),
    coalesce(bp.distance_m >= pu.distance_m, false)
  from public.trips t
  join public.routes r on r.id = t.route_id
  join public.route_stops pu on pu.route_id = r.id and pu.stop_id = p_pickup_stop_id
  join public.route_stops dr on dr.route_id = r.id and dr.stop_id = p_dropoff_stop_id and dr.stop_idx > pu.stop_idx
  join public.buses b on b.id = t.bus_id
  join public.seat_layouts l on l.id = b.layout_id
  left join public.bus_positions bp on bp.trip_id = t.id
  where t.status in ('scheduled', 'active')
    and (t.departs_at at time zone 'Africa/Accra')::date = (now() at time zone 'Africa/Accra')::date
    and (
      t.status = 'active'
      or t.departs_at + make_interval(secs => coalesce(r.free_flow_s, 0) * pu.distance_m::double precision / r.length_m) > now()
    )
  order by t.departs_at;
$$;
