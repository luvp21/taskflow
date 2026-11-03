import { useFilterSummary, useIsFiltering } from '../hooks/useFilteredView.ts';

// aria-live: screen readers announce the new count after the (debounced) search
// settles, so users hear the result of their filter without hunting for it.
export function FilterSummary() {
  const { shown, total } = useFilterSummary();
  const filtering = useIsFiltering();
  const noun = total === 1 ? 'card' : 'cards';

  return (
    <p aria-live="polite" className="text-sm text-muted sm:ml-auto">
      {filtering ? `Showing ${shown} of ${total} ${noun}` : `${total} ${noun}`}
    </p>
  );
}
