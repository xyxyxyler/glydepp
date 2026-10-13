/**
 * Segment-aware seat allocation (CLAUDE.md §6, product doc §9).
 * Mirrors the Postgres exclusion constraint `tickets_no_seat_overlap`; the database is the
 * final authority, this is for instant UI feedback (seat grid) without a round trip.
 */
import type { Database } from './database.types.ts';

export type TicketStatus = Database['public']['Enums']['ticket_status'];

/** Statuses that hold a seat. Absent / cancelled / completed tickets release it. */
export const SEAT_HOLDING_STATUSES: readonly TicketStatus[] = ['reserved', 'boarded'];

/** A journey from pickup to drop-off: occupies the seat for [pickupIdx, dropoffIdx). */
export type Segment = { pickupIdx: number; dropoffIdx: number };
export type SeatSegment = Segment & { seatNo: number };

export function isValidSegment(s: Segment): boolean {
  return Number.isInteger(s.pickupIdx) && Number.isInteger(s.dropoffIdx) && s.pickupIdx >= 0 && s.pickupIdx < s.dropoffIdx;
}

/** Half-open ranges: a journey ending at stop k does not overlap one starting at stop k. */
export function segmentsOverlap(a: Segment, b: Segment): boolean {
  return a.pickupIdx < b.dropoffIdx && b.pickupIdx < a.dropoffIdx;
}

/** Can `seatNo` be booked for `wanted`, given the seat-holding segments already on the trip? */
export function isSeatAvailable(seatNo: number, wanted: Segment, taken: readonly SeatSegment[]): boolean {
  return taken.every((t) => t.seatNo !== seatNo || !segmentsOverlap(t, wanted));
}

/** Seat numbers (1..seatCount) free for the whole of `wanted`. Feeds the seat grid. */
export function availableSeats(seatCount: number, wanted: Segment, taken: readonly SeatSegment[]): number[] {
  if (!isValidSegment(wanted)) return [];
  return Array.from({ length: seatCount }, (_, i) => i + 1).filter((n) => isSeatAvailable(n, wanted, taken));
}

/** Card warnings (uix-spec 2.3). Thresholds approved 2026-10-13. */
export const LAST_SEATS_THRESHOLD = 3;
export const ALMOST_FULL_THRESHOLD = 7;

export type SeatWarning = 'last-seats' | 'almost-full' | null;

export function seatWarning(seatsFree: number): SeatWarning {
  if (seatsFree <= 0) return null; // full buses are not offered at all
  if (seatsFree <= LAST_SEATS_THRESHOLD) return 'last-seats';
  if (seatsFree <= ALMOST_FULL_THRESHOLD) return 'almost-full';
  return null;
}
