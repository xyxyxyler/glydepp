import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { seatFare, totalFare, type FareRules } from './fare.ts';

// Test-only numbers — not Glyde fares.
const rules: FareRules = { basePesewas: 0, perKmPesewas: 100, bookingFeePesewas: 50, platformFeeBps: 200, peakMultiplier: 1 };

describe('seatFare', () => {
  it('follows the docs fare anatomy', () => {
    assert.deepEqual(seatFare(10_000, rules), {
      basePesewas: 1000,
      bookingFeePesewas: 50,
      platformFeePesewas: 20,
      discountPesewas: 0,
      totalPesewas: 1070,
    });
  });
  it('peak multiplier scales the base, not the fixed fee', () => {
    assert.equal(seatFare(10_000, { ...rules, peakMultiplier: 1.5 })?.basePesewas, 1500);
    assert.equal(seatFare(10_000, { ...rules, peakMultiplier: 1.5 })?.bookingFeePesewas, 50);
  });
  it('discount never takes the fare below zero', () => {
    assert.equal(seatFare(1000, rules, 1_000_000)?.totalPesewas, 0);
  });
  it('flat standard rate: GHS 15 per seat regardless of distance', () => {
    const flat: FareRules = { basePesewas: 1500, perKmPesewas: 0, bookingFeePesewas: 0, platformFeeBps: 0, peakMultiplier: 1 };
    assert.equal(seatFare(2_000, flat)?.totalPesewas, 1500);
    assert.equal(seatFare(40_000, flat)?.totalPesewas, 1500);
  });
  it('flat + per-km combine, and the peak multiplier scales both', () => {
    const mixed = { ...rules, basePesewas: 500, peakMultiplier: 2 };
    assert.equal(seatFare(10_000, mixed)?.basePesewas, (500 + 1000) * 2);
  });
  it('is unknown without rates', () => {
    assert.equal(seatFare(10_000, null), null);
  });
});

describe('totalFare (multi-stop)', () => {
  it('sums each person’s journey', () => {
    assert.equal(totalFare([10_000, 5_000], rules), 1070 + 560);
  });
  it('is unknown if rates are missing', () => {
    assert.equal(totalFare([10_000], null), null);
  });
});
