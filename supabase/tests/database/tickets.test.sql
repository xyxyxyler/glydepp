-- Ticket codes and share links (uix-spec 2.5, CLAUDE.md §6).
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(11);

insert into auth.users (id, email) values
  ('40000000-0000-4000-8000-000000000001', 'ama@tickets.test'),
  ('40000000-0000-4000-8000-000000000002', 'kofi@tickets.test');
insert into stops (id, name, latitude, longitude) values
  ('40000000-0000-4000-8000-0000000000a0', 'tk-A', 5.80, -0.12),
  ('40000000-0000-4000-8000-0000000000a1', 'tk-B', 5.70, -0.17);
insert into routes (id, code, name, direction, length_m, free_flow_s)
  values ('40000000-0000-4000-8000-0000000000b0', 'TK', 'tk route', 'inbound', 10000, 1000);
insert into route_stops (route_id, stop_idx, stop_id, distance_m) values
  ('40000000-0000-4000-8000-0000000000b0', 0, '40000000-0000-4000-8000-0000000000a0', 0),
  ('40000000-0000-4000-8000-0000000000b0', 1, '40000000-0000-4000-8000-0000000000a1', 10000);
insert into seat_layouts (id, name, seat_count, grid) values ('40000000-0000-4000-8000-0000000000c0', 'tk-layout', 29, '[]');
insert into buses (id, plate, layout_id) values ('40000000-0000-4000-8000-0000000000d0', 'TK-BUS', '40000000-0000-4000-8000-0000000000c0');
insert into trips (id, route_id, bus_id, departs_at) values
  ('40000000-0000-4000-8000-0000000000e0', '40000000-0000-4000-8000-0000000000b0', '40000000-0000-4000-8000-0000000000d0', now());
insert into tickets (id, trip_id, seat_no, pickup_idx, dropoff_idx, status, fare_pesewas, passenger_id) values
  ('40000000-0000-4000-8000-0000000000f1', '40000000-0000-4000-8000-0000000000e0', 1, 0, 1, 'reserved', 1500, '40000000-0000-4000-8000-000000000001');

select matches((select ticket_code from tickets where id = '40000000-0000-4000-8000-0000000000f1'),
  '^GLY-[23456789ABCDEFGHJKMNPQRSTVWXYZ]{6}$', 'ticket ID is GLY- + 6 unambiguous characters');
select is(length((select qr_token from tickets where id = '40000000-0000-4000-8000-0000000000f1')), 36, 'QR token is 144 random bits');
select set_config('test.qr', (select qr_token from tickets where id = '40000000-0000-4000-8000-0000000000f1'), true);

set local role authenticated;
set local request.jwt.claims = '{"sub": "40000000-0000-4000-8000-000000000002", "role": "authenticated"}';
select throws_ok($$ select share_ticket('40000000-0000-4000-8000-0000000000f1') $$, 'P0001', 'not_found',
  'cannot share someone else''s ticket');

set local request.jwt.claims = '{"sub": "40000000-0000-4000-8000-000000000001", "role": "authenticated"}';
select set_config('test.share_token', share_ticket('40000000-0000-4000-8000-0000000000f1'), true);
select is((select share_ticket('40000000-0000-4000-8000-0000000000f1')), current_setting('test.share_token'), 'sharing again reuses the same link');

set local role anon;
select is((select shared_ticket(current_setting('test.share_token')) ->> 'state'), 'valid', 'anyone with the link sees a valid ticket');
select is((select shared_ticket(current_setting('test.share_token')) ->> 'qr_token'),
  current_setting('test.qr'), 'a valid link carries the QR');
select is((select shared_ticket('not-a-token') ->> 'state'), 'invalid', 'unknown links are invalid');
reset role;

update tickets set status = 'boarded' where id = '40000000-0000-4000-8000-0000000000f1';
select is((select shared_ticket(current_setting('test.share_token')) ->> 'state'), 'on_trip', 'after the scan the link shows On Trip');
select ok((select shared_ticket(current_setting('test.share_token')) ->> 'qr_token') is null, 'On Trip links no longer carry the QR');

update tickets set status = 'completed' where id = '40000000-0000-4000-8000-0000000000f1';
select is((select shared_ticket(current_setting('test.share_token')) ->> 'state'), 'invalid', 'after drop-off the link is invalid');

update tickets set status = 'reserved' where id = '40000000-0000-4000-8000-0000000000f1';
update ticket_shares set expires_at = now() - interval '1 second';
select is((select shared_ticket(current_setting('test.share_token')) ->> 'state'), 'invalid', 'links expire when the trip''s day ends');

select * from finish();
rollback;
