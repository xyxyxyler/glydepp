/**
 * Seat picking for one booking (uix-spec 2.3 Seat Selection). One seat per passenger; each
 * passenger has their own journey (extra stops = other people), so availability is checked per
 * journey against other bookings AND against seats this booking already gave its other passengers.
 */
import { isSeatAvailable, segmentsOverlap, type SeatSegment, type Segment } from './seats.ts';

export type Journey = Segment & { key: string };
export type SeatPick = Record<string, number | undefined>; // journey key → seat no
export type SeatState = 'available' | 'unavailable' | 'selected';

/** Segments held by this booking's other passengers (excluding `forKey`). */
function ownOthers(journeys: readonly Journey[], picks: SeatPick, forKey: string): SeatSegment[] {
  return journeys
    .filter((j) => j.key !== forKey && picks[j.key] !== undefined)
    .map((j) => ({ seatNo: picks[j.key] as number, pickupIdx: j.pickupIdx, dropoffIdx: j.dropoffIdx }));
}

/** How seat `seatNo` looks while choosing for `journey`. */
export function seatStateFor(
  seatNo: number,
  journey: Journey,
  journeys: readonly Journey[],
  taken: readonly SeatSegment[],
  picks: SeatPick,
): SeatState {
  if (picks[journey.key] === seatNo) return 'selected';
  const blocking = [...taken, ...ownOthers(journeys, picks, journey.key)];
  return isSeatAvailable(seatNo, journey, blocking) ? 'available' : 'unavailable';
}

/** Seats that can still be chosen for `journey`. */
export function freeSeatsFor(
  seatCount: number,
  journey: Journey,
  journeys: readonly Journey[],
  taken: readonly SeatSegment[],
  picks: SeatPick,
): number[] {
  return Array.from({ length: seatCount }, (_, i) => i + 1).filter(
    (n) => seatStateFor(n, journey, journeys, taken, picks) !== 'unavailable',
  );
}

/** Picks that are no longer valid after `taken` changed (someone else booked them). */
export function invalidPicks(journeys: readonly Journey[], taken: readonly SeatSegment[], picks: SeatPick): string[] {
  return journeys
    .filter((j) => {
      const seat = picks[j.key];
      return seat !== undefined && taken.some((t) => t.seatNo === seat && segmentsOverlap(t, j));
    })
    .map((j) => j.key);
}

/** Every passenger has a seat that's free for their journey. */
export function picksComplete(journeys: readonly Journey[], taken: readonly SeatSegment[], picks: SeatPick): boolean {
  return journeys.every((j) => picks[j.key] !== undefined) && invalidPicks(journeys, taken, picks).length === 0;
}
