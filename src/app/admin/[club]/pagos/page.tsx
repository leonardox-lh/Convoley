import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FormMessage } from "@/components/form";
import { clubLogoPath, getPaymentSettings } from "@/modules/clubs";
import { requireOrganizer } from "../require-organizer";
import { PaymentSettingsForm } from "./payment-settings-form";

type Props = PageProps<"/admin/[club]/pagos">;

export default function PaymentSettingsPage(props: Props) {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
      <Suspense fallback={<p className="text-sm text-zinc-500">Cargando…</p>}>
        <PaymentSettingsContent {...props} />
      </Suspense>
    </main>
  );
}

async function PaymentSettingsContent({ params, searchParams }: Props) {
  const clubSlug = (await params).club;
  if ((await requireOrganizer(clubSlug))?.role !== "admin") notFound();
  const settings = await getPaymentSettings(clubSlug);
  if (!settings) notFound();
  const { guardado } = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Cobros por Yape o Plin</h1>
        <p className="text-sm text-zinc-500">
          Los jugadores te pagan directo a ti y suben su captura. Convoley nunca toca tu dinero.
        </p>
      </div>
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
    </div>
  );
}
