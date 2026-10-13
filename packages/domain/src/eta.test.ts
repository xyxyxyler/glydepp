import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { arrivalAt, travelSeconds } from './eta.ts';
import { haversineM, nearest } from './geo.ts';
import { seatWarning } from './seats.ts';

const route = { lengthM: 30_000, freeFlowS: 3_000 };

describe('travelSeconds', () => {
  it('scales free-flow time by distance', () => assert.equal(travelSeconds(10_000, 13_000, route), 300));
  it('is null without timing', () => assert.equal(travelSeconds(0, 1, { lengthM: 1, freeFlowS: null }), null));
});

describe('arrivalAt', () => {
  const departsAt = '2026-10-13T06:00:00.000Z';
  it('scheduled: from departure', () => {
    const t = arrivalAt({ status: 'scheduled', departsAt, busDistanceM: null, busRecordedAt: null }, 3_000, route);
    assert.equal(t, Date.parse(departsAt) + 300_000);
  });
  it('active: from the live position', () => {
    const at = '2026-10-13T06:20:00.000Z';
    const t = arrivalAt({ status: 'active', departsAt, busDistanceM: 10_000, busRecordedAt: at }, 13_000, route);
    assert.equal(t, Date.parse(at) + 300_000);
  });
});

describe('nearest', () => {
  const stops = [
    { name: 'Madina', latitude: 5.686359, longitude: -0.171378 },
    { name: 'Adenta', latitude: 5.708717, longitude: -0.170619 },
  ];
  it('picks the closest stop', () => {
    assert.equal(nearest({ latitude: 5.705, longitude: -0.17 }, stops)?.item.name, 'Adenta');
  });
  it('haversine is roughly right (Madina→Adenta ≈ 2.5 km)', () => {
    const d = haversineM(stops[0], stops[1]);
    assert.ok(d > 2_300 && d < 2_700, String(d));
  });
});

describe('seatWarning', () => {
  it('uses the approved thresholds', () => {
    assert.deepEqual([3, 4, 7, 8].map(seatWarning), ['last-seats', 'almost-full', 'almost-full', null]);
  });
});
