import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { availableSeats, isSeatAvailable, isValidSegment, segmentsOverlap, type SeatSegment } from './seats.ts';

// Product doc §9 example, inbound: Dodowa(0) → Adenta(1) → Madina(2) → Accra(3).
const ADENTA = 1;
const MADINA = 2;
const ACCRA = 3;

describe('segmentsOverlap', () => {
  it('back-to-back journeys share a seat (doc: Adenta→Madina then Madina→Accra)', () => {
    assert.equal(segmentsOverlap({ pickupIdx: ADENTA, dropoffIdx: MADINA }, { pickupIdx: MADINA, dropoffIdx: ACCRA }), false);
  });
  it('overlapping journeys conflict', () => {
    assert.equal(segmentsOverlap({ pickupIdx: 0, dropoffIdx: MADINA }, { pickupIdx: ADENTA, dropoffIdx: ACCRA }), true);
  });
  it('containment conflicts', () => {
    assert.equal(segmentsOverlap({ pickupIdx: 0, dropoffIdx: ACCRA }, { pickupIdx: ADENTA, dropoffIdx: MADINA }), true);
  });
  it('is symmetric', () => {
    const a = { pickupIdx: 1, dropoffIdx: 3 };
    const b = { pickupIdx: 2, dropoffIdx: 4 };
    assert.equal(segmentsOverlap(a, b), segmentsOverlap(b, a));
  });
});

describe('isSeatAvailable', () => {
  // Doc: Passenger A booked seat 1 Madina→Accra first; the bus "looks full".
  const taken: SeatSegment[] = [{ seatNo: 1, pickupIdx: MADINA, dropoffIdx: ACCRA }];
  it('a "full" seat is still bookable for a non-overlapping segment', () => {
    assert.equal(isSeatAvailable(1, { pickupIdx: ADENTA, dropoffIdx: MADINA }, taken), true);
  });
  it('rejects an overlapping segment on the same seat', () => {
    assert.equal(isSeatAvailable(1, { pickupIdx: ADENTA, dropoffIdx: ACCRA }, taken), false);
  });
  it('other seats are unaffected', () => {
    assert.equal(isSeatAvailable(2, { pickupIdx: ADENTA, dropoffIdx: ACCRA }, taken), true);
  });
});

describe('availableSeats', () => {
  it('lists every seat that is free for the whole segment', () => {
    const taken: SeatSegment[] = [
      { seatNo: 1, pickupIdx: 0, dropoffIdx: 2 },
      { seatNo: 2, pickupIdx: 2, dropoffIdx: 3 },
    ];
    assert.deepEqual(availableSeats(3, { pickupIdx: 1, dropoffIdx: 3 }, taken), [3]);
    assert.deepEqual(availableSeats(3, { pickupIdx: 2, dropoffIdx: 3 }, taken), [1, 3]);
  });
  it('invalid segments get no seats', () => {
    assert.deepEqual(availableSeats(3, { pickupIdx: 2, dropoffIdx: 2 }, []), []);
    assert.equal(isValidSegment({ pickupIdx: 3, dropoffIdx: 1 }), false);
  });
});
