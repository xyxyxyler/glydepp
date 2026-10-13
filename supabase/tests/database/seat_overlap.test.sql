-- Segment-aware seat allocation (CLAUDE.md §6) and boarding rules.
-- Own fixtures, run in a transaction and rolled back: leaves no data behind.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(17);

-- Fixtures: route A(0) → B(1) → C(2) → D(3), mirroring the product doc example
-- (Dodowa → Adenta → Madina → Accra), and a 29-seat bus.
insert into stops (id, name, latitude, longitude) values
  ('00000000-0000-4000-8000-0000000000a0', 'test-A', 5.80, -0.12),
  ('00000000-0000-4000-8000-0000000000a1', 'test-B', 5.70, -0.17),
  ('00000000-0000-4000-8000-0000000000a2', 'test-C', 5.68, -0.17),
  ('00000000-0000-4000-8000-0000000000a3', 'test-D', 5.55, -0.20);
insert into routes (id, code, name, direction, length_m)
  values ('00000000-0000-4000-8000-0000000000b0', 'TEST', 'test route', 'inbound', 30000);
insert into route_stops (route_id, stop_idx, stop_id, distance_m) values
  ('00000000-0000-4000-8000-0000000000b0', 0, '00000000-0000-4000-8000-0000000000a0', 0),
  ('00000000-0000-4000-8000-0000000000b0', 1, '00000000-0000-4000-8000-0000000000a1', 10000),
  ('00000000-0000-4000-8000-0000000000b0', 2, '00000000-0000-4000-8000-0000000000a2', 13000),
  ('00000000-0000-4000-8000-0000000000b0', 3, '00000000-0000-4000-8000-0000000000a3', 30000);
insert into seat_layouts (id, name, seat_count, grid)
  values ('00000000-0000-4000-8000-0000000000c0', 'test-layout', 29, '[]');
insert into buses (id, plate, layout_id)
  values ('00000000-0000-4000-8000-0000000000d0', 'TEST-BUS', '00000000-0000-4000-8000-0000000000c0');
insert into trips (id, route_id, bus_id, departs_at) values
  ('00000000-0000-4000-8000-0000000000e0', '00000000-0000-4000-8000-0000000000b0', '00000000-0000-4000-8000-0000000000d0', now());

-- ── Segment overlap ─────────────────────────────────────────────────────────
-- Passenger A books seat 1 Madina(2) → Accra(3) first.
select lives_ok(
  $$ insert into tickets (id, trip_id, seat_no, pickup_idx, dropoff_idx, fare_pesewas)
     values ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-0000000000e0', 1, 2, 3, 0) $$,
  'A books seat 1 for C→D');
-- Passenger B books the same seat Adenta(1) → Madina(2): ends where A starts, so no overlap.
select lives_ok(
  $$ insert into tickets (trip_id, seat_no, pickup_idx, dropoff_idx, fare_pesewas)
     values ('00000000-0000-4000-8000-0000000000e0', 1, 1, 2, 0) $$,
  'B shares seat 1 for B→C (back-to-back, doc example)');
select lives_ok(
  $$ insert into tickets (trip_id, seat_no, pickup_idx, dropoff_idx, fare_pesewas)
     values ('00000000-0000-4000-8000-0000000000e0', 1, 0, 1, 0) $$,
  'a third passenger takes seat 1 for A→B');
select throws_ok(
  $$ insert into tickets (trip_id, seat_no, pickup_idx, dropoff_idx, fare_pesewas)
     values ('00000000-0000-4000-8000-0000000000e0', 1, 1, 3, 0) $$,
  '23P01', null, 'overlapping segment on the same seat is rejected');
select throws_ok(
  $$ insert into tickets (trip_id, seat_no, pickup_idx, dropoff_idx, fare_pesewas)
     values ('00000000-0000-4000-8000-0000000000e0', 1, 0, 3, 0) $$,
  '23P01', null, 'whole-route booking on a partly used seat is rejected');
select lives_ok(
  $$ insert into tickets (trip_id, seat_no, pickup_idx, dropoff_idx, fare_pesewas)
     values ('00000000-0000-4000-8000-0000000000e0', 2, 1, 3, 0) $$,
  'same segment on a different seat is fine');

-- ── Release ─────────────────────────────────────────────────────────────────
update tickets set status = 'absent' where id = '00000000-0000-4000-8000-0000000000f1';
select lives_ok(
  $$ insert into tickets (trip_id, seat_no, pickup_idx, dropoff_idx, fare_pesewas)
     values ('00000000-0000-4000-8000-0000000000e0', 1, 2, 3, 0) $$,
  'absent passenger releases the seat for reassignment');
update tickets set status = 'cancelled'
  where trip_id = '00000000-0000-4000-8000-0000000000e0' and seat_no = 2;
select lives_ok(
  $$ insert into tickets (trip_id, seat_no, pickup_idx, dropoff_idx, fare_pesewas)
     values ('00000000-0000-4000-8000-0000000000e0', 2, 0, 3, 0) $$,
  'cancelled ticket releases the seat');

-- ── Validation ──────────────────────────────────────────────────────────────
select throws_ok(
  $$ insert into tickets (trip_id, seat_no, pickup_idx, dropoff_idx, fare_pesewas)
     values ('00000000-0000-4000-8000-0000000000e0', 30, 0, 1, 0) $$,
  '23514', null, 'seat number beyond the bus layout is rejected');
select throws_ok(
  $$ insert into tickets (trip_id, seat_no, pickup_idx, dropoff_idx, fare_pesewas)
     values ('00000000-0000-4000-8000-0000000000e0', 3, 0, 4, 0) $$,
  '23514', null, 'stop index beyond the route is rejected');
select throws_ok(
  $$ insert into tickets (trip_id, seat_no, pickup_idx, dropoff_idx, fare_pesewas)
     values ('00000000-0000-4000-8000-0000000000e0', 3, 2, 2, 0) $$,
  '23514', null, 'pickup must come before drop-off');

-- ── Has the bus passed the pickup? ──────────────────────────────────────────
select ok(trip_can_board_at('00000000-0000-4000-8000-0000000000e0', 1), 'no position yet: can board at B');
insert into bus_positions (trip_id, latitude, longitude, distance_m)
  values ('00000000-0000-4000-8000-0000000000e0', 5.69, -0.17, 11000); -- between B and C
select ok(not trip_can_board_at('00000000-0000-4000-8000-0000000000e0', 1), 'bus passed B: cannot board at B');
select ok(trip_can_board_at('00000000-0000-4000-8000-0000000000e0', 2), 'bus before C: can board at C');
select ok(not trip_can_board_at('00000000-0000-4000-8000-0000000000e0', 9), 'unknown stop: cannot board');

-- ── Client access ───────────────────────────────────────────────────────────
set local role anon;
select is((select count(*) from tickets)::int, 0, 'anon cannot read tickets');
select is(
  (select count(*) from trip_seat_segments('00000000-0000-4000-8000-0000000000e0'))::int, 4,
  'anon sees occupied seat segments (no passenger data)');
reset role;

select * from finish();
rollback;
