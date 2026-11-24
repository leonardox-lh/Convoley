import { z } from "zod";

// Without these, production would have no Google login, password-reset emails or club logos.
const REQUIRED_IN_PRODUCTION = [
  "APP_URL",
  "AUTH_GOOGLE_ID",
  "AUTH_GOOGLE_SECRET",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "BUCKET_NAME",
  "BUCKET_ENDPOINT",
  "BUCKET_ACCESS_KEY_ID",
  "BUCKET_SECRET_ACCESS_KEY",
] as const;

const envSchema = z
  .object({
    DATABASE_URL: z.url(),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    // Public base URL for links in emails. Fixed in production so a forged Host header can't
    // redirect a password-reset link to another site.
    APP_URL: z.url().optional(),
    // Signs the session cookie (JWT). Generate with `npx auth secret`.
    AUTH_SECRET: z.string().min(32),
    AUTH_GOOGLE_ID: z.string().optional(),
    AUTH_GOOGLE_SECRET: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),
    // Sender of the emails, e.g. "Convoley <no-responder@convoley.pe>" (verified domain in Resend).
    EMAIL_FROM: z.string().optional(),
    // S3-compatible bucket for club logos: Railway Bucket in production, S3Mock locally.
    BUCKET_NAME: z.string().optional(),
    BUCKET_ENDPOINT: z.url().optional(),
    BUCKET_REGION: z.string().default("auto"),
    BUCKET_ACCESS_KEY_ID: z.string().optional(),
    BUCKET_SECRET_ACCESS_KEY: z.string().optional(),
  })
  .superRefine((env, context) => {
    if (env.NODE_ENV !== "production") return;
    for (const key of REQUIRED_IN_PRODUCTION) {
      if (!env[key])
        context.addIssue({ code: "custom", path: [key], message: "Required in production" });
    }
  });

export const env = envSchema.parse(process.env);
