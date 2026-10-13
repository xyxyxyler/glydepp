-- Seats held while the passenger pays (CLAUDE.md §6: held briefly, then released).
-- Separate migration: a new enum value can't be used in the transaction that adds it.
alter type public.ticket_status add value if not exists 'held' before 'reserved';
