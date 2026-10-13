-- profiles: each passenger can only read/write their own row.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(8);

insert into auth.users (id, email) values
  ('20000000-0000-4000-8000-000000000001', 'ama@profiles.test'),
  ('20000000-0000-4000-8000-000000000002', 'kofi@profiles.test');

-- Act as Ama.
set local role authenticated;
set local request.jwt.claims = '{"sub": "20000000-0000-4000-8000-000000000001", "role": "authenticated"}';

select lives_ok(
  $$ insert into profiles (id, first_name, last_name, residential_area, work_location, company_name)
     values ('20000000-0000-4000-8000-000000000001', 'Ama', 'Mensah', 'Madina', 'Ridge', 'Ministry of Finance') $$,
  'a passenger can create their own profile');
select throws_ok(
  $$ insert into profiles (id, first_name, last_name, residential_area, work_location, company_name)
     values ('20000000-0000-4000-8000-000000000002', 'X', 'Y', 'A', 'B', 'C') $$,
  '42501', null, 'cannot create a profile for someone else');
select throws_ok(
  $$ update profiles set first_name = '  ' where id = '20000000-0000-4000-8000-000000000001' $$,
  '23514', null, 'blank required fields are rejected');
select lives_ok(
  $$ update profiles set company_name = 'Ghana Revenue Authority' where id = '20000000-0000-4000-8000-000000000001' $$,
  'a passenger can update their own profile');

-- Kofi's row exists (created by the service role) …
reset role;
insert into profiles (id, first_name, last_name, residential_area, work_location, company_name)
  values ('20000000-0000-4000-8000-000000000002', 'Kofi', 'Owusu', 'Adenta', '37', 'Korle Bu');

-- … but Ama can neither see nor change it.
set local role authenticated;
set local request.jwt.claims = '{"sub": "20000000-0000-4000-8000-000000000001", "role": "authenticated"}';
select is((select count(*)::int from profiles), 1, 'a passenger sees only their own profile');
update profiles set first_name = 'Hacked' where id = '20000000-0000-4000-8000-000000000002';
reset role;
select is((select first_name from profiles where id = '20000000-0000-4000-8000-000000000002'), 'Kofi',
  'updating someone else''s profile changes nothing');

set local role anon;
select is((select count(*)::int from profiles), 0, 'signed-out users see no profiles');
reset role;

select isnt((select updated_at from profiles where id = '20000000-0000-4000-8000-000000000001'), null, 'updated_at is maintained');

select * from finish();
rollback;
