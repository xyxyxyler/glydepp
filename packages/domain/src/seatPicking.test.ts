import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { freeSeatsFor, invalidPicks, picksComplete, seatStateFor, type Journey } from './seatPicking.ts';
import type { SeatSegment } from './seats.ts';

// Madina(2) → Ridge(5) and Madina(2) → 37(4): two passengers from the same pickup.
const a: Journey = { key: 'a', pickupIdx: 2, dropoffIdx: 5 };
const b: Journey = { key: 'b', pickupIdx: 2, dropoffIdx: 4 };
const journeys = [a, b];
// Someone else: seat 1 for 0→2 (gets off where we board), seat 2 for 3→6 (overlaps).
const taken: SeatSegment[] = [
  { seatNo: 1, pickupIdx: 0, dropoffIdx: 2 },
  { seatNo: 2, pickupIdx: 3, dropoffIdx: 6 },
];

describe('seatStateFor', () => {
  it('segment-aware: a seat vacated at our pickup is available', () => {
    assert.equal(seatStateFor(1, a, journeys, taken, {}), 'available');
  });
  it('overlapping booking makes a seat unavailable', () => {
    assert.equal(seatStateFor(2, a, journeys, taken, {}), 'unavailable');
  });
  it('a seat given to my other passenger is unavailable to this one', () => {
    assert.equal(seatStateFor(5, b, journeys, taken, { a: 5 }), 'unavailable');
    assert.equal(seatStateFor(5, a, journeys, taken, { a: 5 }), 'selected');
  });
});

describe('freeSeatsFor', () => {
  it('excludes overlaps and own passengers', () => {
    const free = freeSeatsFor(5, b, journeys, taken, { a: 3 });
    assert.deepEqual(free, [1, 4, 5]);
  });
});

describe('invalidPicks / picksComplete', () => {
  it('flags a pick someone else just booked', () => {
    const later = [...taken, { seatNo: 4, pickupIdx: 1, dropoffIdx: 3 }];
    assert.deepEqual(invalidPicks(journeys, later, { a: 4, b: 5 }), ['a']);
  });
  it('complete only when every passenger has a valid seat', () => {
    assert.equal(picksComplete(journeys, taken, { a: 3 }), false);
    assert.equal(picksComplete(journeys, taken, { a: 3, b: 4 }), true);
  });
});
