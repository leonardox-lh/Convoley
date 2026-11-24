import { readClubLogo } from "@/modules/clubs";

// Only names our logo keys can have, so nothing else in the bucket is reachable from here.
const LOGO_KEY = /^[a-z0-9-]+\.(jpg|png|webp)$/;
// Keys are never reused (a new upload gets a new key), so the browser may keep them forever.
const ONE_YEAR_SECONDS = 31_536_000;

export async function GET(_request: Request, context: RouteContext<"/logos/[key]">) {
  const { key } = await context.params;
  if (!LOGO_KEY.test(key)) return new Response(null, { status: 404 });
  const logo = await readClubLogo(key);
  if (!logo) return new Response(null, { status: 404 });
  return new Response(logo.body, {
    headers: {
      "Content-Type": logo.contentType,
      "Cache-Control": `public, max-age=${ONE_YEAR_SECONDS}, immutable`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
