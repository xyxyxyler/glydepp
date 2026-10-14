-- Driver Set Route / Start / End Trip, auto-end, counts (uix-spec 3.2).
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(13);

insert into auth.users (id, email) values
  ('90000000-0000-4000-8000-000000000001', 'kwame@driver.test'),
  ('90000000-0000-4000-8000-000000000002', 'yaw@driver.test'),
  ('90000000-0000-4000-8000-000000000003', 'ama@driver.test');
insert into drivers (id, first_name, last_name, status) values
  ('90000000-0000-4000-8000-000000000001', 'Kwame', 'D', 'approved'),
  ('90000000-0000-4000-8000-000000000002', 'Yaw', 'P', 'pending');
insert into stops (id, name, latitude, longitude) values
  ('90000000-0000-4000-8000-0000000000a0', 'dr-A', 5.80, -0.12),
  ('90000000-0000-4000-8000-0000000000a1', 'dr-B', 5.70, -0.17);
insert into routes (id, code, name, direction, length_m, free_flow_s)
  values ('90000000-0000-4000-8000-0000000000b0', 'DR', 'dr route', 'inbound', 10000, 1000);
insert into route_stops (route_id, stop_idx, stop_id, distance_m) values
  ('90000000-0000-4000-8000-0000000000b0', 0, '90000000-0000-4000-8000-0000000000a0', 0),
  ('90000000-0000-4000-8000-0000000000b0', 1, '90000000-0000-4000-8000-0000000000a1', 10000);
insert into seat_layouts (id, name, seat_count, grid) values ('90000000-0000-4000-8000-0000000000c0', 'dr-layout', 29, '[]');
insert into buses (id, plate, layout_id) values ('90000000-0000-4000-8000-0000000000d0', 'DR-BUS', '90000000-0000-4000-8000-0000000000c0');
insert into trips (id, route_id, bus_id, departs_at) values
  ('90000000-0000-4000-8000-0000000000e0', '90000000-0000-4000-8000-0000000000b0', '90000000-0000-4000-8000-0000000000d0', now() + interval '5 minutes');
insert into tickets (trip_id, seat_no, pickup_idx, dropoff_idx, status, fare_pesewas, passenger_id) values
  ('90000000-0000-4000-8000-0000000000e0', 1, 0, 1, 'reserved', 1500, '90000000-0000-4000-8000-000000000003'),
  ('90000000-0000-4000-8000-0000000000e0', 2, 0, 1, 'reserved', 1500, '90000000-0000-4000-8000-000000000003');

-- Drivers can't read tickets (RLS), so capture the code a passenger would show.
select set_config('test.code', (select ticket_code from tickets where seat_no = 1 and trip_id = '90000000-0000-4000-8000-0000000000e0'), true);

set local role authenticated;
set local request.jwt.claims = '{"sub": "90000000-0000-4000-8000-000000000002", "role": "authenticated"}';
select throws_ok($$ select driver_start_trip('90000000-0000-4000-8000-0000000000d0', '90000000-0000-4000-8000-0000000000b0') $$,
  '42501', null, 'a pending driver cannot start a trip');

set local request.jwt.claims = '{"sub": "90000000-0000-4000-8000-000000000001", "role": "authenticated"}';
select is(driver_start_trip('90000000-0000-4000-8000-0000000000d0', '90000000-0000-4000-8000-0000000000b0'),
  '90000000-0000-4000-8000-0000000000e0'::uuid, 'Start Trip takes today''s scheduled trip for that bus + route');
select is((driver_current_trip() ->> 'trip_id')::uuid, '90000000-0000-4000-8000-0000000000e0'::uuid, 'it is the driver''s current trip');
select throws_ok($$ select driver_start_trip('90000000-0000-4000-8000-0000000000d0', '90000000-0000-4000-8000-0000000000b0') $$,
  'P0001', 'already_driving', 'one running trip per driver');
select is((select distance_m from bus_positions where trip_id = '90000000-0000-4000-8000-0000000000e0'), 0,
  'starting puts the bus on the map at its first stop');
select is(trip_passenger_counts('90000000-0000-4000-8000-0000000000e0'),
  '{"scanned": 0, "expected": 2, "pending": 2, "missed": 0}'::jsonb, 'counts before boarding');
select is(validate_ticket('90000000-0000-4000-8000-0000000000e0', current_setting('test.code')) ->> 'result', 'ok', 'scan');
select is(trip_passenger_counts('90000000-0000-4000-8000-0000000000e0') ->> 'scanned', '1', 'Scanned updates after a scan');

-- Bus reaches the final stop → trip ends; rider dropped off, no-show marked missed.
reset role;
update bus_positions set latitude = 5.70, longitude = -0.17, distance_m = 10000 where trip_id = '90000000-0000-4000-8000-0000000000e0';
select is((select status::text from trips where id = '90000000-0000-4000-8000-0000000000e0'), 'completed', 'trip ends automatically at the final stop');
set local role authenticated;
set local request.jwt.claims = '{"sub": "90000000-0000-4000-8000-000000000001", "role": "authenticated"}';
select is(driver_today_summary(), '{"trips_completed": 1, "passengers": 1}'::jsonb, 'daily summary');
select ok(driver_current_trip() is null, 'no current trip after it ends');

-- No scheduled trip left → Start Trip creates one now; End Trip early works.
create temp table started on commit drop as select driver_start_trip('90000000-0000-4000-8000-0000000000d0', '90000000-0000-4000-8000-0000000000b0') as id;
select isnt((select id from started), '90000000-0000-4000-8000-0000000000e0'::uuid, 'with no scheduled trip, a new one is created');
select lives_ok($$ select driver_end_trip((select id from started)) $$, 'End Trip early');
reset role;

select * from finish();
rollback;
