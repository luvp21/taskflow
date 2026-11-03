import { chaosHeaders } from '../lib/chaos.ts';
import { useUiStore } from '../store/uiStore.ts';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

// status 0 means the request never got a response (offline, DNS, CORS, server down).
export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, message: string, body: unknown = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
}

function errorMessageFrom(body: unknown, status: number): string {
  if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
    return body.error;
  }
  return `Request failed with status ${status}`;
}

async function readJson(res: Response): Promise<unknown> {
  if (res.status === 204) return null;
  return res.json().catch(() => null);
}

function headersFor(method: string, body: unknown): Record<string, string> {
  return {
    ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    // Chaos Panel settings only apply to writes; reads always behave normally.
    ...(method === 'GET' ? {} : chaosHeaders(useUiStore.getState().chaos)),
  };
}

// The response type is trusted, not validated: the server is ours and validates
// its own output shape. Errors become ApiError so callers can branch on status.
export async function request<T>(path: string, { method = 'GET', body }: RequestOptions = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: headersFor(method, body),
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'Network error: could not reach the server');
  }

  const data = await readJson(res);
  if (!res.ok) throw new ApiError(res.status, errorMessageFrom(data, res.status), data);
  return data as T;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong';
}
