import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FormMessage } from "@/components/form";
import { getInvitation, InvitationExpiredError, InvitationInvalidError } from "@/modules/clubs";
import { currentUserId } from "@/modules/identity";
import { CLUB_ROLE_LABELS } from "../../club-roles";
import { RETURN_PATH_PARAM } from "../../ingresar/sign-in-with-password";
import { AcceptInvitationForm } from "./accept-form";
import { INVITATION_ERROR_MESSAGES } from "./messages";

// The token is a secret: keep the page out of search engines.
export const metadata: Metadata = { title: "Invitación", robots: { index: false } };

type Props = PageProps<"/invitacion/[token]">;

export default function InvitationPage({ params }: Props) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8">
      <Suspense fallback={<p className="text-sm text-zinc-500">Cargando…</p>}>
        <InvitationContent params={params} />
      </Suspense>
    </main>
  );
}

async function loadInvitation(token: string) {
  try {
    return await getInvitation(token);
  } catch (error) {
    if (error instanceof InvitationExpiredError) return INVITATION_ERROR_MESSAGES.expired;
    if (error instanceof InvitationInvalidError) return INVITATION_ERROR_MESSAGES.invalid;
    throw error;
  }
}

async function InvitationContent({ params }: Pick<Props, "params">) {
  const { token } = await params;
  const invitation = await loadInvitation(token);
  if (typeof invitation === "string") return <FormMessage tone="error">{invitation}</FormMessage>;
  const signedIn = (await currentUserId()) !== null;
  const returnQuery = new URLSearchParams({ [RETURN_PATH_PARAM]: `/invitacion/${token}` });

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Te invitaron a organizar {invitation.clubName}
        </h1>
        <p className="text-sm text-zinc-500">
          Rol: {CLUB_ROLE_LABELS[invitation.role]}
          {invitation.role === "helper" && " (aprueba pagos y maneja el día de juego)"}.
        </p>
      </div>
      {signedIn ? (
        <AcceptInvitationForm token={token} />
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm">Para aceptar, ingresa o crea tu cuenta.</p>
          <Link
            href={`/ingresar?${returnQuery}`}
            className="rounded-lg bg-zinc-900 px-4 py-3 text-center text-white dark:bg-white dark:text-zinc-900"
          >
            Ingresar
          </Link>
          <Link href={`/registro?${returnQuery}`} className="text-center text-sm underline">
            Crear cuenta
          </Link>
        </div>
      )}
    </>
  );
}
