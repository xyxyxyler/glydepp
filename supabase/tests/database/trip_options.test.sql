-- trip_options (uix-spec 2.3): direction, segment seats, passed pickup, today-only, missed trips.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(9);

-- Route A(0) → B(1) → C(2) → D(3); 30 km, 3000 s free flow.
insert into stops (id, name, latitude, longitude) values
  ('10000000-0000-4000-8000-0000000000a0', 'opt-A', 5.80, -0.12),
  ('10000000-0000-4000-8000-0000000000a1', 'opt-B', 5.70, -0.17),
  ('10000000-0000-4000-8000-0000000000a2', 'opt-C', 5.68, -0.17),
  ('10000000-0000-4000-8000-0000000000a3', 'opt-D', 5.55, -0.20);
insert into routes (id, code, name, direction, length_m, free_flow_s)
  values ('10000000-0000-4000-8000-0000000000b0', 'OPT', 'opt route', 'inbound', 30000, 3000);
insert into route_stops (route_id, stop_idx, stop_id, distance_m) values
  ('10000000-0000-4000-8000-0000000000b0', 0, '10000000-0000-4000-8000-0000000000a0', 0),
  ('10000000-0000-4000-8000-0000000000b0', 1, '10000000-0000-4000-8000-0000000000a1', 10000),
  ('10000000-0000-4000-8000-0000000000b0', 2, '10000000-0000-4000-8000-0000000000a2', 13000),
  ('10000000-0000-4000-8000-0000000000b0', 3, '10000000-0000-4000-8000-0000000000a3', 30000);
insert into seat_layouts (id, name, seat_count, grid)
  values ('10000000-0000-4000-8000-0000000000c0', 'opt-layout', 29, '[]');
insert into buses (id, plate, layout_id)
  values ('10000000-0000-4000-8000-0000000000d0', 'OPT-BUS', '10000000-0000-4000-8000-0000000000c0');

-- Active trip, bus between B and C, two live tickets.
insert into trips (id, route_id, bus_id, departs_at, status) values
  ('10000000-0000-4000-8000-0000000000e0', '10000000-0000-4000-8000-0000000000b0', '10000000-0000-4000-8000-0000000000d0', now(), 'active');
insert into bus_positions (trip_id, latitude, longitude, distance_m)
  values ('10000000-0000-4000-8000-0000000000e0', 5.69, -0.17, 11000);
insert into tickets (trip_id, seat_no, pickup_idx, dropoff_idx, fare_pesewas) values
  ('10000000-0000-4000-8000-0000000000e0', 1, 2, 3, 0),
  ('10000000-0000-4000-8000-0000000000e0', 2, 0, 1, 0);

select is(
  (select count(*)::int from trip_options('10000000-0000-4000-8000-0000000000a2', '10000000-0000-4000-8000-0000000000a3')),
  1, 'C→D: the active trip is offered');
select is(
  (select seats_free from trip_options('10000000-0000-4000-8000-0000000000a2', '10000000-0000-4000-8000-0000000000a3')),
  28, 'C→D: seat 1 (C→D) is taken, seat 2 (A→B) is not');
select is(
  (select seats_free from trip_options('10000000-0000-4000-8000-0000000000a0', '10000000-0000-4000-8000-0000000000a1')),
  28, 'A→B: only seat 2 overlaps');
select ok(
  (select not passed from trip_options('10000000-0000-4000-8000-0000000000a2', '10000000-0000-4000-8000-0000000000a3')),
  'bus is before C: not passed');
select ok(
  (select passed from trip_options('10000000-0000-4000-8000-0000000000a1', '10000000-0000-4000-8000-0000000000a3')),
  'bus is past B: passed');
select is(
  (select count(*)::int from trip_options('10000000-0000-4000-8000-0000000000a3', '10000000-0000-4000-8000-0000000000a2')),
  0, 'D→C is against the direction of travel: nothing offered');

-- Scheduled trips: yesterday (excluded), missed today (excluded), later today (included).
insert into trips (route_id, bus_id, departs_at) values
  ('10000000-0000-4000-8000-0000000000b0', '10000000-0000-4000-8000-0000000000d0', now() - interval '1 day'),
  ('10000000-0000-4000-8000-0000000000b0', '10000000-0000-4000-8000-0000000000d0', now() - interval '2 hours');
select is(
  (select count(*)::int from trip_options('10000000-0000-4000-8000-0000000000a2', '10000000-0000-4000-8000-0000000000a3')),
  1, 'yesterday''s trip and a missed scheduled trip are not offered');

-- Only add a later trip if "later today" exists in Accra (avoids a midnight flake).
insert into trips (route_id, bus_id, departs_at)
  select '10000000-0000-4000-8000-0000000000b0', '10000000-0000-4000-8000-0000000000d0', now() + interval '1 minute'
  where ((now() + interval '1 minute') at time zone 'Africa/Accra')::date = (now() at time zone 'Africa/Accra')::date;
select is(
  (select count(*)::int from trip_options('10000000-0000-4000-8000-0000000000a2', '10000000-0000-4000-8000-0000000000a3')),
  1 + (select count(*)::int from trips where route_id = '10000000-0000-4000-8000-0000000000b0' and departs_at > now()),
  'a scheduled trip later today is offered');

set local role anon;
select lives_ok(
  $$ select * from trip_options('10000000-0000-4000-8000-0000000000a2', '10000000-0000-4000-8000-0000000000a3') $$,
  'anon can search trips');
reset role;

select * from finish();
rollback;
