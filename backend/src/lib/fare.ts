/**
 * Fare is computed on the server and never trusted from the client.
 *
 * The band is the union-agreed rate for that city, per unit (nag / piece / than).
 * Two rules sit on top of it:
 *   - above 50 kg per unit the job needs two people per unit, so the per-unit
 *     rate steps up (ILO R128 / Maharashtra APMC benchmark)
 *   - the booker may add money on top, never take it away
 */
export const LOAD_CEILING_KG = 50;

export type FareInput = {
  units: number;
  kgPerUnit: number;
  helpers: number;
  bandLow: number;
  bandHigh: number;
  extra?: number;
};

export type Fare = {
  perUnit: number;
  base: number;
  extra: number;
  total: number;
  bandLow: number;
  bandHigh: number;
  needsTwoPerUnit: boolean;
};

export function computeFare(i: FareInput): Fare {
  const heavy = i.kgPerUnit > LOAD_CEILING_KG;
  const mid = Math.round((i.bandLow + i.bandHigh) / 2);
  const perUnit = heavy ? Math.round(i.bandHigh * 1.25) : mid;
  const base = Math.max(perUnit * Math.max(1, i.units), i.bandLow * 2);
  const extra = Math.max(0, Math.round(i.extra ?? 0));
  return {
    perUnit,
    base,
    extra,
    total: base + extra,
    bandLow: i.bandLow,
    bandHigh: i.bandHigh,
    needsTwoPerUnit: heavy,
  };
}

/** Minimum helpers the job actually needs, given the load rule. */
export function requiredHelpers(units: number, kgPerUnit: number, asked: number): number {
  const min = kgPerUnit > LOAD_CEILING_KG ? 2 : 1;
  return Math.max(min, Math.max(1, asked));
}
