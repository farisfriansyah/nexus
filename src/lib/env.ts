import { z } from "zod";

const envSchema = z.object({
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),
  ALLOWED_EMAIL_DOMAIN: z.string().default("mikatasa.com").transform((value) => value.toLowerCase()),
  ADMIN_EMAILS: z.string().optional().default(""),
  SESSION_MAX_AGE_SECONDS: z.coerce.number().int().positive().default(60 * 60 * 24 * 30),
  API_BASE_URL: z.string().url().optional(),
  HEARTBEAT_RELOAD_MINUTES: z.coerce.number().positive().default(10)
});

export const env = envSchema.parse({
  AUTH_SECRET: process.env.AUTH_SECRET,
  AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
  AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
  ALLOWED_EMAIL_DOMAIN: process.env.ALLOWED_EMAIL_DOMAIN,
  ADMIN_EMAILS: process.env.ADMIN_EMAILS,
  SESSION_MAX_AGE_SECONDS: process.env.SESSION_MAX_AGE_SECONDS,
  API_BASE_URL: process.env.API_BASE_URL,
  HEARTBEAT_RELOAD_MINUTES: process.env.HEARTBEAT_RELOAD_MINUTES
});

export const adminEmails = new Set(
  env.ADMIN_EMAILS.split(",").map((email) => email.trim().toLowerCase()).filter(Boolean)
);
