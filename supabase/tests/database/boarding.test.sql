-- Boarding scan + automatic drop-off (uix-spec 2.5; CLAUDE.md §6).
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(12);

insert into auth.users (id, email) values
  ('60000000-0000-4000-8000-000000000001', 'driver@board.test'),
  ('60000000-0000-4000-8000-000000000002', 'pending@board.test'),
  ('60000000-0000-4000-8000-000000000003', 'ama@board.test');
insert into drivers (id, first_name, last_name, status) values
  ('60000000-0000-4000-8000-000000000001', 'Kwame', 'Board', 'approved'),
  ('60000000-0000-4000-8000-000000000002', 'Yaw', 'Pending', 'pending');
insert into stops (id, name, latitude, longitude) values
  ('60000000-0000-4000-8000-0000000000a0', 'bd-A', 5.80, -0.12),
  ('60000000-0000-4000-8000-0000000000a1', 'bd-B', 5.70, -0.17),
  ('60000000-0000-4000-8000-0000000000a2', 'bd-C', 5.60, -0.19);
insert into routes (id, code, name, direction, length_m, free_flow_s)
  values ('60000000-0000-4000-8000-0000000000b0', 'BD', 'bd route', 'inbound', 20000, 2000);
insert into route_stops (route_id, stop_idx, stop_id, distance_m) values
  ('60000000-0000-4000-8000-0000000000b0', 0, '60000000-0000-4000-8000-0000000000a0', 0),
  ('60000000-0000-4000-8000-0000000000b0', 1, '60000000-0000-4000-8000-0000000000a1', 10000),
  ('60000000-0000-4000-8000-0000000000b0', 2, '60000000-0000-4000-8000-0000000000a2', 20000);
insert into seat_layouts (id, name, seat_count, grid) values ('60000000-0000-4000-8000-0000000000c0', 'bd-layout', 29, '[]');
insert into buses (id, plate, layout_id) values ('60000000-0000-4000-8000-0000000000d0', 'BD-BUS', '60000000-0000-4000-8000-0000000000c0');
insert into trips (id, route_id, bus_id, departs_at, status) values
  ('60000000-0000-4000-8000-0000000000e0', '60000000-0000-4000-8000-0000000000b0', '60000000-0000-4000-8000-0000000000d0', now(), 'active'),
  ('60000000-0000-4000-8000-0000000000e1', '60000000-0000-4000-8000-0000000000b0', '60000000-0000-4000-8000-0000000000d0', now() + interval '1 hour', 'scheduled');
insert into tickets (id, trip_id, seat_no, pickup_idx, dropoff_idx, status, fare_pesewas, passenger_id, ticket_code, qr_token) values
  ('60000000-0000-4000-8000-0000000000f1', '60000000-0000-4000-8000-0000000000e0', 1, 0, 1, 'reserved', 1500, '60000000-0000-4000-8000-000000000003', 'GLY-BRD111', 'qr-one'),
  ('60000000-0000-4000-8000-0000000000f2', '60000000-0000-4000-8000-0000000000e0', 2, 0, 2, 'reserved', 1500, '60000000-0000-4000-8000-000000000003', 'GLY-BRD222', 'qr-two'),
  ('60000000-0000-4000-8000-0000000000f3', '60000000-0000-4000-8000-0000000000e1', 3, 0, 2, 'reserved', 1500, '60000000-0000-4000-8000-000000000003', 'GLY-BRD333', 'qr-three');

set local role authenticated;
set local request.jwt.claims = '{"sub": "60000000-0000-4000-8000-000000000002", "role": "authenticated"}';
select throws_ok($$ select validate_ticket('60000000-0000-4000-8000-0000000000e0', 'qr-one') $$, '42501', null,
  'a pending driver cannot scan');
set local request.jwt.claims = '{"sub": "60000000-0000-4000-8000-000000000003", "role": "authenticated"}';
select throws_ok($$ select validate_ticket('60000000-0000-4000-8000-0000000000e0', 'qr-one') $$, '42501', null,
  'a passenger cannot scan');

set local request.jwt.claims = '{"sub": "60000000-0000-4000-8000-000000000001", "role": "authenticated"}';
select is(validate_ticket('60000000-0000-4000-8000-0000000000e0', 'GLYDE1:qr-one') ->> 'result', 'ok', 'a valid QR boards the passenger');
select is(validate_ticket('60000000-0000-4000-8000-0000000000e0', 'GLYDE1:qr-one') ->> 'result', 'already_used', 'the same QR cannot be used twice');
select is(validate_ticket('60000000-0000-4000-8000-0000000000e0', 'gly-brd222') ->> 'result', 'ok', 'manual Ticket ID works (any case)');
select is(validate_ticket('60000000-0000-4000-8000-0000000000e0', 'GLY-NOPE00') ->> 'result', 'not_found', 'unknown codes: ticket does not exist');
select is(validate_ticket('60000000-0000-4000-8000-0000000000e0', 'qr-three') ->> 'result', 'wrong_bus', 'a ticket for another trip is refused');
reset role;
select is((select status::text from tickets where id = '60000000-0000-4000-8000-0000000000f1'), 'boarded', 'scan marks the ticket boarded');

-- Bus reaches B: passenger 1 (A→B) is dropped off; passenger 2 (A→C) rides on.
insert into bus_positions (trip_id, latitude, longitude, distance_m) values ('60000000-0000-4000-8000-0000000000e0', 5.70, -0.17, 10000);
select is((select status::text from tickets where id = '60000000-0000-4000-8000-0000000000f1'), 'completed', 'reaching the drop-off completes the ticket');
select is((select status::text from tickets where id = '60000000-0000-4000-8000-0000000000f2'), 'boarded', 'passengers going further stay on board');

update trips set status = 'completed' where id = '60000000-0000-4000-8000-0000000000e0';
select is((select status::text from tickets where id = '60000000-0000-4000-8000-0000000000f2'), 'completed', 'ending the trip completes everyone on board');

-- Assigned trips: only their driver may scan.
update trips set driver_id = '60000000-0000-4000-8000-000000000001' where id = '60000000-0000-4000-8000-0000000000e1';
insert into drivers (id, first_name, last_name, status) values ('60000000-0000-4000-8000-000000000003', 'Ama', 'AlsoDriver', 'approved');
set local role authenticated;
set local request.jwt.claims = '{"sub": "60000000-0000-4000-8000-000000000003", "role": "authenticated"}';
select throws_ok($$ select validate_ticket('60000000-0000-4000-8000-0000000000e1', 'qr-three') $$, '42501', null,
  'another driver cannot scan on an assigned trip');
reset role;

select * from finish();
rollback;
