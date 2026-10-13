import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatGhanaPhone, internalEmailForPhone, normaliseEmail, normaliseGhanaPhone } from './identity.ts';

describe('normaliseGhanaPhone', () => {
  it('accepts the ways people type Ghana mobiles', () => {
    for (const input of ['0241234567', '024 123 4567', '241234567', '+233 24 123 4567', '233241234567']) {
      assert.equal(normaliseGhanaPhone(input), '+233241234567', input);
    }
  });
  it('accepts 05x numbers', () => assert.equal(normaliseGhanaPhone('0551234567'), '+233551234567'));
  it('rejects wrong lengths and non-mobile prefixes', () => {
    for (const input of ['024123456', '02412345678', '0301234567', '', 'abc']) {
      assert.equal(normaliseGhanaPhone(input), null, input);
    }
  });
});

describe('formatGhanaPhone', () => {
  it('formats for display', () => assert.equal(formatGhanaPhone('+233241234567'), '024 123 4567'));
});

describe('normaliseEmail', () => {
  it('lower-cases and trims', () => assert.equal(normaliseEmail('  Ama@Example.COM '), 'ama@example.com'));
  it('rejects malformed', () => assert.equal(normaliseEmail('ama@'), null));
});

describe('internalEmailForPhone', () => {
  it('matches the auth-otp scheme', () =>
    assert.equal(internalEmailForPhone('+233200000099'), 'phone-233200000099@users.glyde.invalid'));
});
