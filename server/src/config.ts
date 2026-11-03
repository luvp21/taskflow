import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ quiet: true });

// Validate env once at startup so a bad value fails fast with a clear message
// instead of surfacing later as a confusing runtime error.
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', z.treeifyError(parsed.error));
  process.exit(1);
}

export const config = parsed.data;
