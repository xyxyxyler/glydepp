-- Boarding + drop-off (uix-spec 2.5; CLAUDE.md §6).
--   validate_ticket()  the conductor's scan (QR token or Ticket ID): genuine, paid, this bus,
--                      not used → boarded immediately. No overrides, no manual adds.
--   drop-off           a boarded ticket completes when the bus reaches its drop-off, and when
--                      the trip ends.

-- Who is driving (assigned by Set Route in the Driver app — next driver task).
alter table public.trips add column driver_id uuid references public.drivers (id);

/**
 * Scan result for the conductor/driver device. Business outcomes are returned (never raised) so
 * the scanner can show them: ok | not_found | already_used | wrong_bus | not_paid | not_valid.
 */
create function public.validate_ticket(p_trip_id uuid, p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_trip record;
  v_code text := btrim(coalesce(p_code, ''));
  v_ticket record;
begin
  if not exists (select 1 from public.drivers d where d.id = v_uid and d.status = 'approved') then
    raise exception 'not_authorised' using errcode = '42501';
  end if;
  select t.id, t.status, t.driver_id into v_trip from public.trips t where t.id = p_trip_id;
  if v_trip.id is null or v_trip.status not in ('scheduled', 'active') then
    return jsonb_build_object('result', 'trip_not_running');
  end if;
  -- Until Set Route assigns drivers, any approved driver may scan an unassigned trip.
  if v_trip.driver_id is not null and v_trip.driver_id <> v_uid then
    raise exception 'not_authorised' using errcode = '42501';
  end if;

  if v_code ilike 'GLYDE1:%' then
    v_code := substr(v_code, 8);
  end if;
  select tk.*, ps.name as pickup_name, ds.name as dropoff_name
    into v_ticket
  from public.tickets tk
  join public.trips tr on tr.id = tk.trip_id
  join public.route_stops pr on pr.route_id = tr.route_id and pr.stop_idx = tk.pickup_idx
  join public.stops ps on ps.id = pr.stop_id
  join public.route_stops dr on dr.route_id = tr.route_id and dr.stop_idx = tk.dropoff_idx
  join public.stops ds on ds.id = dr.stop_id
  where tk.qr_token = v_code or tk.ticket_code = upper(v_code)
  for update of tk;

  if v_ticket.id is null then
    return jsonb_build_object('result', 'not_found');
  end if;
  if v_ticket.trip_id <> p_trip_id then
    return jsonb_build_object('result', 'wrong_bus', 'ticket_code', v_ticket.ticket_code);
  end if;
  if v_ticket.status in ('boarded', 'completed') then
    return jsonb_build_object('result', 'already_used', 'ticket_code', v_ticket.ticket_code, 'seat_no', v_ticket.seat_no);
  end if;
  if v_ticket.status = 'held' then
    return jsonb_build_object('result', 'not_paid', 'ticket_code', v_ticket.ticket_code);
  end if;
  if v_ticket.status <> 'reserved' then
    return jsonb_build_object('result', 'not_valid', 'ticket_code', v_ticket.ticket_code);
  end if;

  update public.tickets set status = 'boarded' where id = v_ticket.id;
  return jsonb_build_object(
    'result', 'ok',
    'ticket_code', v_ticket.ticket_code,
    'seat_no', v_ticket.seat_no,
    'pickup', v_ticket.pickup_name,
    'dropoff', v_ticket.dropoff_name
  );
end;
$$;
revoke execute on function public.validate_ticket(uuid, text) from public, anon;

-- Drop-off: complete boarded tickets once the bus reaches their stop.
create function public.complete_dropped_off_tickets()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.tickets tk set status = 'completed'
  from public.trips tr, public.route_stops dr
  where tk.trip_id = new.trip_id
    and tk.status = 'boarded'
    and tr.id = tk.trip_id
    and dr.route_id = tr.route_id
    and dr.stop_idx = tk.dropoff_idx
    and dr.distance_m <= new.distance_m;
  return new;
end;
$$;
create trigger bus_positions_drop_off after insert or update of distance_m on public.bus_positions
for each row execute function public.complete_dropped_off_tickets();

-- Trip ended (at the final stop or early): everyone still on board has been dropped off.
create function public.complete_tickets_on_trip_end()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.tickets set status = 'completed' where trip_id = new.id and status = 'boarded';
  return new;
end;
$$;
create trigger trips_complete_tickets after update of status on public.trips
for each row when (new.status = 'completed' and old.status is distinct from 'completed')
execute function public.complete_tickets_on_trip_end();

-- Passengers get their own ticket changes live (RLS limits Realtime to their own rows).
alter publication supabase_realtime add table public.tickets;
