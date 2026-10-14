-- Driver dashboard (uix-spec 3.2): Set Route → Start Trip / End Trip, auto-end at the final stop,
-- live passenger counts and today's summary. Only Approved drivers (CLAUDE.md §6).

alter table public.buses
  add column make text,
  add column model text;
update public.buses set make = 'Toyota', model = 'Coaster' where plate like 'GLYDE-TEST-%';

/** The caller, if they are an approved driver; otherwise raises. */
create function public.require_approved_driver()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if not exists (select 1 from public.drivers where id = v_uid and status = 'approved') then
    raise exception 'not_approved' using errcode = '42501';
  end if;
  return v_uid;
end;
$$;

/**
 * Start Trip: today's scheduled trip for this bus + route nearest to now (passengers may have
 * booked it), else a new trip departing now. Assigns the driver and sets it running.
 * Errors: not_approved (42501), already_driving, bus_busy.
 */
create function public.driver_start_trip(p_bus_id uuid, p_route_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_approved_driver();
  v_trip uuid;
begin
  if exists (select 1 from public.trips where driver_id = v_uid and status = 'active') then
    raise exception 'already_driving';
  end if;
  perform 1 from public.buses where id = p_bus_id for update;
  if exists (select 1 from public.trips where bus_id = p_bus_id and status = 'active') then
    raise exception 'bus_busy';
  end if;

  select t.id into v_trip
  from public.trips t
  where t.bus_id = p_bus_id
    and t.route_id = p_route_id
    and t.status = 'scheduled'
    and (t.departs_at at time zone 'Africa/Accra')::date = (now() at time zone 'Africa/Accra')::date
  order by abs(extract(epoch from (t.departs_at - now())))
  limit 1;

  if v_trip is null then
    insert into public.trips (route_id, bus_id, departs_at, status, driver_id)
    values (p_route_id, p_bus_id, date_trunc('minute', now()), 'active', v_uid)
    returning id into v_trip;
  else
    update public.trips set status = 'active', driver_id = v_uid where id = v_trip;
  end if;
  return v_trip;
end;
$$;

/** End Trip (early or at the end). Existing triggers drop off riders and mark no-shows absent. */
create function public.driver_end_trip(p_trip_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_approved_driver();
begin
  update public.trips set status = 'completed'
  where id = p_trip_id and driver_id = v_uid and status = 'active';
  if not found then
    raise exception 'not_your_active_trip';
  end if;
end;
$$;

/** Trips end automatically when the bus reaches the final stop (uix-spec 3.2). */
create function public.auto_end_trip_at_final_stop()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.trips tr set status = 'completed'
  from public.routes r
  where tr.id = new.trip_id and tr.status = 'active' and r.id = tr.route_id and new.distance_m >= r.length_m;
  return new;
end;
$$;
create trigger bus_positions_auto_end after insert or update of distance_m on public.bus_positions
for each row execute function public.auto_end_trip_at_final_stop();

/** The caller's running trip (or null) with bus + route details for the dashboard. */
create function public.driver_current_trip()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'trip_id', t.id, 'departs_at', t.departs_at, 'route_id', r.id, 'route_name', r.name, 'direction', r.direction,
    'bus_id', b.id, 'plate', b.plate, 'make', b.make, 'model', b.model
  )
  from public.trips t join public.routes r on r.id = t.route_id join public.buses b on b.id = t.bus_id
  where t.driver_id = auth.uid() and t.status = 'active'
  order by t.departs_at desc
  limit 1;
$$;

/**
 * Passenger metrics for the driver's trip (uix-spec 3.2 Vehicle & Route): Scanned (boarded or
 * already dropped off), Expected (all paid tickets), Pending (paid, not yet scanned). Counts only.
 */
create function public.trip_passenger_counts(p_trip_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_approved_driver();
begin
  if not exists (select 1 from public.trips where id = p_trip_id and driver_id = v_uid) then
    raise exception 'not_your_trip' using errcode = '42501';
  end if;
  return (
    select jsonb_build_object(
      'scanned', count(*) filter (where status in ('boarded', 'completed')),
      'expected', count(*) filter (where status in ('reserved', 'boarded', 'completed', 'absent')),
      'pending', count(*) filter (where status = 'reserved'),
      'missed', count(*) filter (where status = 'absent')
    )
    from public.tickets where trip_id = p_trip_id
  );
end;
$$;

/** Daily Trip Summary (uix-spec 3.2): trips completed today + passengers transported today. */
create function public.driver_today_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_approved_driver();
begin
  return (
    select jsonb_build_object(
      'trips_completed', count(distinct t.id) filter (where t.status = 'completed'),
      'passengers', count(tk.id) filter (where tk.status = 'completed')
    )
    from public.trips t
    left join public.tickets tk on tk.trip_id = t.id
    where t.driver_id = v_uid
      and (t.departs_at at time zone 'Africa/Accra')::date = (now() at time zone 'Africa/Accra')::date
  );
end;
$$;

revoke execute on function public.require_approved_driver() from public, anon;
revoke execute on function public.driver_start_trip(uuid, uuid) from public, anon;
revoke execute on function public.driver_end_trip(uuid) from public, anon;
revoke execute on function public.driver_current_trip() from public, anon;
revoke execute on function public.trip_passenger_counts(uuid) from public, anon;
revoke execute on function public.driver_today_summary() from public, anon;
