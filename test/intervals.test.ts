import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { mergeIntervals, type Interval } from '../src/intervals';

// Recitation Part 2 (groups) and problem set Task 2.
// Read the spec in src/intervals/mergeIntervals.ts, then check your progress
// with `npm run mutants:intervals`.
//
// Label every property with its pattern, on the line above its `it(`:
//   // Pattern: invariant. The output is sorted.
// (invariant, algebraic, metamorphic, differential, or conditional)

// A first attempt at a generator. It has a problem: run the tests and read
// the counterexample.

const interval: fc.Arbitrary<Interval> = fc.tuple(fc.integer(), fc.integer()).map(([a,b]) => (a <= b ? [a,b] : [b,a]));
const intervalList = fc.array(interval);
const covers = (xs: Interval[], p: number) => xs.some(([a, b]) => a <= p && p <= b);
const touchingChain: fc.Arbitrary<Interval[]> =
  fc.tuple(
    fc.integer({ min: 0, max: 20 }),                                        // where the chain starts
    fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 2, maxLength: 6 }), // each interval's length
  ).map(([start, lengths]) => {
    let pos = start;
    return lengths.map(len => {
      const iv: Interval = [pos, pos + len];
      pos += len;                 // next interval starts at this one's end → they touch
      return iv;
    });
  });
const disjointList: fc.Arbitrary<Interval[]> =
fc.array(fc.tuple(fc.integer({ min: 1, max: 3 }), fc.integer({ min: 0, max: 5 })), { minLength: 2, maxLength: 8 })
  .map(parts => {
    let pos = 0;
    return parts.map(([gap, len]) => {
      const start = pos + gap;   // gap ≥ 1, so it never touches the previous interval
      pos = start + len;
      return [start, pos] as Interval;
    });
  });
  // Two intervals separated by a gap of exactly 1, e.g. [1,2] and [3,4].
const integerNeighbors: fc.Arbitrary<Interval[]> =
  fc.tuple(
    fc.integer({ min: 0, max: 20 }),  // where the first interval starts
    fc.integer({ min: 0, max: 5 }),   // length of the first interval
    fc.integer({ min: 0, max: 5 }),   // length of the second interval
  ).map(([start, len1, len2]) => {
    const end1 = start + len1;
    const start2 = end1 + 1;          // exactly 1 after the first one ends
    return [[start, end1], [start2, start2 + len2]];
  });

describe('mergeIntervals', () => {
  // Pattern: invariant. Every input interval lies inside some output interval.
  it('every input interval lies inside some output interval', () => {
    fc.assert(
      fc.property(intervalList, xs => {
        const out = mergeIntervals(xs);
        const uncovered = xs.filter(([s, e]) => !out.some(([a, b]) => a <= s && e <= b));
        expect(uncovered).toEqual([]);
      }),
    );
  });

  // Add your properties here. Aim for at least one of each pattern:
  // invariant, algebraic, metamorphic, differential, conditional.

  // Pattern: invariant. The output is sorted and no two output intervals overlap.
  it('returns sorted, non-overlapping intervals', () => {
    fc.assert(
      fc.property(intervalList, xs => {
        const out = mergeIntervals(xs);
        for (let i = 1; i < out.length; i++) {
          expect(out[i - 1][1]).toBeLessThan(out[i][0]);
        }
      }),
    );
  }); 
  // Pattern: conditional. If every interval touches the next at one point, they all merge into a single interval.
  it('merges intervals that only touch', () => {
    fc.assert(
      fc.property(touchingChain, xs => {
        const first = xs[0][0];
        const last = xs[xs.length - 1][1];
        expect(mergeIntervals(xs)).toEqual([[first, last]]);
      }),
    );
  });
  // Pattern: differential. Points at and just beside every input endpoint are covered by the output exactly when they're covered by the input.
  it('covers the same points as the input', () => {
    fc.assert(
      fc.property(intervalList, xs => {
        const out = mergeIntervals(xs);
        const points = xs.flatMap(([a, b]) => [a - 0.5, a, b, b + 0.5]);
        for (const p of points) {
          expect(covers(out, p)).toBe(covers(xs, p));
        }
      }),
    );
  });
  // Pattern: algebraic. Merging an already-merged list changes nothing.
  it('is idempotent', () => {
    fc.assert(
      fc.property(intervalList, xs => {
        const once = mergeIntervals(xs);
        expect(mergeIntervals(once)).toEqual(once);
      }),
    );
  });

  // Pattern: conditional. If two intervals are separated by a gap of exactly 1, they stay separate.
  it('does not merge intervals separated by a gap of 1', () => {
    fc.assert(
      fc.property(integerNeighbors, xs => {
        expect(mergeIntervals(xs)).toEqual(xs);
      }),
    );
  });
  // Pattern: invariant. The input array and its intervals are left unchanged.
  it('does not modify its input', () => {
    fc.assert(
      fc.property(touchingChain, xs => {
        const copy = xs.map(([s, e]) => [s, e]);   // snapshot before calling
        mergeIntervals(xs);
        expect(xs).toEqual(copy);                  // input must still match the snapshot
      }),
    );
  });
  // Pattern: metamorphic. Shuffling the input doesn't change the output.
  it('ignores input order', () => {
    fc.assert(
      fc.property(
        intervalList.chain(xs =>
          fc.shuffledSubarray(xs, { minLength: xs.length }).map(ys => [xs, ys] as const)),
        ([xs, shuffled]) => {
          expect(mergeIntervals(shuffled)).toEqual(mergeIntervals(xs));
        }),
    );
  });
  // Pattern: conditional. If the input is already sorted and disjoint, the output equals the input.
  it('leaves already-disjoint input unchanged', () => {
    fc.assert(
      fc.property(disjointList, xs => {
        expect(mergeIntervals(xs)).toEqual(xs);
      }),
    );
  });
});
