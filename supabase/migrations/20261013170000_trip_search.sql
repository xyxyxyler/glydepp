-- Trip search (uix-spec 2.3): fare rules, route travel time, and trip options for a stop pair.

-- OSRM free-flow driving time for the whole route (no traffic, no dwell). ETAs scale it by distance.
alter table public.routes add column free_flow_s integer check (free_flow_s > 0);

-- Fare anatomy (uix-spec HQ "Revenue Breakdown"): base fare for the distance and seat,
-- fixed per-seat booking fee, percentage platform fee, minus discounts; HQ dynamic-pricing
-- multiplier applies to the base. No rows = fares not yet set (the app shows "Fare pending").
create table public.fare_rules (
  id uuid primary key default gen_random_uuid(),
  route_code text not null,
  per_km_pesewas integer not null check (per_km_pesewas >= 0),
  booking_fee_pesewas integer not null check (booking_fee_pesewas >= 0),
  platform_fee_bps integer not null check (platform_fee_bps between 0 and 10000), -- 100 bps = 1%
  peak_multiplier numeric(4, 2) not null default 1.00 check (peak_multiplier > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index fare_rules_one_active_per_route on public.fare_rules (route_code) where active;

alter table public.fare_rules enable row level security;
create policy "fare rules are public" on public.fare_rules for select to anon, authenticated using (true);

-- Today's trips (Africa/Accra) that serve pickup → dropoff in their direction of travel, with
-- seats free for that segment. `passed` = the bus is already past the pickup (booking blocked);
-- passed trips are returned so the app can say "all buses have passed". Counts only — no ticket
-- or passenger data leaves the database.
create function public.trip_options(p_pickup_stop_id uuid, p_dropoff_stop_id uuid)
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
        and tk.status in ('reserved', 'boarded')
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
    -- A scheduled trip that should already have reached the pickup but never started is missed.
    and (
      t.status = 'active'
      or t.departs_at + make_interval(secs => coalesce(r.free_flow_s, 0) * pu.distance_m::double precision / r.length_m) > now()
    )
  order by t.departs_at;
$$;
