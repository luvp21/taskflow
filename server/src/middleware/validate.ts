import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

// Replaces req.body with the parsed result, so handlers get trimmed strings,
// applied defaults and no unknown keys. A ZodError goes to the error handler (400).
export function validate(schema: ZodType): RequestHandler {
  return (req, _res, next) => {
    req.body = schema.parse(req.body);
    next();
  };
}
