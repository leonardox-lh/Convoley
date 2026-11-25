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

// Mercado Pago is all or nothing: a deployment without it still works with voucher payments,
// but half a setup would take payments it can't confirm (no webhook secret).
const MERCADO_PAGO_VARIABLES = [
  "MP_CLIENT_ID",
  "MP_CLIENT_SECRET",
  "MP_WEBHOOK_SECRET",
  "MP_TOKEN_ENCRYPTION_KEY",
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
    // Mercado Pago app (Checkout API + OAuth). Optional locally: without them clubs can't
    // connect Mercado Pago and players pay by voucher, as before.
    MP_CLIENT_ID: z.string().optional(),
    MP_CLIENT_SECRET: z.string().optional(),
    // "Clave secreta" of the Webhooks section: verifies the x-signature header.
    MP_WEBHOOK_SECRET: z.string().optional(),
    // Encrypts organizers' Mercado Pago tokens at rest. 32 bytes in base64: `openssl rand -base64 32`.
    MP_TOKEN_ENCRYPTION_KEY: z
      .string()
      .refine(
        (value) => value === "" || Buffer.from(value, "base64").length === 32,
        "Must be 32 bytes in base64",
      )
      .optional(),
  })
  .superRefine((env, context) => {
    if (env.NODE_ENV !== "production") return;
    for (const key of REQUIRED_IN_PRODUCTION) {
      if (!env[key])
        context.addIssue({ code: "custom", path: [key], message: "Required in production" });
    }
    if (!MERCADO_PAGO_VARIABLES.some((key) => env[key])) return;
    for (const key of MERCADO_PAGO_VARIABLES) {
      if (!env[key]) {
        context.addIssue({
          code: "custom",
          path: [key],
          message: "Set all MP_* variables or none",
        });
      }
    }
  });

export function parseEnv(source: Record<string, string | undefined>) {
  return envSchema.parse(source);
}
