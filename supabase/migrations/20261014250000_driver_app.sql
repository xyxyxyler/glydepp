-- Driver app (uix-spec §3): sign-up with an owner's invite code, SOS, operational alerts,
-- trip timeline, demand, analytics. Owner/HQ dashboards come later; they'll use these tables.

-- ─── Bus owners + invite codes (uix-spec 3.1; CLAUDE.md §6: expire in 48 h) ──

create table public.bus_owners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  user_id uuid unique references auth.users (id) on delete set null, -- owner dashboard login (later)
  created_at timestamptz not null default now()
);
alter table public.bus_owners enable row level security;

alter table public.buses add column owner_id uuid references public.bus_owners (id);

create function public.new_invite_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKMNPQRSTVWXYZ';
  v_code text;
begin
  loop
    v_code := '';
    for i in 1..8 loop
      v_code := v_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.driver_invites d where d.code = v_code);
  end loop;
  return v_code;
end;
$$;

create table public.driver_invites (
  code text primary key,
  owner_id uuid not null references public.bus_owners (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '48 hours',
  revoked boolean not null default false, -- a resend invalidates the previous code
  used_by uuid references auth.users (id),
  used_at timestamptz
);
alter table public.driver_invites alter column code set default public.new_invite_code();
alter table public.driver_invites enable row level security;

-- ─── Driver profile (uix-spec 3.1 Driver Profile Setup) ──────────────────────

alter table public.drivers
  add column date_of_birth date,
  add column residential_area text,
  add column ghana_card_number text check (ghana_card_number ~ '^GHA-[0-9]{9}-[0-9]$'),
  add column licence_number text check (char_length(btrim(licence_number)) between 4 and 30),
  add column photo_path text,
  add column owner_id uuid references public.bus_owners (id),
  add column liveness_passed_at timestamptz, -- prototype: stub check (CLAUDE.md §4)
  add column terms_accepted_at timestamptz,
  add column terms_version text,
  add column onboarded_at timestamptz,
  add column voice_alerts boolean not null default true;

/**
 * Finish driver sign-up (after phone/email verification and setting a password). Validates the
 * invite code (exists, not expired, not revoked, unused), records the profile, links the driver
 * to the owner who issued the code and sets status Pending Approval.
 * Errors (P0001): invalid_invite, expired_invite, used_invite, already_registered, bad_details.
 */
create function public.complete_driver_signup(
  p_first_name text,
  p_last_name text,
  p_date_of_birth date,
  p_residential_area text,
  p_ghana_card_number text,
  p_licence_number text,
  p_invite_code text,
  p_photo_path text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_invite record;
begin
  if v_uid is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  if exists (select 1 from public.drivers where id = v_uid) then
    raise exception 'already_registered';
  end if;
  select * into v_invite from public.driver_invites where code = upper(btrim(p_invite_code)) for update;
  if v_invite.code is null or v_invite.revoked then
    raise exception 'invalid_invite';
  end if;
  if v_invite.used_by is not null then
    raise exception 'used_invite';
  end if;
  if v_invite.expires_at <= now() then
    raise exception 'expired_invite';
  end if;
  if p_date_of_birth is null or p_date_of_birth > (current_date - interval '18 years')::date then
    raise exception 'bad_details' using detail = 'Drivers must be 18 or older.';
  end if;
  begin
    insert into public.drivers (id, first_name, last_name, status, date_of_birth, residential_area,
                                ghana_card_number, licence_number, photo_path, owner_id, liveness_passed_at)
    values (v_uid, btrim(p_first_name), btrim(p_last_name), 'pending', p_date_of_birth, btrim(p_residential_area),
            upper(btrim(p_ghana_card_number)), upper(btrim(p_licence_number)), p_photo_path, v_invite.owner_id, now());
  exception when check_violation or not_null_violation then
    raise exception 'bad_details';
  end;
  update public.driver_invites set used_by = v_uid, used_at = now() where code = v_invite.code;
end;
$$;
revoke execute on function public.complete_driver_signup(text, text, date, text, text, text, text, text) from public, anon;

/** Driver onboarding progress: terms + finished (permissions). */
create function public.driver_update_self(p_terms_version text default null, p_onboarded boolean default null, p_voice_alerts boolean default null)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.drivers set
    terms_accepted_at = case when p_terms_version is not null then now() else terms_accepted_at end,
    terms_version = coalesce(p_terms_version, terms_version),
    onboarded_at = case when p_onboarded then coalesce(onboarded_at, now()) else onboarded_at end,
    voice_alerts = coalesce(p_voice_alerts, voice_alerts)
  where id = auth.uid();
$$;
revoke execute on function public.driver_update_self(text, boolean, boolean) from public, anon;

-- Profile photos: private bucket; each user writes/reads only their own folder (<uid>/...).
insert into storage.buckets (id, name, public) values ('driver-photos', 'driver-photos', false) on conflict (id) do nothing;
create policy "drivers upload own photo" on storage.objects for insert to authenticated
  with check (bucket_id = 'driver-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "drivers read own photo" on storage.objects for select to authenticated
  using (bucket_id = 'driver-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "drivers replace own photo" on storage.objects for update to authenticated
  using (bucket_id = 'driver-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ─── SOS (uix-spec 3.2) + operational alerts inbox ──────────────────────────

create table public.sos_alerts (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers (id),
  trip_id uuid references public.trips (id),
  description text not null check (char_length(btrim(description)) between 3 and 1000),
  latitude double precision,
  longitude double precision,
  priority text not null default 'high',
  status text not null default 'open' check (status in ('open', 'acknowledged', 'resolved')),
  created_at timestamptz not null default now()
);
alter table public.sos_alerts enable row level security;
create policy "drivers read own sos" on public.sos_alerts for select to authenticated using ((select auth.uid()) = driver_id);
alter publication supabase_realtime add table public.sos_alerts; -- HQ incident feed (later)

-- Operational alerts for drivers (route and operations only — never promotional). driver_id null = all drivers.
create table public.driver_alerts (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid references public.drivers (id) on delete cascade,
  title text not null,
  body text,
  created_at timestamptz not null default now()
);
alter table public.driver_alerts enable row level security;
create policy "drivers read their alerts" on public.driver_alerts for select to authenticated
  using (driver_id = (select auth.uid()) or (driver_id is null and exists (select 1 from public.drivers d where d.id = (select auth.uid()))));

/**
 * SOS: record the issue (with the bus's last position), end the active trip immediately and
 * raise a high-priority alert for HQ. Returns the alert id.
 */
create function public.driver_sos(p_description text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_approved_driver();
  v_trip uuid;
  v_alert uuid;
begin
  select id into v_trip from public.trips where driver_id = v_uid and status = 'active' limit 1;
  insert into public.sos_alerts (driver_id, trip_id, description, latitude, longitude)
  select v_uid, v_trip, btrim(p_description), bp.latitude, bp.longitude
  from (select 1) x left join public.bus_positions bp on bp.trip_id = v_trip
  returning id into v_alert;
  if v_trip is not null then
    update public.trips set status = 'completed' where id = v_trip;
  end if;
  insert into public.driver_alerts (driver_id, title, body)
  values (v_uid, 'SOS sent to HQ', 'Your alert was received. The trip has been ended. HQ will contact you.');
  return v_alert;
end;
$$;
revoke execute on function public.driver_sos(text) from public, anon;

-- ─── Trip timeline (uix-spec 3.2 Current Trip Timeline) ─────────────────────

/** Every stop with its scheduled time, arrival, and boarding/alighting counts (numbers only). */
create function public.driver_trip_timeline(p_trip_id uuid)
returns table (
  stop_idx smallint,
  name text,
  latitude double precision,
  longitude double precision,
  distance_m integer,
  scheduled_at timestamptz,
  arrived_at timestamptz,
  expected_board integer,
  scanned_board integer,
  expected_alight integer
)
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
  return query
  select rs.stop_idx, s.name, s.latitude, s.longitude, rs.distance_m,
         t.departs_at + make_interval(secs => coalesce(r.free_flow_s, 0) * rs.distance_m::double precision / r.length_m),
         a.arrived_at,
         (select count(*)::int from public.tickets k where k.trip_id = t.id and k.pickup_idx = rs.stop_idx
            and k.status in ('reserved', 'boarded', 'completed', 'absent')),
         (select count(*)::int from public.tickets k where k.trip_id = t.id and k.pickup_idx = rs.stop_idx
            and k.status in ('boarded', 'completed')),
         (select count(*)::int from public.tickets k where k.trip_id = t.id and k.dropoff_idx = rs.stop_idx
            and k.status in ('boarded', 'completed'))
  from public.trips t
  join public.routes r on r.id = t.route_id
  join public.route_stops rs on rs.route_id = r.id
  join public.stops s on s.id = rs.stop_id
  left join public.trip_stop_arrivals a on a.trip_id = t.id and a.stop_idx = rs.stop_idx
  where t.id = p_trip_id
  order by rs.stop_idx;
end;
$$;
revoke execute on function public.driver_trip_timeline(uuid) from public, anon;

-- ─── Demand Heat Area (uix-spec 3.2) ────────────────────────────────────────

/**
 * Highest-demand pickup over the last 7 days of paid bookings, the route most booked from it,
 * passengers already booked from it today, and an estimate (7-day daily average).
 */
create function public.driver_demand()
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
      'stop', s.name,
      'route', r.name,
      'bookings_7d', d.n,
      'estimated_daily', ceil(d.n / 7.0)::int,
      'booked_today', (
        select count(*)::int from public.tickets k join public.trips tt on tt.id = k.trip_id
        where tt.route_id = d.route_id and k.pickup_idx = d.pickup_idx and k.status = 'reserved'
          and (tt.departs_at at time zone 'Africa/Accra')::date = (now() at time zone 'Africa/Accra')::date
      )
    )
    from (
      select t.route_id, k.pickup_idx, count(*)::int as n
      from public.tickets k join public.trips t on t.id = k.trip_id
      where k.status in ('reserved', 'boarded', 'completed', 'absent') and k.created_at > now() - interval '7 days'
      group by t.route_id, k.pickup_idx
      order by n desc
      limit 1
    ) d
    join public.routes r on r.id = d.route_id
    join public.route_stops rs on rs.route_id = d.route_id and rs.stop_idx = d.pickup_idx
    join public.stops s on s.id = rs.stop_id
  );
end;
$$;
revoke execute on function public.driver_demand() from public, anon;

-- ─── Analytics (uix-spec 3.3) ───────────────────────────────────────────────

/** Driving history: one row per trip (route, bus, passengers carried, status). */
create function public.driver_history()
returns table (trip_id uuid, departs_at timestamptz, route_name text, plate text, passengers integer, status public.trip_status)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_approved_driver();
begin
  return query
  select t.id, t.departs_at, r.name, b.plate,
         (select count(*)::int from public.tickets k where k.trip_id = t.id and k.status in ('boarded', 'completed')),
         t.status
  from public.trips t join public.routes r on r.id = t.route_id join public.buses b on b.id = t.bus_id
  where t.driver_id = v_uid and t.status in ('completed', 'cancelled')
  order by t.departs_at desc;
end;
$$;
revoke execute on function public.driver_history() from public, anon;

-- Drivers see their own SOS / alerts / history only; owners and HQ read via the service role (later).
