import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.url(),
  JWT_SECRET: z.string().min(32),
  SESSION_COOKIE_NAME: z.string().min(1).default("gda_ems_session"),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(12),
  BCRYPT_COST: z.coerce.number().int().min(4).max(15).default(12),
  ACCOUNT_LOCKOUT_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  ACCOUNT_LOCKOUT_WINDOW_MINUTES: z.coerce.number().int().positive().default(10),
  ACCOUNT_LOCKOUT_DURATION_MINUTES: z.coerce.number().int().positive().default(15),
  TRUSTED_PROXY_HOPS: z.coerce.number().int().min(0).default(1),
  CRON_SECRET: z.string().min(16),
  TV_DISPLAY_TOKEN: z.string().min(16),
  APP_URL: z.url().default("http://localhost:3000"),
  // Desktop activity agent
  AGENT_API_KEY: z.string().min(16).default("change-me-in-production-agent-key"),
  INACTIVITY_THRESHOLD_MINUTES: z.coerce.number().int().min(1).default(20),

  // Email (SMTP) — all optional; unset SMTP_HOST means the mailer falls back
  // to a console-log dev preview instead of sending real email.
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default("GDA MIS <no-reply@gurudigitaladvertising.com>"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", z.treeifyError(parsed.error));
  throw new Error("Invalid environment variables — see logged details above.");
}

export const env = parsed.data;
