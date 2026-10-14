-- Driver sign-up via invite, SOS, timeline, history (uix-spec §3).
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(14);

insert into auth.users (id, email) values
  ('a0000000-0000-4000-8000-000000000001', 'newdriver@app.test'),
  ('a0000000-0000-4000-8000-000000000002', 'second@app.test'),
  ('a0000000-0000-4000-8000-000000000003', 'kwame@app.test');
insert into bus_owners (id, name) values ('a0000000-0000-4000-8000-0000000000b1', 'Test Fleet');
insert into driver_invites (code, owner_id) values ('TESTCODE', 'a0000000-0000-4000-8000-0000000000b1');
insert into driver_invites (code, owner_id, expires_at, created_at) values ('OLDCODE1', 'a0000000-0000-4000-8000-0000000000b1', now() - interval '1 hour', now() - interval '49 hours');
insert into driver_invites (owner_id) values ('a0000000-0000-4000-8000-0000000000b1');
select matches((select code from driver_invites where code not in ('TESTCODE', 'OLDCODE1')), '^[23456789ABCDEFGHJKMNPQRSTVWXYZ]{8}$', 'generated invite codes are 8 unambiguous characters');
select ok((select expires_at between now() + interval '47 hours' and now() + interval '49 hours' from driver_invites where code = 'TESTCODE'), 'invites expire after 48 hours');

set local role authenticated;
set local request.jwt.claims = '{"sub": "a0000000-0000-4000-8000-000000000001", "role": "authenticated"}';
select throws_ok($$ select complete_driver_signup('Ama', 'Driver', '1990-01-01', 'Madina', 'GHA-123456789-0', 'DL12345', 'OLDCODE1', null) $$,
  'P0001', 'expired_invite', 'expired invite codes are refused');
select throws_ok($$ select complete_driver_signup('Ama', 'Driver', '1990-01-01', 'Madina', 'GHA-123456789-0', 'DL12345', 'NOPE0000', null) $$,
  'P0001', 'invalid_invite', 'unknown invite codes are refused');
select throws_ok($$ select complete_driver_signup('Ama', 'Driver', '1990-01-01', 'Madina', 'GHA-12345', 'DL12345', 'TESTCODE', null) $$,
  'P0001', 'bad_details', 'a malformed Ghana Card number is refused');
select throws_ok($$ select complete_driver_signup('Ama', 'Driver', current_date - 365 * 10, 'Madina', 'GHA-123456789-0', 'DL12345', 'TESTCODE', null) $$,
  'P0001', 'bad_details', 'drivers must be 18 or older');
select lives_ok($$ select complete_driver_signup('Ama', 'Driver', '1990-01-01', 'Madina', 'gha-123456789-0', 'dl12345', 'testcode', 'a0000000-0000-4000-8000-000000000001/photo.jpg') $$,
  'a valid invite completes sign-up');
select is((select status::text from drivers where id = 'a0000000-0000-4000-8000-000000000001'), 'pending', 'new drivers start as Pending Approval');
select is((select owner_id from drivers where id = 'a0000000-0000-4000-8000-000000000001'), 'a0000000-0000-4000-8000-0000000000b1'::uuid,
  'linked to the owner who issued the code');

set local request.jwt.claims = '{"sub": "a0000000-0000-4000-8000-000000000002", "role": "authenticated"}';
select throws_ok($$ select complete_driver_signup('Yaw', 'Two', '1990-01-01', 'Adenta', 'GHA-987654321-0', 'DL99999', 'TESTCODE', null) $$,
  'P0001', 'used_invite', 'an invite code works once');
set local request.jwt.claims = '{"sub": "a0000000-0000-4000-8000-000000000001", "role": "authenticated"}';
select throws_ok($$ select driver_sos('Engine fault') $$, '42501', null, 'a pending driver cannot send SOS through the driver flow');
reset role;

-- Approved driver mid-trip: SOS ends the trip and alerts HQ.
insert into drivers (id, first_name, last_name, status) values ('a0000000-0000-4000-8000-000000000003', 'Kwame', 'Ok', 'approved');
insert into stops (id, name, latitude, longitude) values
  ('a0000000-0000-4000-8000-0000000000c0', 'app-A', 5.80, -0.12), ('a0000000-0000-4000-8000-0000000000c1', 'app-B', 5.70, -0.17);
insert into routes (id, code, name, direction, length_m, free_flow_s) values ('a0000000-0000-4000-8000-0000000000d0', 'APP', 'app route', 'inbound', 10000, 1000);
insert into route_stops (route_id, stop_idx, stop_id, distance_m) values
  ('a0000000-0000-4000-8000-0000000000d0', 0, 'a0000000-0000-4000-8000-0000000000c0', 0),
  ('a0000000-0000-4000-8000-0000000000d0', 1, 'a0000000-0000-4000-8000-0000000000c1', 10000);
insert into seat_layouts (id, name, seat_count, grid) values ('a0000000-0000-4000-8000-0000000000e0', 'app-layout', 29, '[]');
insert into buses (id, plate, layout_id) values ('a0000000-0000-4000-8000-0000000000e1', 'APP-BUS', 'a0000000-0000-4000-8000-0000000000e0');
set local role authenticated;
set local request.jwt.claims = '{"sub": "a0000000-0000-4000-8000-000000000003", "role": "authenticated"}';
select set_config('test.trip', driver_start_trip('a0000000-0000-4000-8000-0000000000e1', 'a0000000-0000-4000-8000-0000000000d0')::text, true);
select is((select count(*)::int from driver_trip_timeline(current_setting('test.trip')::uuid)), 2, 'timeline lists every stop');
select lives_ok($$ select driver_sos('Tyre burst near Madina') $$, 'SOS is sent');
reset role;
select is((select status::text from trips where id = current_setting('test.trip')::uuid), 'completed', 'SOS ends the active trip automatically');

select * from finish();
rollback;
