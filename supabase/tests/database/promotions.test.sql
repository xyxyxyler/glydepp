-- Promotions applied on the server at hold time; counted only when paid.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(7);

insert into auth.users (id, email) values ('70000000-0000-4000-8000-000000000001', 'ama@promo.test');
insert into stops (id, name, latitude, longitude) values
  ('70000000-0000-4000-8000-0000000000a0', 'pr-A', 5.80, -0.12),
  ('70000000-0000-4000-8000-0000000000a1', 'pr-B', 5.70, -0.17);
insert into routes (id, code, name, direction, length_m, free_flow_s)
  values ('70000000-0000-4000-8000-0000000000b0', 'PR', 'pr route', 'inbound', 10000, 1000);
insert into route_stops (route_id, stop_idx, stop_id, distance_m) values
  ('70000000-0000-4000-8000-0000000000b0', 0, '70000000-0000-4000-8000-0000000000a0', 0),
  ('70000000-0000-4000-8000-0000000000b0', 1, '70000000-0000-4000-8000-0000000000a1', 10000);
insert into seat_layouts (id, name, seat_count, grid) values ('70000000-0000-4000-8000-0000000000c0', 'pr-layout', 29, '[]');
insert into buses (id, plate, layout_id) values ('70000000-0000-4000-8000-0000000000d0', 'PR-BUS', '70000000-0000-4000-8000-0000000000c0');
insert into trips (id, route_id, bus_id, departs_at, status) values
  ('70000000-0000-4000-8000-0000000000e0', '70000000-0000-4000-8000-0000000000b0', '70000000-0000-4000-8000-0000000000d0', now() + interval '30 minutes', 'scheduled');
insert into fare_rules (route_code, base_pesewas, per_km_pesewas, booking_fee_pesewas, platform_fee_bps) values ('PR', 1500, 0, 0, 0);
insert into promotions (id, title, discount_type, discount_value, valid_until, max_uses_per_passenger) values
  ('70000000-0000-4000-8000-0000000000f1', 'test 20%', 'percent', 20, now() + interval '1 day', 1),
  ('70000000-0000-4000-8000-0000000000f2', 'test GHS 1', 'fixed', 100, now() + interval '1 day', 5);
insert into promotions (title, discount_type, discount_value, valid_from, valid_until) values
  ('expired 90%', 'percent', 90, now() - interval '2 days', now() - interval '1 day');
insert into promotions (title, discount_type, discount_value, route_code, valid_until) values
  ('other route 50%', 'percent', 50, 'NOT-PR', now() + interval '1 day');

set local role authenticated;
set local request.jwt.claims = '{"sub": "70000000-0000-4000-8000-000000000001", "role": "authenticated"}';
select is((select count(*)::int from promotions), 3, 'passengers see current promotions only (not expired)');
create temp table h1 on commit drop as select hold_seats('70000000-0000-4000-8000-0000000000e0', '70000000-0000-4000-8000-0000000000a0',
  '[{"dropoff_stop_id": "70000000-0000-4000-8000-0000000000a1", "seat_no": 1}]') as h;
select is((select (h ->> 'discount_pesewas')::int from h1), 300, 'the best eligible promotion applies (20% of GHS 15)');
select is((select (h ->> 'amount_pesewas')::int from h1), 1200, 'the passenger pays the discounted amount');
reset role;
select is((select count(*)::int from promotion_redemptions), 0, 'not counted until paid');
select confirm_payment((select (h ->> 'payment_id')::uuid from h1), 'card', 'mock', 'x');
select is((select count(*)::int from promotion_redemptions), 1, 'counted once the payment succeeds');

set local role authenticated;
set local request.jwt.claims = '{"sub": "70000000-0000-4000-8000-000000000001", "role": "authenticated"}';
create temp table h2 on commit drop as select hold_seats('70000000-0000-4000-8000-0000000000e0', '70000000-0000-4000-8000-0000000000a0',
  '[{"dropoff_stop_id": "70000000-0000-4000-8000-0000000000a1", "seat_no": 2}]') as h;
select is((select h ->> 'promotion_title' from h2), 'test GHS 1', 'a used-up promotion is skipped for the next eligible one');
select is((select (h ->> 'amount_pesewas')::int from h2), 1400, 'fixed discounts work');
reset role;

select * from finish();
rollback;
