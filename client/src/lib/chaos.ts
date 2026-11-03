export interface ChaosSettings {
  latencyMs: number;
  failRate: number; // 0..1
}

export const LATENCY_OPTIONS = [0, 800, 1500, 3000];
export const FAIL_RATE_OPTIONS = [0, 0.3, 1];
export const NO_CHAOS: ChaosSettings = { latencyMs: 0, failRate: 0 };

const STORAGE_KEY = 'taskflow:chaos';

// localStorage is user-editable, so only accept values the panel itself offers.
// Any problem (missing, malformed JSON, storage blocked) falls back to no chaos.
export function loadChaos(): ChaosSettings {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (!saved || typeof saved !== 'object') return NO_CHAOS;
    const { latencyMs, failRate } = saved as Record<string, unknown>;
    if (typeof latencyMs !== 'number' || !LATENCY_OPTIONS.includes(latencyMs)) return NO_CHAOS;
    if (typeof failRate !== 'number' || !FAIL_RATE_OPTIONS.includes(failRate)) return NO_CHAOS;
    return { latencyMs, failRate };
  } catch {
    return NO_CHAOS;
  }
}

// Saving is best effort: if storage is unavailable the setting still applies
// for this session.
export function saveChaos(settings: ChaosSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Private mode or storage disabled: nothing else to do.
  }
}

// Request headers read by server/src/middleware/chaos.ts.
export function chaosHeaders({ latencyMs, failRate }: ChaosSettings): Record<string, string> {
  const headers: Record<string, string> = {};
  if (latencyMs > 0) headers['x-chaos-latency'] = String(latencyMs);
  if (failRate > 0) headers['x-chaos-fail-rate'] = String(failRate);
  return headers;
}
