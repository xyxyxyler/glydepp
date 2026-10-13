-- Glyde core schema: routes, stops, buses, trips, per-seat tickets, live bus positions.
-- Domain rules: CLAUDE.md §6. Seat allocation is segment-aware and enforced here, not only in clients.

create extension if not exists btree_gist with schema extensions;

-- ─── Enums ──────────────────────────────────────────────────────────────────

create type public.route_direction as enum ('inbound', 'outbound');
create type public.bus_status as enum ('active', 'standby', 'maintenance', 'inactive');
create type public.trip_status as enum ('scheduled', 'active', 'completed', 'cancelled');
-- reserved: paid, not yet scanned · boarded: QR scanned · completed: dropped off
-- absent: not scanned within the pickup window · cancelled: released for any other reason
create type public.ticket_status as enum ('reserved', 'boarded', 'completed', 'absent', 'cancelled');

-- ─── Network ────────────────────────────────────────────────────────────────

create table public.stops (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  created_at timestamptz not null default now()
);

create table public.routes (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  direction public.route_direction not null,
  length_m integer not null check (length_m > 0),
  created_at timestamptz not null default now(),
  unique (code, direction)
);

-- Stops are ordered and indexed per route; the index increases in the direction of travel.
create table public.route_stops (
  route_id uuid not null references public.routes (id) on delete cascade,
  stop_idx smallint not null check (stop_idx >= 0),
  stop_id uuid not null references public.stops (id),
  distance_m integer not null check (distance_m >= 0), -- along the route from stop 0
  primary key (route_id, stop_idx),
  unique (route_id, stop_id)
);

-- Road geometry: JSON array of {latitude, longitude}, in direction of travel.
create table public.route_paths (
  route_id uuid primary key references public.routes (id) on delete cascade,
  path jsonb not null check (jsonb_typeof(path) = 'array')
);

-- ─── Fleet ──────────────────────────────────────────────────────────────────

-- grid: rows (front → back) of cells {"type": "seat", "no": 1} | {"type": "aisle" | "driver" | "door" | "empty"}.
-- Seats are numbered 1..seat_count.
create table public.seat_layouts (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  seat_count smallint not null check (seat_count > 0),
  grid jsonb not null check (jsonb_typeof(grid) = 'array')
);

create table public.buses (
  id uuid primary key default gen_random_uuid(),
  plate text not null unique,
  layout_id uuid not null references public.seat_layouts (id),
  status public.bus_status not null default 'active',
  created_at timestamptz not null default now()
);

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.routes (id),
  bus_id uuid not null references public.buses (id),
  departs_at timestamptz not null, -- stored UTC, displayed Africa/Accra
  status public.trip_status not null default 'scheduled',
  created_at timestamptz not null default now(),
  unique (bus_id, departs_at)
);
create index trips_route_departs_idx on public.trips (route_id, departs_at);

-- ─── Tickets (one per seat) ─────────────────────────────────────────────────

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  seat_no smallint not null check (seat_no > 0),
  pickup_idx smallint not null check (pickup_idx >= 0),
  dropoff_idx smallint not null,
  status public.ticket_status not null default 'reserved',
  fare_pesewas integer not null check (fare_pesewas >= 0),
  passenger_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check (pickup_idx < dropoff_idx),
  -- A seat is occupied only for [pickup_idx, dropoff_idx). Two live tickets on the same trip
  -- and seat conflict only if their ranges overlap. Absent/cancelled/completed tickets release it.
  constraint tickets_no_seat_overlap exclude using gist (
    trip_id with =,
    seat_no with =,
    int4range(pickup_idx, dropoff_idx) with &&
  ) where (status in ('reserved', 'boarded'))
);
create index tickets_passenger_idx on public.tickets (passenger_id);

-- Seat must exist on the trip's bus; stops must exist on the trip's route.
create function public.tickets_validate()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_seat_count smallint;
  v_last_idx smallint;
begin
  select l.seat_count, (select max(rs.stop_idx) from public.route_stops rs where rs.route_id = t.route_id)
    into v_seat_count, v_last_idx
  from public.trips t
  join public.buses b on b.id = t.bus_id
  join public.seat_layouts l on l.id = b.layout_id
  where t.id = new.trip_id;

  if v_seat_count is null then
    raise exception 'trip % not found', new.trip_id using errcode = 'foreign_key_violation';
  end if;
  if new.seat_no > v_seat_count then
    raise exception 'seat % does not exist on this bus (1..%)', new.seat_no, v_seat_count using errcode = 'check_violation';
  end if;
  if new.dropoff_idx > v_last_idx then
    raise exception 'stop index % is not on this route (0..%)', new.dropoff_idx, v_last_idx using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger tickets_validate
before insert or update of trip_id, seat_no, pickup_idx, dropoff_idx on public.tickets
for each row execute function public.tickets_validate();

-- ─── Live positions ─────────────────────────────────────────────────────────

-- Latest fix per trip (upserted by the GPS feed; broadcast via Realtime).
create table public.bus_positions (
  trip_id uuid primary key references public.trips (id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  heading real, -- degrees clockwise from north
  speed_mps real,
  distance_m integer not null check (distance_m >= 0), -- progress along the route
  recorded_at timestamptz not null default now()
);

alter publication supabase_realtime add table public.bus_positions;

-- Booking is allowed only if the trip is running or scheduled and the bus has not passed the pickup.
create function public.trip_can_board_at(p_trip_id uuid, p_pickup_idx integer)
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((
    select t.status in ('scheduled', 'active')
       and (bp.distance_m is null or bp.distance_m < rs.distance_m)
    from public.trips t
    join public.route_stops rs on rs.route_id = t.route_id and rs.stop_idx = p_pickup_idx
    left join public.bus_positions bp on bp.trip_id = t.id
    where t.id = p_trip_id
  ), false);
$$;

-- Occupied seat segments for a trip, for segment-aware seat grids. Exposes no passenger data.
create function public.trip_seat_segments(p_trip_id uuid)
returns table (seat_no smallint, pickup_idx smallint, dropoff_idx smallint)
language sql
stable
security definer
set search_path = ''
as $$
  select t.seat_no, t.pickup_idx, t.dropoff_idx
  from public.tickets t
  where t.trip_id = p_trip_id and t.status in ('reserved', 'boarded');
$$;

-- ─── Row-level security ─────────────────────────────────────────────────────
-- Reference data and positions: readable by everyone using the app. Writes: service role only.
-- Tickets: no client access yet; booking will go through security-definer functions (step 4).

alter table public.stops enable row level security;
alter table public.routes enable row level security;
alter table public.route_stops enable row level security;
alter table public.route_paths enable row level security;
alter table public.seat_layouts enable row level security;
alter table public.buses enable row level security;
alter table public.trips enable row level security;
alter table public.tickets enable row level security;
alter table public.bus_positions enable row level security;

create policy "stops are public" on public.stops for select to anon, authenticated using (true);
create policy "routes are public" on public.routes for select to anon, authenticated using (true);
create policy "route stops are public" on public.route_stops for select to anon, authenticated using (true);
create policy "route paths are public" on public.route_paths for select to anon, authenticated using (true);
create policy "seat layouts are public" on public.seat_layouts for select to anon, authenticated using (true);
create policy "buses are public" on public.buses for select to anon, authenticated using (true);
create policy "trips are public" on public.trips for select to anon, authenticated using (true);
create policy "bus positions are public" on public.bus_positions for select to anon, authenticated using (true);
