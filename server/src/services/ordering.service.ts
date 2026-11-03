// Spacing between cards when there's room. Large enough that many drops can land
// between two cards before the gap gets too small.
export const ORDER_GAP = 1000;

// Fractional position for a card placed between `prev` and `next` (null = no card
// on that side). Only the moved card's orderIndex changes; neighbors stay put.
export function computeOrderIndex(prev: number | null, next: number | null): number {
  if (prev !== null && next !== null) return (prev + next) / 2;
  if (prev !== null) return prev + ORDER_GAP;
  if (next !== null) return next - ORDER_GAP;
  return ORDER_GAP;
}
