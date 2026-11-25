import Link from "next/link";
import { formatDateInLima } from "@/lib/lima-time";
import type { ClubAccess } from "@/modules/billing";

/** HU-35: the club's subscription state on the admin home, loud when it ends soon or ended. */
export function SubscriptionBanner({ clubSlug, access }: { clubSlug: string; access: ClubAccess }) {
  const href = `/admin/${clubSlug}/suscripcion`;
  if (access.status === "read_only" || access.status === "suspended") {
    return (
      <Link
        href={href}
        role="alert"
        className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
      >
        {access.status === "suspended"
          ? "Tu club está suspendido y en solo lectura. Escríbenos para reactivarlo."
          : "Tu club está en solo lectura. Paga la suscripción para volver a editar."}
      </Link>
    );
  }
  const text =
    access.status === "trial"
      ? `Prueba gratis: te quedan ${access.daysLeft} días.`
      : `Tu suscripción vence el ${formatDateInLima(access.accessEndsAt)}.`;
  return (
    <Link
      href={href}
      className={
        access.warn
          ? "rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
          : "text-sm text-zinc-500 underline"
      }
    >
      {text}
      {access.warn && " Paga a tiempo para no quedarte en solo lectura."}
    </Link>
  );
}
