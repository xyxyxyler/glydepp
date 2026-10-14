-- Starting a trip puts the bus on the map at its first stop (uix-spec 2.2: passengers see live buses).
CREATE OR REPLACE FUNCTION public.driver_start_trip(p_bus_id uuid, p_route_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  -- Show the bus straight away: at the route's first stop until the GPS feed takes over.
  insert into public.bus_positions (trip_id, latitude, longitude, distance_m)
  select v_trip, s.latitude, s.longitude, rs.distance_m
  from public.trips t
  join public.route_stops rs on rs.route_id = t.route_id and rs.stop_idx = 0
  join public.stops s on s.id = rs.stop_id
  where t.id = v_trip
  on conflict (trip_id) do nothing;
  return v_trip;
end;
$function$;
