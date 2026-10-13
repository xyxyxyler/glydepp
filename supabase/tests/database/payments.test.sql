-- Payment flow: server pricing, holds, races, expiry, confirmation rights, wallet, RLS.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(18);

-- Fixtures: route PAY A(0) B(1) C(2) D(3); test-only fare numbers (not Glyde's).
insert into auth.users (id, email) values
  ('30000000-0000-4000-8000-000000000001', 'ama@pay.test'),
  ('30000000-0000-4000-8000-000000000002', 'kofi@pay.test');
insert into stops (id, name, latitude, longitude) values
  ('30000000-0000-4000-8000-0000000000a0', 'pay-A', 5.80, -0.12),
  ('30000000-0000-4000-8000-0000000000a1', 'pay-B', 5.70, -0.17),
  ('30000000-0000-4000-8000-0000000000a2', 'pay-C', 5.68, -0.17),
  ('30000000-0000-4000-8000-0000000000a3', 'pay-D', 5.55, -0.20);
insert into routes (id, code, name, direction, length_m, free_flow_s)
  values ('30000000-0000-4000-8000-0000000000b0', 'PAY', 'pay route', 'inbound', 30000, 3000);
insert into route_stops (route_id, stop_idx, stop_id, distance_m) values
  ('30000000-0000-4000-8000-0000000000b0', 0, '30000000-0000-4000-8000-0000000000a0', 0),
  ('30000000-0000-4000-8000-0000000000b0', 1, '30000000-0000-4000-8000-0000000000a1', 10000),
  ('30000000-0000-4000-8000-0000000000b0', 2, '30000000-0000-4000-8000-0000000000a2', 13000),
  ('30000000-0000-4000-8000-0000000000b0', 3, '30000000-0000-4000-8000-0000000000a3', 30000);
insert into seat_layouts (id, name, seat_count, grid) values ('30000000-0000-4000-8000-0000000000c0', 'pay-layout', 29, '[]');
insert into buses (id, plate, layout_id) values ('30000000-0000-4000-8000-0000000000d0', 'PAY-BUS', '30000000-0000-4000-8000-0000000000c0');
insert into trips (id, route_id, bus_id, departs_at, status) values
  ('30000000-0000-4000-8000-0000000000e0', '30000000-0000-4000-8000-0000000000b0', '30000000-0000-4000-8000-0000000000d0', now(), 'active');
insert into fare_rules (route_code, base_pesewas, per_km_pesewas, booking_fee_pesewas, platform_fee_bps)
  values ('PAY', 1500, 100, 50, 200);

-- 1. Server fare = packages/domain seatFare for the same inputs (fare.test.ts parity).
select is(seat_fare_pesewas('PAY', 3000), 1886, 'server fare matches the domain formula (1800 base + 36 platform + 50 fee)');

-- Ama holds seat 1, C → D.
set local role authenticated;
set local request.jwt.claims = '{"sub": "30000000-0000-4000-8000-000000000001", "role": "authenticated"}';
create temp table ama_hold on commit drop as
  select hold_seats('30000000-0000-4000-8000-0000000000e0', '30000000-0000-4000-8000-0000000000a2',
                    '[{"dropoff_stop_id": "30000000-0000-4000-8000-0000000000a3", "seat_no": 1}]') as h;
select is((select (h ->> 'amount_pesewas')::int from ama_hold), seat_fare_pesewas('PAY', 17000), 'priced on the server');
select is((select status::text from tickets where seat_no = 1 and trip_id = '30000000-0000-4000-8000-0000000000e0'), 'held', 'seat is held');
select ok((select hold_expires_at between now() + interval '170 seconds' and now() + interval '190 seconds'
           from tickets where seat_no = 1 and trip_id = '30000000-0000-4000-8000-0000000000e0'), 'hold lasts 3 minutes');
select is((select count(*)::int from tickets), 1, 'Ama sees her own ticket');
select throws_ok($$ select confirm_payment((select (h ->> 'payment_id')::uuid from ama_hold), 'card', 'mock', 'x') $$,
  '42501', null, 'a passenger cannot confirm their own payment');

-- Kofi races for the same seat.
set local request.jwt.claims = '{"sub": "30000000-0000-4000-8000-000000000002", "role": "authenticated"}';
select is((select count(*)::int from tickets), 0, 'Kofi cannot see Ama''s ticket');
select throws_ok($$ select hold_seats('30000000-0000-4000-8000-0000000000e0', '30000000-0000-4000-8000-0000000000a1',
                   '[{"dropoff_stop_id": "30000000-0000-4000-8000-0000000000a3", "seat_no": 1}]') $$,
  'P0001', 'seat_taken', 'a held seat cannot be taken by someone else');
select is((select count(*)::int from trip_seat_segments('30000000-0000-4000-8000-0000000000e0') where seat_no = 1), 1,
  'held seats show as taken');

-- Ama's hold expires → the seat frees up for Kofi.
reset role;
update tickets set hold_expires_at = now() - interval '1 second' where seat_no = 1 and status = 'held';
update payments set expires_at = now() - interval '1 second' where passenger_id = '30000000-0000-4000-8000-000000000001';
select is((select count(*)::int from trip_seat_segments('30000000-0000-4000-8000-0000000000e0') where seat_no = 1), 0,
  'an expired hold no longer counts');
set local role authenticated;
set local request.jwt.claims = '{"sub": "30000000-0000-4000-8000-000000000002", "role": "authenticated"}';
create temp table kofi_hold on commit drop as
  select hold_seats('30000000-0000-4000-8000-0000000000e0', '30000000-0000-4000-8000-0000000000a2',
                    '[{"dropoff_stop_id": "30000000-0000-4000-8000-0000000000a3", "seat_no": 1}]') as h;
reset role;
select is((select status from payments where passenger_id = '30000000-0000-4000-8000-000000000001'), 'expired',
  'the expired hold''s payment is marked expired');

-- Service role confirms Kofi's card payment.
select is(confirm_payment((select (h ->> 'payment_id')::uuid from kofi_hold), 'card', 'mock', 'MOCK-1'), 'succeeded', 'confirmation succeeds');
select is((select status::text from tickets where payment_id = (select (h ->> 'payment_id')::uuid from kofi_hold)), 'reserved',
  'paid tickets become reserved');

-- Wallet: test balance, a wallet payment, then not enough money.
set local role authenticated;
set local request.jwt.claims = '{"sub": "30000000-0000-4000-8000-000000000001", "role": "authenticated"}';
select is(my_wallet(), 10000, 'a new wallet opens with the GHS 100 test balance');
create temp table ama_wallet_hold on commit drop as
  select hold_seats('30000000-0000-4000-8000-0000000000e0', '30000000-0000-4000-8000-0000000000a2',
                    '[{"dropoff_stop_id": "30000000-0000-4000-8000-0000000000a3", "seat_no": 2}]') as h;
reset role;
select is(confirm_payment((select (h ->> 'payment_id')::uuid from ama_wallet_hold), 'wallet', 'wallet', null), 'succeeded', 'wallet payment succeeds');
select is((select balance_pesewas from wallets where passenger_id = '30000000-0000-4000-8000-000000000001'),
  10000 - seat_fare_pesewas('PAY', 17000), 'the fare is deducted from the wallet');

-- The bus passes B: B can no longer be booked.
insert into bus_positions (trip_id, latitude, longitude, distance_m) values ('30000000-0000-4000-8000-0000000000e0', 5.69, -0.17, 11000);
set local role authenticated;
set local request.jwt.claims = '{"sub": "30000000-0000-4000-8000-000000000002", "role": "authenticated"}';
select throws_ok($$ select hold_seats('30000000-0000-4000-8000-0000000000e0', '30000000-0000-4000-8000-0000000000a1',
                   '[{"dropoff_stop_id": "30000000-0000-4000-8000-0000000000a2", "seat_no": 5}]') $$,
  'P0001', 'bus_passed', 'cannot hold a seat from a stop the bus has passed');

set local role anon;
select throws_ok($$ select hold_seats('30000000-0000-4000-8000-0000000000e0', '30000000-0000-4000-8000-0000000000a2',
                   '[{"dropoff_stop_id": "30000000-0000-4000-8000-0000000000a3", "seat_no": 6}]') $$,
  '42501', null, 'signed-out users cannot hold seats');
reset role;

select * from finish();
rollback;
