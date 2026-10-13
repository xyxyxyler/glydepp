-- Saved payment methods + wallet top-ups (uix-spec 2.6).
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(10);

insert into auth.users (id, email) values
  ('50000000-0000-4000-8000-000000000001', 'ama@methods.test'),
  ('50000000-0000-4000-8000-000000000002', 'kofi@methods.test');

set local role authenticated;
set local request.jwt.claims = '{"sub": "50000000-0000-4000-8000-000000000001", "role": "authenticated"}';

insert into payment_methods (id, passenger_id, kind, momo_network, momo_number)
  values ('50000000-0000-4000-8000-0000000000a1', '50000000-0000-4000-8000-000000000001', 'momo', 'mtn', '+233241234567');
select ok((select is_default from payment_methods where id = '50000000-0000-4000-8000-0000000000a1'), 'the first method becomes the default');

insert into payment_methods (id, passenger_id, kind, card_brand, card_last4)
  values ('50000000-0000-4000-8000-0000000000a2', '50000000-0000-4000-8000-000000000001', 'card', 'Test card', '4242');
select ok(not (select is_default from payment_methods where id = '50000000-0000-4000-8000-0000000000a2'), 'later methods are not default');

select throws_ok($$ insert into payment_methods (passenger_id, kind, momo_network, momo_number, card_last4)
  values ('50000000-0000-4000-8000-000000000001', 'momo', 'mtn', '+233551234567', '4242') $$,
  '23514', null, 'a MoMo method cannot carry card details');
select throws_ok($$ insert into payment_methods (passenger_id, kind, momo_network, momo_number)
  values ('50000000-0000-4000-8000-000000000002', 'momo', 'mtn', '+233551234567') $$,
  '42501', null, 'cannot add a method for someone else');

select set_default_payment_method('50000000-0000-4000-8000-0000000000a2');
select is((select count(*)::int from payment_methods where is_default), 1, 'exactly one default');
select ok((select is_default from payment_methods where id = '50000000-0000-4000-8000-0000000000a2'), 'set as default works');

delete from payment_methods where id = '50000000-0000-4000-8000-0000000000a2';
select ok((select is_default from payment_methods where id = '50000000-0000-4000-8000-0000000000a1'), 'removing the default promotes another');

set local request.jwt.claims = '{"sub": "50000000-0000-4000-8000-000000000002", "role": "authenticated"}';
select is((select count(*)::int from payment_methods), 0, 'others cannot see my methods');
select throws_ok($$ select credit_wallet('50000000-0000-4000-8000-000000000002', 5000, 'x') $$, '42501', null,
  'passengers cannot credit wallets themselves');

reset role;
insert into wallets (passenger_id, balance_pesewas) values ('50000000-0000-4000-8000-000000000001', 1000);
select is(credit_wallet('50000000-0000-4000-8000-000000000001', 5000, 'MOCK'), 6000, 'a top-up is credited (service role)');

select * from finish();
rollback;
