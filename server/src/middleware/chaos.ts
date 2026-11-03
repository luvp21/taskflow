import type { RequestHandler } from 'express';
import { setTimeout as sleep } from 'node:timers/promises';
import { HttpError } from '../utils/HttpError.js';

const MAX_LATENCY_MS = 5000;
const MUTATING_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

function readNumber(value: string | undefined, min: number, max: number): number {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(Math.max(number, min), max);
}

// For demoing optimistic UI: lets the client ask for extra latency and random 500s
// via request headers. Reads are never affected, so the board always loads.
// The failure happens BEFORE the route runs, so a "failed" request never writes.
// `random` is injectable so tests can force a failure or a success.
export function chaos(enabled: boolean, random: () => number = Math.random): RequestHandler {
  return async (req, _res, next) => {
    if (!enabled || !MUTATING_METHODS.has(req.method)) return next();

    const latencyMs = readNumber(req.get('x-chaos-latency'), 0, MAX_LATENCY_MS);
    const failRate = readNumber(req.get('x-chaos-fail-rate'), 0, 1);

    if (latencyMs > 0) await sleep(latencyMs);
    if (random() < failRate) throw new HttpError(500, 'Simulated server failure (chaos mode)');
    next();
  };
}
