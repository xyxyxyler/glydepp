-- Record WHICH terms a passenger accepted, not just when (uix-spec 2.1 Terms & Conditions).
alter table public.profiles add column terms_version text;
alter table public.profiles add constraint profiles_terms_pair
  check ((terms_accepted_at is null) = (terms_version is null));
