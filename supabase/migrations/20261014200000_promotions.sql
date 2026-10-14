-- Promotions (uix-spec 2.9 NB): discounts applied on the server when seats are held.
-- No promotions are seeded (decision 2026-10-14): HQ adds real offers.

create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 80),
  description text,
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  discount_value integer not null check (discount_value > 0), -- percent (1–100) or pesewas
  route_code text, -- null = every route
  valid_from timestamptz not null default now(),
  valid_until timestamptz not null,
  active boolean not null default true,
  max_uses_per_passenger integer not null default 1 check (max_uses_per_passenger > 0),
  created_at timestamptz not null default now(),
  check (discount_type <> 'percent' or discount_value <= 100),
  check (valid_until > valid_from)
);
alter table public.promotions enable row level security;
create policy "current promotions are visible" on public.promotions
  for select to authenticated using (active and now() between valid_from and valid_until);

create table public.promotion_redemptions (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references public.promotions (id),
  passenger_id uuid not null references auth.users (id) on delete cascade,
  payment_id uuid not null unique references public.payments (id),
  discount_pesewas integer not null check (discount_pesewas >= 0),
  created_at timestamptz not null default now()
);
alter table public.promotion_redemptions enable row level security;
create policy "read own redemptions" on public.promotion_redemptions
  for select to authenticated using ((select auth.uid()) = passenger_id);

alter table public.payments
  add column gross_pesewas integer check (gross_pesewas >= 0),
  add column discount_pesewas integer not null default 0 check (discount_pesewas >= 0),
  add column promotion_id uuid references public.promotions (id);

-- A promotion counts as used only when the booking is actually paid.
create function public.record_promotion_redemption()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.promotion_id is not null and new.discount_pesewas > 0 then
    insert into public.promotion_redemptions (promotion_id, passenger_id, payment_id, discount_pesewas)
    values (new.promotion_id, new.passenger_id, new.id, new.discount_pesewas)
    on conflict (payment_id) do nothing;
  end if;
  return new;
end;
$$;
create trigger payments_record_redemption after update of status on public.payments
for each row when (new.status = 'succeeded' and old.status is distinct from 'succeeded')
execute function public.record_promotion_redemption();

-- hold_seats: + best eligible promotion (definition below extends the deployed one).
CREATE OR REPLACE FUNCTION public.hold_seats(p_trip_id uuid, p_pickup_stop_id uuid, p_seats jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  v_promo record;
  v_discount integer := 0;
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

  -- Best eligible promotion (fare anatomy: "Total Discounts"), applied on the server.
  select p.id, p.title,
         least(v_total, case when p.discount_type = 'percent' then round(v_total * p.discount_value / 100.0)::integer
                             else p.discount_value end) as discount
    into v_promo
  from public.promotions p
  where p.active
    and now() between p.valid_from and p.valid_until
    and (p.route_code is null or p.route_code = v_trip.code)
    and (select count(*) from public.promotion_redemptions r
         where r.promotion_id = p.id and r.passenger_id = v_uid) < p.max_uses_per_passenger
  order by discount desc, p.valid_until
  limit 1;
  v_discount := coalesce(v_promo.discount, 0);

  update public.payments
    set gross_pesewas = v_total, discount_pesewas = v_discount, amount_pesewas = v_total - v_discount,
        promotion_id = v_promo.id
    where id = v_payment;
  return jsonb_build_object(
    'payment_id', v_payment,
    'gross_pesewas', v_total,
    'discount_pesewas', v_discount,
    'promotion_title', v_promo.title,
    'amount_pesewas', v_total - v_discount,
    'expires_at', v_expires,
    'tickets', v_tickets
  );
end;
$function$;
