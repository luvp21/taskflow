import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { chaosHeaders, loadChaos, NO_CHAOS, saveChaos } from './chaos.ts';

// Node has no localStorage by default, so the tests provide a tiny in-memory one.
function fakeStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  };
}

beforeEach(() => {
  vi.stubGlobal('localStorage', fakeStorage());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('chaos settings', () => {
  it('round-trips a saved setting', () => {
    saveChaos({ latencyMs: 1500, failRate: 0.3 });

    expect(loadChaos()).toEqual({ latencyMs: 1500, failRate: 0.3 });
  });

  it('falls back to no chaos for values the panel does not offer or broken JSON', () => {
    localStorage.setItem('taskflow:chaos', JSON.stringify({ latencyMs: 999999, failRate: 0.3 }));
    expect(loadChaos()).toEqual(NO_CHAOS);

    localStorage.setItem('taskflow:chaos', '{not json');
    expect(loadChaos()).toEqual(NO_CHAOS);
  });

  it('falls back to no chaos when storage is unavailable', () => {
    vi.stubGlobal('localStorage', undefined);

    expect(loadChaos()).toEqual(NO_CHAOS);
  });

  it('only sends headers for settings that are switched on', () => {
    expect(chaosHeaders(NO_CHAOS)).toEqual({});
    expect(chaosHeaders({ latencyMs: 800, failRate: 1 })).toEqual({
      'x-chaos-latency': '800',
      'x-chaos-fail-rate': '1',
    });
  });
});
