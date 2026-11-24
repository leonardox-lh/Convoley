import { z } from "zod";

// Without these, production would have no Google login or password-reset emails.
const REQUIRED_IN_PRODUCTION = [
  "APP_URL",
  "AUTH_GOOGLE_ID",
  "AUTH_GOOGLE_SECRET",
  "RESEND_API_KEY",
  "EMAIL_FROM",
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
  })
  .superRefine((env, context) => {
    if (env.NODE_ENV !== "production") return;
    for (const key of REQUIRED_IN_PRODUCTION) {
      if (!env[key])
        context.addIssue({ code: "custom", path: [key], message: "Required in production" });
    }
  });

export const env = envSchema.parse(process.env);
