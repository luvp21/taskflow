// Mirrors server/src/services/ordering.service.ts so the optimistic position matches
// what the server will compute in the normal case. The server's value always wins.
export const ORDER_GAP = 1000;

export function computeOrderIndex(prev: number | null, next: number | null): number {
  if (prev !== null && next !== null) return (prev + next) / 2;
  if (prev !== null) return prev + ORDER_GAP;
  if (next !== null) return next - ORDER_GAP;
  return ORDER_GAP;
}
