import type { ErrorRequestHandler, RequestHandler } from 'express';
import mongoose from 'mongoose';
import { z, ZodError } from 'zod';
import { HttpError } from '../utils/HttpError.js';

export const notFoundHandler: RequestHandler = (req) => {
  throw new HttpError(404, `Route ${req.method} ${req.path} not found`);
};

// express.json() marks a malformed body with this type before it reaches any route.
function isMalformedJson(err: unknown): boolean {
  return err instanceof SyntaxError && 'type' in err && err.type === 'entity.parse.failed';
}

// The single place that turns errors into HTTP responses. Responses never include
// stack traces; unexpected errors are logged on the server and answered with a 500.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, ...err.extra });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Validation failed', fields: z.flattenError(err) });
    return;
  }
  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({ error: `Invalid value for ${err.path}` });
    return;
  }
  if (err instanceof mongoose.Error.ValidationError) {
    res.status(400).json({ error: err.message });
    return;
  }
  if (isMalformedJson(err)) {
    res.status(400).json({ error: 'Malformed JSON body' });
    return;
  }

  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
};
