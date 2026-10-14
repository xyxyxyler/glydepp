-- Edge cases (uix-spec 2.10): last bus, missed pickup (absent), deferments.
-- Decisions 2026-10-14: 3-minute pickup waiting period; the passenger moves a missed booking to
-- a later bus (same route + stops, same day, no charge), max 2 times.

-- ─── Last bus ───────────────────────────────────────────────────────────────
drop function public.trip_options(uuid, uuid);
CREATE FUNCTION public.trip_options(p_pickup_stop_id uuid, p_dropoff_stop_id uuid)
 RETURNS TABLE(trip_id uuid, route_id uuid, route_code text, direction route_direction, plate text, departs_at timestamp with time zone, trip_status trip_status, pickup_idx smallint, dropoff_idx smallint, pickup_distance_m integer, dropoff_distance_m integer, route_length_m integer, free_flow_s integer, bus_distance_m integer, bus_recorded_at timestamp with time zone, seat_count smallint, seats_free integer, passed boolean, is_last boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    coalesce(bp.distance_m >= pu.distance_m, false),
    -- uix-spec 2.10 "Last bus": the day's final trip on this route.
    not exists (
      select 1 from public.trips later
      where later.route_id = t.route_id
        and later.status in ('scheduled', 'active')
        and later.departs_at > t.departs_at
        and (later.departs_at at time zone 'Africa/Accra')::date = (t.departs_at at time zone 'Africa/Accra')::date
    )
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
$function$;

-- ─── Missed pickup → absent ─────────────────────────────────────────────────

/** Pickup waiting period after the bus reaches a stop (decision 2026-10-14). */
create function public.pickup_wait() returns interval language sql immutable as $$ select interval '3 minutes' $$;

-- When the bus first reached each stop (from the live position feed).
create table public.trip_stop_arrivals (
  trip_id uuid not null references public.trips (id) on delete cascade,
  stop_idx smallint not null,
  arrived_at timestamptz not null default now(),
  primary key (trip_id, stop_idx)
);
alter table public.trip_stop_arrivals enable row level security;
create policy "arrivals are public" on public.trip_stop_arrivals for select to anon, authenticated using (true);

create function public.record_arrivals_and_absences()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.trip_stop_arrivals (trip_id, stop_idx)
  select new.trip_id, rs.stop_idx
  from public.trips tr join public.route_stops rs on rs.route_id = tr.route_id
  where tr.id = new.trip_id and rs.distance_m <= new.distance_m
  on conflict do nothing;

  -- Not scanned within the waiting period → absent; the seat is released (CLAUDE.md §6).
  update public.tickets tk set status = 'absent'
  from public.trip_stop_arrivals a
  where tk.trip_id = new.trip_id
    and tk.status = 'reserved'
    and a.trip_id = tk.trip_id
    and a.stop_idx = tk.pickup_idx
    and a.arrived_at <= now() - public.pickup_wait();
  return new;
end;
$$;
create trigger bus_positions_arrivals after insert or update of distance_m on public.bus_positions
for each row execute function public.record_arrivals_and_absences();

-- Trip over: anyone never scanned missed it.
create function public.absent_on_trip_end()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.tickets set status = 'absent' where trip_id = new.id and status = 'reserved';
  return new;
end;
$$;
create trigger trips_absent_on_end after update of status on public.trips
for each row when (new.status in ('completed', 'cancelled') and old.status is distinct from new.status)
execute function public.absent_on_trip_end();

-- ─── Deferments ─────────────────────────────────────────────────────────────

/** Missed-trip deferments allowed per ticket (product doc §5). */
create function public.max_deferrals() returns smallint language sql immutable as $$ select 2::smallint $$;

alter table public.tickets add column deferral_count smallint not null default 0
  check (deferral_count between 0 and 2);

/**
 * Move a missed booking (its absent tickets) to a later bus today on the same route and stops.
 * Keeps each seat if it's free on the new bus, otherwise the lowest free seat. No charge.
 * Errors (P0001): not_found, nothing_to_move, no_deferrals_left, not_later_same_day, bus_passed,
 * no_seats.
 */
create function public.defer_booking(p_payment_id uuid, p_new_trip_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_old record;
  v_new record;
  v_ticket record;
  v_seat smallint;
  v_seat_count smallint;
  v_moved int := 0;
begin
  select p.id, p.trip_id, tr.route_id, tr.departs_at
    into v_old
  from public.payments p join public.trips tr on tr.id = p.trip_id
  where p.id = p_payment_id and p.passenger_id = v_uid and p.status = 'succeeded';
  if v_old.id is null then
    raise exception 'not_found';
  end if;

  select tr.id, tr.route_id, tr.departs_at, tr.status, l.seat_count
    into v_new
  from public.trips tr join public.buses b on b.id = tr.bus_id join public.seat_layouts l on l.id = b.layout_id
  where tr.id = p_new_trip_id
  for update of tr;
  if v_new.id is null or v_new.route_id <> v_old.route_id or v_new.status not in ('scheduled', 'active')
     or v_new.departs_at <= v_old.departs_at
     or (v_new.departs_at at time zone 'Africa/Accra')::date <> (now() at time zone 'Africa/Accra')::date
     or (v_old.departs_at at time zone 'Africa/Accra')::date <> (now() at time zone 'Africa/Accra')::date then
    raise exception 'not_later_same_day';
  end if;
  v_seat_count := v_new.seat_count;

  for v_ticket in
    select * from public.tickets where payment_id = p_payment_id and status = 'absent' order by seat_no for update
  loop
    if v_ticket.deferral_count >= public.max_deferrals() then
      raise exception 'no_deferrals_left';
    end if;
    if not public.trip_can_board_at(p_new_trip_id, v_ticket.pickup_idx) then
      raise exception 'bus_passed';
    end if;
    -- Same seat if free for this segment on the new bus, else the lowest free seat.
    select s.n into v_seat
    from generate_series(1, v_seat_count) as s (n)
    where not exists (
      select 1 from public.tickets o
      where o.trip_id = p_new_trip_id and o.seat_no = s.n
        and (o.status in ('reserved', 'boarded') or (o.status = 'held' and o.hold_expires_at > now()))
        and int4range(o.pickup_idx, o.dropoff_idx) && int4range(v_ticket.pickup_idx, v_ticket.dropoff_idx)
    )
    order by (s.n = v_ticket.seat_no) desc, s.n
    limit 1;
    if v_seat is null then
      raise exception 'no_seats';
    end if;
    update public.tickets
      set trip_id = p_new_trip_id, seat_no = v_seat, status = 'reserved', deferral_count = deferral_count + 1
      where id = v_ticket.id;
    v_moved := v_moved + 1;
  end loop;

  if v_moved = 0 then
    raise exception 'nothing_to_move';
  end if;
  update public.payments set trip_id = p_new_trip_id where id = p_payment_id;
  return jsonb_build_object('moved', v_moved, 'trip_id', p_new_trip_id);
end;
$$;
revoke execute on function public.defer_booking(uuid, uuid) from public, anon;
