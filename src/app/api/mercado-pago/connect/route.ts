import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import {
  isMercadoPagoConfigured,
  mercadoPagoAuthorizationUrl,
  signOAuthState,
} from "@/modules/payments";
import { requireOrganizerToEdit } from "@/app/admin/[club]/require-organizer";
import { mercadoPagoRedirectUri } from "../redirect-uri";

const querySchema = z.object({ club: z.string().min(1) });

/** HU-18: sends the club admin to Mercado Pago to authorize Convoley (no passwords shared). */
export async function GET(request: Request) {
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success || !isMercadoPagoConfigured()) notFound();
  const clubSlug = parsed.data.club;
  const organizer = await requireOrganizerToEdit(clubSlug, "manage_club");
  if (!organizer) notFound();

  const state = signOAuthState({ clubSlug, userId: organizer.userId });
  redirect(mercadoPagoAuthorizationUrl({ state, redirectUri: await mercadoPagoRedirectUri() }));
}
