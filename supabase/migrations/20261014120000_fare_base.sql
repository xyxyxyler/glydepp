-- Flat base per seat (docs: "Base Fare: core price for the distance and seat") alongside the
-- per-km part, plus a note recording where a rule's numbers came from.
alter table public.fare_rules
  add column base_pesewas integer not null default 0 check (base_pesewas >= 0),
  add column note text;

-- Standard rate set by Glyde on 2026-10-14: GHS 15.00 per seat, flat. The docs define no
-- amounts; booking and platform fees are 0 until set.
insert into public.fare_rules (route_code, base_pesewas, per_km_pesewas, booking_fee_pesewas, platform_fee_bps, peak_multiplier, note)
values ('ACC-DOD', 1500, 0, 0, 0, 1.00, 'Standard rate GHS 15 per seat (Glyde, 2026-10-14). Fees 0 until set.');
