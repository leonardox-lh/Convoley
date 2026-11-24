import { NextResponse, type NextRequest } from "next/server";
import {
  ClubSlug,
  getClubProfile,
  InvalidClubSlugError,
  ReservedClubSlugError,
} from "@/modules/clubs";
import { getPublicEvent } from "@/modules/events";

// No page lives here, so rewriting to it makes Next render its not-found page with a real 404.
const NOT_FOUND_PATH = "/_not-found";

/**
 * Public club and event pages stream (Cache Components), so a `notFound()` inside them is
 * sent as 200. Checking existence here, before rendering, returns a real 404 for bad links.
 */
export async function proxy(request: NextRequest) {
  // The matcher only lets through "/<club>" and "/c/<club>/<event>".
  const segments = request.nextUrl.pathname.split("/").filter(Boolean);
  const exists =
    segments.length === 3
      ? (await getPublicEvent({ clubSlug: segments[1], eventId: segments[2] })) !== null
      : await clubPageExists(segments[0]);
  if (exists) return NextResponse.next();
  return NextResponse.rewrite(new URL(NOT_FOUND_PATH, request.url), { status: 404 });
}

async function clubPageExists(segment: string): Promise<boolean> {
  // Files (favicon.ico) and app routes (admin, registro…) are reserved, so Next routes them.
  // shortcut: reserved names without a page yet (planes, tienda) still soft-404; fine until they exist.
  if (segment.includes(".")) return true;
  try {
    // A non-normalized segment (uppercase, accents) never matches a stored slug.
    if (ClubSlug.create(segment).value !== segment) return false;
  } catch (error) {
    if (error instanceof ReservedClubSlugError) return true;
    if (error instanceof InvalidClubSlugError) return false;
    throw error;
  }
  return (await getClubProfile(segment)) !== null;
}

export const config = { matcher: ["/:club", "/c/:club/:event"] };
