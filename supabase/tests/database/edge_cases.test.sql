-- Last bus, missed pickup (absent after 3 min), deferments (max 2, later bus same day).
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(12);

insert into auth.users (id, email) values ('80000000-0000-4000-8000-000000000001', 'ama@edge.test');
insert into stops (id, name, latitude, longitude) values
  ('80000000-0000-4000-8000-0000000000a0', 'ed-A', 5.80, -0.12),
  ('80000000-0000-4000-8000-0000000000a1', 'ed-B', 5.70, -0.17),
  ('80000000-0000-4000-8000-0000000000a2', 'ed-C', 5.60, -0.19);
insert into routes (id, code, name, direction, length_m, free_flow_s)
  values ('80000000-0000-4000-8000-0000000000b0', 'ED', 'ed route', 'inbound', 20000, 2000);
insert into route_stops (route_id, stop_idx, stop_id, distance_m) values
  ('80000000-0000-4000-8000-0000000000b0', 0, '80000000-0000-4000-8000-0000000000a0', 0),
  ('80000000-0000-4000-8000-0000000000b0', 1, '80000000-0000-4000-8000-0000000000a1', 10000),
  ('80000000-0000-4000-8000-0000000000b0', 2, '80000000-0000-4000-8000-0000000000a2', 20000);
insert into seat_layouts (id, name, seat_count, grid) values ('80000000-0000-4000-8000-0000000000c0', 'ed-layout', 29, '[]');
insert into buses (id, plate, layout_id) values ('80000000-0000-4000-8000-0000000000d0', 'ED-BUS', '80000000-0000-4000-8000-0000000000c0');
-- Keep every trip on today's date in Accra so the same-day rule holds in the test.
insert into trips (id, route_id, bus_id, departs_at, status) values
  ('80000000-0000-4000-8000-0000000000e1', '80000000-0000-4000-8000-0000000000b0', '80000000-0000-4000-8000-0000000000d0', date_trunc('day', now()) + interval '1 minute', 'active'),
  ('80000000-0000-4000-8000-0000000000e2', '80000000-0000-4000-8000-0000000000b0', '80000000-0000-4000-8000-0000000000d0', date_trunc('day', now()) + interval '23 hours 50 minutes', 'scheduled'),
  ('80000000-0000-4000-8000-0000000000e3', '80000000-0000-4000-8000-0000000000b0', '80000000-0000-4000-8000-0000000000d0', date_trunc('day', now()) + interval '23 hours 55 minutes', 'scheduled'),
  ('80000000-0000-4000-8000-0000000000e4', '80000000-0000-4000-8000-0000000000b0', '80000000-0000-4000-8000-0000000000d0', date_trunc('day', now()) + interval '23 hours 58 minutes', 'scheduled');
insert into payments (id, passenger_id, trip_id, amount_pesewas, status, expires_at) values
  ('80000000-0000-4000-8000-0000000000f0', '80000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-0000000000e1', 1500, 'succeeded', now());
insert into tickets (id, trip_id, seat_no, pickup_idx, dropoff_idx, status, fare_pesewas, passenger_id, payment_id) values
  ('80000000-0000-4000-8000-0000000000f1', '80000000-0000-4000-8000-0000000000e1', 1, 0, 2, 'reserved', 1500, '80000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-0000000000f0');

-- Last bus.
select ok((select bool_or(is_last and trip_id = '80000000-0000-4000-8000-0000000000e4') from trip_options('80000000-0000-4000-8000-0000000000a0', '80000000-0000-4000-8000-0000000000a2')),
  'the day''s final trip is flagged as the last bus');
select ok((select not is_last from trip_options('80000000-0000-4000-8000-0000000000a0', '80000000-0000-4000-8000-0000000000a2') where trip_id = '80000000-0000-4000-8000-0000000000e2'),
  'earlier trips are not');

-- Bus reaches A: arrival recorded; still within the waiting period.
insert into bus_positions (trip_id, latitude, longitude, distance_m) values ('80000000-0000-4000-8000-0000000000e1', 5.80, -0.12, 0);
select is((select status::text from tickets where id = '80000000-0000-4000-8000-0000000000f1'), 'reserved', 'within 3 minutes the passenger is still expected');
update trip_stop_arrivals set arrived_at = now() - interval '4 minutes' where trip_id = '80000000-0000-4000-8000-0000000000e1';
update bus_positions set distance_m = 1 where trip_id = '80000000-0000-4000-8000-0000000000e1';
select is((select status::text from tickets where id = '80000000-0000-4000-8000-0000000000f1'), 'absent', 'not scanned 3 minutes after arrival → absent');
select is((select count(*)::int from trip_seat_segments('80000000-0000-4000-8000-0000000000e1')), 0, 'the seat is released');

-- Deferment 1: move to a later bus, same seat.
set local role authenticated;
set local request.jwt.claims = '{"sub": "80000000-0000-4000-8000-000000000001", "role": "authenticated"}';
select throws_ok($$ select defer_booking('80000000-0000-4000-8000-0000000000f0', '80000000-0000-4000-8000-0000000000e1') $$,
  'P0001', 'not_later_same_day', 'cannot move to the same or an earlier bus');
select is((defer_booking('80000000-0000-4000-8000-0000000000f0', '80000000-0000-4000-8000-0000000000e2') ->> 'moved')::int, 1, 'missed booking moves to a later bus');
reset role;
select is((select seat_no::int from tickets where id = '80000000-0000-4000-8000-0000000000f1' and status = 'reserved' and deferral_count = 1), 1,
  'same seat, reserved again, 1 deferment used');

-- Deferment 2: seat 1 is taken on the next bus → another seat.
insert into tickets (trip_id, seat_no, pickup_idx, dropoff_idx, status, fare_pesewas) values
  ('80000000-0000-4000-8000-0000000000e3', 1, 0, 2, 'reserved', 1500);
update tickets set status = 'absent' where id = '80000000-0000-4000-8000-0000000000f1';
set local role authenticated;
set local request.jwt.claims = '{"sub": "80000000-0000-4000-8000-000000000001", "role": "authenticated"}';
select lives_ok($$ select defer_booking('80000000-0000-4000-8000-0000000000f0', '80000000-0000-4000-8000-0000000000e3') $$, 'second deferment');
reset role;
select is((select seat_no::int from tickets where id = '80000000-0000-4000-8000-0000000000f1'), 2, 'a taken seat moves the passenger to a free one');

-- Third miss: no deferments left.
update tickets set status = 'absent' where id = '80000000-0000-4000-8000-0000000000f1';
set local role authenticated;
set local request.jwt.claims = '{"sub": "80000000-0000-4000-8000-000000000001", "role": "authenticated"}';
select throws_ok($$ select defer_booking('80000000-0000-4000-8000-0000000000f0', '80000000-0000-4000-8000-0000000000e4') $$,
  'P0001', 'no_deferrals_left', 'after 2 deferments the booking can''t be moved');
reset role;

-- Trip ends: anyone never scanned is absent.
update tickets set status = 'reserved', trip_id = '80000000-0000-4000-8000-0000000000e4' where id = '80000000-0000-4000-8000-0000000000f1';
update trips set status = 'completed' where id = '80000000-0000-4000-8000-0000000000e4';
select is((select status::text from tickets where id = '80000000-0000-4000-8000-0000000000f1'), 'absent', 'ending a trip marks unscanned passengers absent');

select * from finish();
rollback;
