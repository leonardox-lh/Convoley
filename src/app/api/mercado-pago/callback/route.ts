import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { findClubBySlug } from "@/modules/clubs";
import {
  connectMercadoPago,
  MercadoPagoAccountInUseError,
  MercadoPagoAuthorizationError,
  verifyOAuthState,
} from "@/modules/payments";
import { requireOrganizerToEdit } from "@/app/admin/[club]/require-organizer";
import { mercadoPagoRedirectUri, paymentsPagePath } from "../redirect-uri";

const querySchema = z.object({ code: z.string().min(1).optional(), state: z.string().min(1) });

/** HU-18: Mercado Pago comes back here with a one-time code once the organizer accepts. */
export async function GET(request: Request) {
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  const state = parsed.success ? verifyOAuthState(parsed.data.state) : null;
  if (!parsed.success || !state) notFound();

  // The person finishing the flow must be the admin who started it, still in that club.
  const organizer = await requireOrganizerToEdit(state.clubSlug, "manage_club");
  if (!organizer || organizer.userId !== state.userId) notFound();
  // No code: the organizer cancelled on Mercado Pago's page.
  if (!parsed.data.code) redirect(paymentsPagePath(state.clubSlug, "error"));
  const club = await findClubBySlug(state.clubSlug);
  if (!club) notFound();

  let result: "conectado" | "error" = "conectado";
  try {
    await connectMercadoPago({
      clubId: club.id,
      userId: organizer.userId,
      code: parsed.data.code,
      redirectUri: await mercadoPagoRedirectUri(),
    });
  } catch (error) {
    if (
      !(error instanceof MercadoPagoAuthorizationError) &&
      !(error instanceof MercadoPagoAccountInUseError)
    ) {
      throw error;
    }
    result = "error";
  }
  redirect(paymentsPagePath(state.clubSlug, result));
}
