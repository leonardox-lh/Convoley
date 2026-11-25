import { notFound } from "next/navigation";
import { Suspense } from "react";
import { env } from "@/lib/env";
import { formatDateInLima } from "@/lib/lima-time";
import { formatSoles } from "@/lib/money";
import { getClubSubscription, MONTHLY_PRICE_CENTS, TRIAL_DAYS } from "@/modules/billing";
import { requireOrganizer } from "../require-organizer";
import { SubscriptionBanner } from "../subscription-banner";

type Props = PageProps<"/admin/[club]/suscripcion">;

export default function SubscriptionPage(props: Props) {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
      <Suspense fallback={<p className="text-sm text-zinc-500">Cargando…</p>}>
        <SubscriptionContent {...props} />
      </Suspense>
    </main>
  );
}

/** HU-35: what the club pays Convoley, until when it can edit, and how to pay. */
async function SubscriptionContent({ params }: Props) {
  const clubSlug = (await params).club;
  const organizer = await requireOrganizer(clubSlug, "manage_club");
  if (!organizer) notFound();
  const { access } = await getClubSubscription(organizer.clubId);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Suscripción a Convoley</h1>
      <SubscriptionBanner clubSlug={clubSlug} access={access} />
      <p className="text-sm">
        {formatSoles(MONTHLY_PRICE_CENTS)} al mes, con {TRIAL_DAYS} días de prueba gratis. Puedes
        editar hasta el <strong>{formatDateInLima(access.accessEndsAt)}</strong>.
      </p>
      <p className="text-sm text-zinc-500">
        Sin pago, tu club queda en solo lectura: ves todo, pero no puedes crear ni cambiar nada. Tus
        jugadores pueden seguir inscribiéndose y pagando en las convocatorias ya publicadas.
      </p>
      <section className="flex flex-col gap-1 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
        <h2 className="font-medium">Cómo pagar</h2>
        <p className="text-sm whitespace-pre-line">
          {env.BILLING_PAYMENT_INSTRUCTIONS ||
            "Escríbenos y te enviamos los datos para pagar por Yape o transferencia."}
        </p>
      </section>
    </div>
  );
}
