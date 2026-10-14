import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { dueStopAlert, nextStop, stopAlertKey } from './stopAlerts.ts';

const stops = [
  { stopIdx: 0, name: 'Ridge', distanceM: 0 },
  { stopIdx: 1, name: 'Legon', distanceM: 5_000 },
  { stopIdx: 2, name: 'Madina', distanceM: 9_000 },
];

describe('dueStopAlert', () => {
  it('is silent between stops', () => assert.equal(dueStopAlert(2_000, stops, new Set()), null));
  it('never alerts for the departure stop', () => assert.equal(dueStopAlert(0, stops, new Set()), null));
  it('approaching within 500 m', () =>
    assert.deepEqual(dueStopAlert(4_600, stops, new Set()), { kind: 'approaching', stopIdx: 1, name: 'Legon' }));
  it('arrived within 40 m, also just past the stop', () => {
    assert.equal(dueStopAlert(4_970, stops, new Set())?.kind, 'arrived');
    assert.equal(dueStopAlert(5_030, stops, new Set())?.kind, 'arrived');
  });
  it('fires once per stop and kind', () => {
    const a = dueStopAlert(4_600, stops, new Set());
    assert.ok(a);
    assert.equal(dueStopAlert(4_700, stops, new Set([stopAlertKey(a)])), null);
  });
  it('moves on after the stop', () => assert.equal(dueStopAlert(8_600, stops, new Set())?.name, 'Madina'));
});

describe('nextStop', () => {
  it('first stop ahead', () => assert.equal(nextStop(5_100, stops)?.name, 'Madina'));
  it('null after the last', () => assert.equal(nextStop(9_100, stops), null));
});
