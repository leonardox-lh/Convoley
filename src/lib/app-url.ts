import { headers } from "next/headers";
import { env } from "@/lib/env";

/** Base URL for absolute links (emails). APP_URL in production; the request's own host locally. */
export async function appUrl(): Promise<string> {
  if (env.APP_URL) return env.APP_URL.replace(/\/$/, "");
  const requestHeaders = await headers();
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  return `${protocol}://${requestHeaders.get("host")}`;
}
