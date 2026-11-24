import { NextResponse, type NextRequest } from "next/server";
import { ClubSlug, getClubProfile } from "@/modules/clubs";
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
      : !isClubSlug(segments[0]) || (await getClubProfile(segments[0])) !== null;
  if (exists) return NextResponse.next();
  return NextResponse.rewrite(new URL(NOT_FOUND_PATH, request.url), { status: 404 });
}

/** App routes (admin, registro…) and files are reserved or invalid slugs: let Next route them. */
function isClubSlug(segment: string): boolean {
  try {
    return ClubSlug.create(segment).value === segment;
  } catch {
    return false;
  }
}

export const config = { matcher: ["/:club", "/c/:club/:event"] };
