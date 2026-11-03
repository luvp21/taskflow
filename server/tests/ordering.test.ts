import { describe, expect, it } from 'vitest';
import { computeOrderIndex, needsRebalance } from '../src/services/ordering.service.js';

describe('computeOrderIndex', () => {
  it('uses the midpoint between two neighbors', () => {
    expect(computeOrderIndex(1000, 2000)).toBe(1500);
  });

  it('adds the gap after the last card', () => {
    expect(computeOrderIndex(3000, null)).toBe(4000);
  });

  it('subtracts the gap before the first card', () => {
    expect(computeOrderIndex(null, 1000)).toBe(0);
  });

  it('starts an empty column at 1000', () => {
    expect(computeOrderIndex(null, null)).toBe(1000);
  });
});

describe('needsRebalance', () => {
  it('is true when the gap is below 1e-6', () => {
    expect(needsRebalance(1, 1 + 1e-7)).toBe(true);
  });

  it('is true for equal neighbors (a tie leaves no room)', () => {
    expect(needsRebalance(1500, 1500)).toBe(true);
  });

  it('is false for a normal gap or a missing neighbor', () => {
    expect(needsRebalance(1000, 2000)).toBe(false);
    expect(needsRebalance(null, 1000)).toBe(false);
    expect(needsRebalance(1000, null)).toBe(false);
  });
});
