-- Ticket identity + sharing (uix-spec 2.5, CLAUDE.md §6).
--   qr_token     long random secret encoded in the QR; unguessable, so QRs can't be forged.
--   ticket_code  short human-readable Ticket ID (GLY-XXXXXX) for display and manual entry.
--   ticket_shares  one time-bound link per ticket: valid until the trip ends (decision
--                  2026-10-14), "On Trip" after the scan, invalid after drop-off.

create function public.new_ticket_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKMNPQRSTVWXYZ'; -- no 0/O, 1/I/L, U
  code text;
begin
  loop
    code := 'GLY-';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.tickets t where t.ticket_code = code);
  end loop;
  return code;
end;
$$;

alter table public.tickets
  add column qr_token text not null default encode(extensions.gen_random_bytes(18), 'hex'),
  add column ticket_code text not null default public.new_ticket_code();
alter table public.tickets add constraint tickets_qr_token_key unique (qr_token);
alter table public.tickets add constraint tickets_ticket_code_key unique (ticket_code);

create table public.ticket_shares (
  token text primary key default encode(extensions.gen_random_bytes(16), 'hex'),
  ticket_id uuid not null unique references public.tickets (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
alter table public.ticket_shares enable row level security;
create policy "read own shares" on public.ticket_shares
  for select to authenticated using ((select auth.uid()) = created_by);

/** Share link token for one of the caller's own paid tickets (created once, then reused). */
create function public.share_ticket(p_ticket_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_ticket record;
  v_token text;
begin
  select t.id, t.status, t.passenger_id, tr.departs_at
    into v_ticket
  from public.tickets t join public.trips tr on tr.id = t.trip_id
  where t.id = p_ticket_id;
  if v_ticket.id is null or v_ticket.passenger_id is distinct from v_uid then
    raise exception 'not_found';
  end if;
  if v_ticket.status not in ('reserved', 'boarded') then
    raise exception 'not_shareable';
  end if;
  insert into public.ticket_shares (ticket_id, created_by, expires_at)
  values (
    p_ticket_id,
    v_uid,
    -- End of the trip's day in Accra: a shared link never outlives the trip.
    (((v_ticket.departs_at at time zone 'Africa/Accra')::date + 1)::timestamp) at time zone 'Africa/Accra'
  )
  on conflict (ticket_id) do nothing;
  select token into v_token from public.ticket_shares where ticket_id = p_ticket_id;
  return v_token;
end;
$$;

/**
 * What a share link shows (anyone holding the link — it is the secret).
 * state: 'valid' (includes the QR token) | 'on_trip' (scanned; no QR) | 'invalid'.
 */
create function public.shared_ticket(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select jsonb_build_object(
      'state', case
        when s.expires_at <= now() or t.status not in ('reserved', 'boarded') or tr.status = 'cancelled' then 'invalid'
        when t.status = 'boarded' then 'on_trip'
        else 'valid' end,
      'qr_token', case when s.expires_at > now() and t.status = 'reserved' and tr.status <> 'cancelled' then t.qr_token end,
      'ticket_code', t.ticket_code,
      'seat_no', t.seat_no,
      'plate', b.plate,
      'departs_at', tr.departs_at,
      'pickup', ps.name,
      'dropoff', ds.name,
      'pickup_distance_m', pr.distance_m,
      'route_length_m', r.length_m,
      'free_flow_s', r.free_flow_s
    )
    from public.ticket_shares s
    join public.tickets t on t.id = s.ticket_id
    join public.trips tr on tr.id = t.trip_id
    join public.routes r on r.id = tr.route_id
    join public.buses b on b.id = tr.bus_id
    join public.route_stops pr on pr.route_id = r.id and pr.stop_idx = t.pickup_idx
    join public.stops ps on ps.id = pr.stop_id
    join public.route_stops dr on dr.route_id = r.id and dr.stop_idx = t.dropoff_idx
    join public.stops ds on ds.id = dr.stop_id
    where s.token = p_token
  ), jsonb_build_object('state', 'invalid'));
$$;

revoke execute on function public.share_ticket(uuid) from public, anon;
revoke execute on function public.new_ticket_code() from public, anon, authenticated;
