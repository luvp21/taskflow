// Thrown from controllers and services; the error handler turns it into a response.
// `extra` is merged into the JSON body, e.g. the current task on a 409.
export class HttpError extends Error {
  readonly status: number;
  readonly extra: Record<string, unknown>;

  constructor(status: number, message: string, extra: Record<string, unknown> = {}) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.extra = extra;
  }
}
