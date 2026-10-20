import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { matchGuess } from '../src/wordle';

// Recitation Part 1: follow along with your TA, filling in the todos below.
// Problem set Task 1: keep adding properties until `npm run mutants:wordle`
// kills every mutant. Read the spec in src/wordle/matchGuess.ts.
//
// Label every property with its pattern, on the line above its `it(`:
//   // Pattern: invariant. The result always has exactly five colors.
// (invariant, algebraic, metamorphic, differential, or conditional)

const ALPHABET = 'ABC';
const ALPHAFIRST = 'ABCDEFGHIJKLM'
const ALPHALAST = 'NOPQRSTUVWXYZ'
const FULL_ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

// Step 1: a generator for five-letter uppercase words.
const wordFrom = (letters: string) => 
  fc.array(fc.constantFrom(...letters), { minLength: 5, maxLength: 5}).map(cs => cs.join(''));


const word = wordFrom(ALPHABET);
const diff_first = wordFrom(ALPHAFIRST);
const diff_second = wordFrom(ALPHALAST);
const full_word = wordFrom(FULL_ALPHA);
const shift = (w: string, n: number) =>
  [...w].map(c => FULL_ALPHA[(FULL_ALPHA.indexOf(c) + n) %26]).join('');

describe('matchGuess', () => {
  // Pattern: invariant. The result always has exactly five colors.
  it('returns exactly five colors', () => {
    fc.assert(
      fc.property(word, word, (secret, guess) => {
        expect(matchGuess(secret, guess)).toHaveLength(5);
      }),
    );
  });
  // Pattern: invariant. Every color is G, Y, or B.
  it('only uses the colors G, Y, B', () => {
    fc.assert(
      fc.property(word, word, (secret, guess) => {
        for (const c of matchGuess(secret, guess)) expect(['G', 'Y', 'B']).toContain(c);
      }),
    );
  });
  // Pattern: conditional. If the guess equals the secret, every color is G.
  it('guessing the secret gives all greens', () => {
    fc.assert(
      fc.property(word, w => {
        expect(matchGuess(w,w)).toEqual(['G','G','G','G','G'])
      }),
    );
  });
  // Pattern: invariant. Each letter is credited (G or Y) exactly min(its count in the guess, its count in the secret) times.
  it('never credits a letter more times than the secret contains it', () => {
    fc.assert(
      fc.property(word, word, (secret, guess) => {
        const result = matchGuess(secret, guess);
        for (const letter of new Set(guess)) {
          const credited = [...guess].filter((c,i) => c === letter && result[i] !== 'B').length;
          const inGuess  = [...guess].filter(c => c === letter).length;   // new
          const inSecret = [...secret].filter(c=> c ===letter).length;
          expect(credited).toBe(Math.min(inGuess, inSecret));            // changed
        }
      }),
    );
  });
  // Targeted generator: secret and guess come from disjoint halves of the alphabet.
  // Pattern: conditional. If the guess shares no letters with the secret, every color is B.
  it('has completely different letters (no overlap)', () => {
    fc.assert(
      fc.property(diff_first, diff_second, (secret, guess) => {
        expect(matchGuess(secret, guess)).toEqual(['B','B','B','B','B'])
      }),
    );
  });
  // Pattern: metamorphic. Shifting every letter in both words by the same amount doesn't change the colors.
  it('is the same when all the letters are shifted by the same amount', () => {
    fc.assert(
      fc.property(word, word, fc.integer({min:1, max:25}), (secret, guess, n) => {
        expect(matchGuess(shift(secret, n), shift(guess, n))).toEqual(matchGuess(secret, guess))
      }),
    );
  });
});
