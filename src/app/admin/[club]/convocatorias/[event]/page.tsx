import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { getOrganizerEvent } from "@/modules/events";
import {
  listEventRegistrations,
  seatSummary,
  type RegistrationStatus,
} from "@/modules/registrations";
import { REGISTRATION_STATUS_BADGE_CLASSES } from "../../../../registration-status";
import { requireOrganizer } from "../../require-organizer";
import { AddPlayerForm } from "./add-player-form";
import { AutoRefresh } from "./auto-refresh";
import { RegistrationActions } from "./registration-actions";

type Props = PageProps<"/admin/[club]/convocatorias/[event]">;

const STATUS_LABELS: Record<RegistrationStatus, string> = {
  pending_payment: "Pendiente",
  in_review: "En revisión",
  paid: "Pagado",
  cancelled: "Cancelado",
};

const statusFilterSchema = z
  .enum(["pending_payment", "in_review", "paid", "cancelled"])
  .optional()
  .catch(undefined);

const registeredAtFormatter = new Intl.DateTimeFormat("es-PE", {
  timeZone: "America/Lima",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export default function EventRegistrationsPage({ params, searchParams }: Props) {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
      <Suspense fallback={<p className="text-sm text-zinc-500">Cargando…</p>}>
        <EventRegistrationsContent params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function EventRegistrationsContent({ params, searchParams }: Omit<Props, "children">) {
  const { club: clubSlug, event: eventId } = await params;
  if (!(await requireOrganizer(clubSlug))) notFound();
  const event = await getOrganizerEvent({ clubSlug, eventId });
  if (!event) notFound();

  const status = statusFilterSchema.parse((await searchParams).estado);
  const registrations = await listEventRegistrations({ eventId: event.id, status });
  const seats = seatSummary(event.capacity, event.confirmedCount);
  const basePath = `/admin/${clubSlug}/convocatorias/${event.id}`;
  const listEditable = event.status !== "cancelled";

  return (
    <div className="flex flex-col gap-6">
      <AutoRefresh />
      <div>
        <p className="text-sm text-zinc-500">{event.club.name}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{event.title}</h1>
        <Link href={`${basePath}/editar`} className="text-sm underline underline-offset-4">
          Editar convocatoria
        </Link>
      </div>

      <p role="status" aria-label="Cupos" className="text-lg font-medium">
        {seats.taken} ocupados · {seats.free} libres
      </p>

      {event.status === "published" && <AddPlayerForm clubSlug={clubSlug} eventId={event.id} />}

      <nav aria-label="Filtrar por estado de pago" className="flex flex-wrap gap-2">
        <FilterLink href={basePath} active={!status} label="Todos" />
        {(Object.keys(STATUS_LABELS) as RegistrationStatus[]).map((value) => (
          <FilterLink
            key={value}
            href={`${basePath}?estado=${value}`}
            active={status === value}
            label={STATUS_LABELS[value]}
          />
        ))}
      </nav>

      {registrations.length === 0 ? (
        <p className="text-sm text-zinc-500">
          {status ? "No hay inscritos con este estado." : "Todavía no hay inscritos."}
        </p>
      ) : (
        <ol
          aria-label="Inscritos"
          className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800"
        >
          {registrations.map((registration, index) => (
            <li key={registration.id} className="flex flex-wrap items-center gap-3 py-3">
              <span className="w-6 text-sm text-zinc-500">{index + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {registration.firstName} {registration.lastName}
                </p>
                <p className="text-sm text-zinc-500">
                  {registration.phone.replace(/^\+51/, "")} ·{" "}
                  {registeredAtFormatter.format(registration.createdAt)}
                </p>
              </div>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium",
                  REGISTRATION_STATUS_BADGE_CLASSES[registration.status],
                )}
              >
                {STATUS_LABELS[registration.status]}
              </span>
              {listEditable && registration.status !== "cancelled" && (
                <RegistrationActions
                  clubSlug={clubSlug}
                  eventId={event.id}
                  registrationId={registration.id}
                  playerName={registration.firstName}
                  canMarkPaid={registration.status !== "paid"}
                />
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function FilterLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm",
        active
          ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
          : "border-zinc-300 dark:border-zinc-700",
      )}
    >
      {label}
    </Link>
  );
}
