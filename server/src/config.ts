import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ quiet: true });

// Matches docker-compose.yml, so the README quick start works without a .env file.
const LOCAL_MONGODB_URI =
  'mongodb://localhost:27017/taskflow?replicaSet=rs0&directConnection=true';

// Validate env once at startup so a bad value fails fast with a clear message
// instead of surfacing later as a confusing runtime error.
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  MONGODB_URI: z.string().min(1).default(LOCAL_MONGODB_URI),
  CHAOS_ENABLED: z.enum(['true', 'false']).optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', z.treeifyError(parsed.error));
  process.exit(1);
}

const { CHAOS_ENABLED, ...env } = parsed.data;

export const config = {
  ...env,
  // Chaos only reacts to requests that send the x-chaos-* headers, so it is on by
  // default outside production (the README quick start has no .env) and must be
  // switched on explicitly in production.
  CHAOS_ENABLED: CHAOS_ENABLED ? CHAOS_ENABLED === 'true' : env.NODE_ENV !== 'production',
};
