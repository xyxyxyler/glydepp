-- Seat grid: a passenger's OWN unpaid hold must not show as "taken" to them (they go back from
-- Payment to change seats; hold_seats replaces their previous hold anyway). Others still see it.
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
    and (t.status in ('reserved', 'boarded') or (t.status = 'held' and t.hold_expires_at > now()))
    and not (t.status = 'held' and t.passenger_id is not distinct from auth.uid());
$$;
