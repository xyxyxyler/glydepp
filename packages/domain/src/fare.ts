/**
 * Fare anatomy (uix-spec HQ "Revenue Breakdown"):
 *   base fare (core price for the distance and seat: flat per seat + per km) — × HQ dynamic-pricing multiplier
 * + booking fee (fixed per seat)
 * + platform fee (percentage)
 * − discounts
 * Amounts are integer pesewas (CLAUDE.md §8). Rates live in public.fare_rules; with no rates the
 * fare is unknown (null) and the app shows "Fare pending" — fares are never invented in code.
 *
 * Assumption (flagged, docs don't say): the platform % applies to the base fare, not the fees.
 */
export type FareRules = {
  /** Flat part of the base fare, per seat. */
  basePesewas: number;
  perKmPesewas: number;
  bookingFeePesewas: number;
  platformFeeBps: number; // 100 bps = 1%
  peakMultiplier: number;
};

export type FareBreakdown = {
  basePesewas: number;
  bookingFeePesewas: number;
  platformFeePesewas: number;
  discountPesewas: number;
  totalPesewas: number;
};

/** Fare for one seat over `distanceM` metres of the route. */
export function seatFare(distanceM: number, rules: FareRules | null, discountPesewas = 0): FareBreakdown | null {
  if (!rules || distanceM < 0) return null;
  const basePesewas = Math.round((rules.basePesewas + (rules.perKmPesewas * distanceM) / 1000) * rules.peakMultiplier);
  const platformFeePesewas = Math.round((basePesewas * rules.platformFeeBps) / 10_000);
  const gross = basePesewas + rules.bookingFeePesewas + platformFeePesewas;
  const discount = Math.min(Math.max(0, discountPesewas), gross);
  return {
    basePesewas,
    bookingFeePesewas: rules.bookingFeePesewas,
    platformFeePesewas,
    discountPesewas: discount,
    totalPesewas: gross - discount,
  };
}

/** Multi-stop: each extra stop is a separate person's journey (uix-spec 2.3). Null if any is unknown. */
export function totalFare(distancesM: readonly number[], rules: FareRules | null): number | null {
  let total = 0;
  for (const d of distancesM) {
    const f = seatFare(d, rules);
    if (!f) return null;
    total += f.totalPesewas;
  }
  return total;
}
