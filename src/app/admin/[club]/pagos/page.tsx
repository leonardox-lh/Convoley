import { PageHeading } from "@/components/page-heading";
import { Wallet } from "lucide-react";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FormMessage } from "@/components/form";
import { clubLogoPath, findClubBySlug, getPaymentSettings } from "@/modules/clubs";
import { requireOrganizer } from "../require-organizer";
import { CancellationPolicyForm } from "./cancellation-policy-form";
import { MercadoPagoSection } from "./mercado-pago-section";
import { PaymentSettingsForm } from "./payment-settings-form";

type Props = PageProps<"/admin/[club]/pagos">;

export default function PaymentSettingsPage(props: Props) {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 pt-4 pb-8">
      <Suspense fallback={<p className="text-sm text-zinc-500">Cargando…</p>}>
        <PaymentSettingsContent {...props} />
      </Suspense>
    </main>
  );
}

async function PaymentSettingsContent({ params, searchParams }: Props) {
  const clubSlug = (await params).club;
  if (!(await requireOrganizer(clubSlug, "manage_club"))) notFound();
  const [settings, club] = await Promise.all([
    getPaymentSettings(clubSlug),
    findClubBySlug(clubSlug),
  ]);
  if (!settings || !club) notFound();
  const { guardado, mp } = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      <PageHeading icon={Wallet} eyebrow="Gestiona tu club" title="Cobros por Yape o Plin">
        Los jugadores te pagan directo a ti y suben su captura. Convoley nunca toca tu dinero.
      </PageHeading>
      <MercadoPagoSection
        clubSlug={clubSlug}
        clubId={club.id}
        result={typeof mp === "string" ? mp : undefined}
        serviceFee={{
          fixedCents: settings.serviceFeeFixedCents,
          percentBps: settings.serviceFeePercentBps,
        }}
      />
      {guardado && <FormMessage tone="ok">Cambios guardados.</FormMessage>}
      {settings.paymentQrKey && (
        // eslint-disable-next-line @next/next/no-img-element -- served by our own route, already sized
        <img
          src={clubLogoPath(settings.paymentQrKey)}
          alt="QR de Yape o Plin"
          className="size-48 self-center rounded-lg border border-zinc-200 object-contain dark:border-zinc-800"
        />
      )}
      <PaymentSettingsForm
        clubSlug={clubSlug}
        defaults={settings}
        hasQr={settings.paymentQrKey !== null}
      />
      <CancellationPolicyForm
        clubSlug={clubSlug}
        deadlineHours={settings.cancellationDeadlineHours}
      />
    </div>
  );
}
