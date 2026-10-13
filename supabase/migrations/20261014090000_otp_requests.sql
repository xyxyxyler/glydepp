-- Mock OTP bookkeeping (CLAUDE.md §4: SMS/email OTP is mocked with a fixed test code).
-- Lets the auth-otp function enforce expiry, resend cooldown and attempt limits for real.
-- Only the function (service role) touches this table: RLS on, no policies.
create table public.otp_requests (
  identifier text primary key, -- E.164 phone (+233…) or lower-cased email
  channel text not null check (channel in ('phone', 'email')),
  requested_at timestamptz not null default now(),
  attempts smallint not null default 0
);
alter table public.otp_requests enable row level security;
