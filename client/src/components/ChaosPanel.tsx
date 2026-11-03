import clsx from 'clsx';
import { FAIL_RATE_OPTIONS, LATENCY_OPTIONS } from '../lib/chaos.ts';
import { useUiStore } from '../store/uiStore.ts';

const CHIP_CLASS =
  'rounded-full border px-3 py-1 text-xs font-medium focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none';

interface ChipGroupProps {
  label: string;
  options: number[];
  value: number;
  format: (option: number) => string;
  onChange: (option: number) => void;
}

function ChipGroup({ label, options, value, format, onChange }: ChipGroupProps) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-xs font-semibold text-muted">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={option === value}
            onClick={() => onChange(option)}
            className={clsx(
              CHIP_CLASS,
              option === value ? 'border-accent bg-accent text-accent-fg' : 'border-border hover:bg-panel',
            )}
          >
            {format(option)}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

const formatLatency = (ms: number) => (ms === 0 ? 'None' : `${ms} ms`);
const formatRate = (rate: number) => `${Math.round(rate * 100)}%`;

// A demo tool: makes writes slow and/or fail on purpose, so optimistic updates and
// rollback can be seen. Uses a native <details>, so open/close and keyboard
// support come from the browser.
export function ChaosPanel() {
  const chaos = useUiStore((state) => state.chaos);
  const setChaos = useUiStore((state) => state.setChaos);
  const active = chaos.latencyMs > 0 || chaos.failRate > 0;

  return (
    <details className="relative">
      <summary
        className={clsx(
          'cursor-pointer list-none rounded-lg border px-3 py-1.5 text-sm font-medium select-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none',
          active ? 'border-danger text-danger' : 'border-border text-muted hover:text-fg',
        )}
      >
        Chaos{active && `: ${formatLatency(chaos.latencyMs)}, ${formatRate(chaos.failRate)} fail`}
      </summary>
      <div className="absolute right-0 z-40 mt-2 flex w-72 flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-xl">
        <p className="text-xs text-muted">
          Slows down or fails changes on purpose so you can watch cards update instantly and roll back.
          Loading the board is never affected.
        </p>
        <ChipGroup
          label="Latency per change"
          options={LATENCY_OPTIONS}
          value={chaos.latencyMs}
          format={formatLatency}
          onChange={(latencyMs) => setChaos({ latencyMs })}
        />
        <ChipGroup
          label="Failure rate"
          options={FAIL_RATE_OPTIONS}
          value={chaos.failRate}
          format={formatRate}
          onChange={(failRate) => setChaos({ failRate })}
        />
      </div>
    </details>
  );
}
