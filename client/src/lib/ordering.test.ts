import { describe, expect, it } from 'vitest';
import { computeOrderIndex } from './ordering.ts';

describe('computeOrderIndex (same rules as the server)', () => {
  it('uses the midpoint between two neighbors', () => {
    expect(computeOrderIndex(1000, 2000)).toBe(1500);
  });

  it('adds 1000 after the last card and subtracts 1000 before the first', () => {
    expect(computeOrderIndex(3000, null)).toBe(4000);
    expect(computeOrderIndex(null, 1000)).toBe(0);
  });

  it('starts an empty column at 1000', () => {
    expect(computeOrderIndex(null, null)).toBe(1000);
  });
});
