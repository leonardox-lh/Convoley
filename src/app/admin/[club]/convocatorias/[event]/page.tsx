import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { formatInLima } from "@/lib/lima-time";
import { cn } from "@/lib/utils";
import { getOrganizerEvent } from "@/modules/events";
import { listVouchersInReview, signVoucherPath } from "@/modules/payments";
import {
  buildRoster,
  REJECTION_REASON_MAX_LENGTH,
  rosterText,
  listEventRegistrations,
  seatSummary,
  type RegistrationStatus,
} from "@/modules/registrations";
import { LEVEL_LABELS, POSITION_LABELS } from "../../../../player-labels";
import { REGISTRATION_STATUS_BADGE_CLASSES } from "../../../../registration-status";
import { requireOrganizer } from "../../require-organizer";
import { AddPlayerForm } from "./add-player-form";
import { AutoRefresh } from "./auto-refresh";
import { RegistrationActions } from "./registration-actions";
import { ListSharing } from "./list-sharing";
import { VoucherReview } from "./voucher-review";

type Props = PageProps<"/admin/[club]/convocatorias/[event]">;

const STATUS_LABELS: Record<RegistrationStatus, string> = {
  pending_payment: "Pendiente",
  in_review: "En revisión",
  paid: "Pagado",
  waitlisted: "En espera",
  cancelled: "Cancelado",
};

const statusFilterSchema = z
  .enum(["pending_payment", "in_review", "paid", "waitlisted", "cancelled"])
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
  const listed = await listEventRegistrations({ eventId: event.id, status });
  // Seated players first, then the waitlist in arrival order, numbered separately (HU-12).
  const registrations = [
    ...listed.filter((registration) => registration.status !== "waitlisted"),
    ...listed.filter((registration) => registration.status === "waitlisted"),
  ];
  const waitlistStart = registrations.findIndex((r) => r.status === "waitlisted");
  const vouchers = await listVouchersInReview(
    registrations.filter((r) => r.status === "in_review").map((r) => r.id),
  );
  const voucherViews = new Map(
    [...vouchers].map(([registrationId, voucher]) => [
      registrationId,
      {
        imageUrl: voucher.proofFileKey ? signVoucherPath(voucher.proofFileKey) : null,
        securityCode: voucher.yapeSecurityCode,
      },
    ]),
  );
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

      {!status && registrations.length > 0 && (
        <ListSharing
          imagePath={`${basePath}/imagen`}
          fileName={`lista-${event.id}`}
          listText={rosterText({
            title: event.title,
            when: formatInLima(event.startsAt),
            roster: buildRoster(registrations),
          })}
        />
      )}

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
              <span className="w-6 text-sm text-zinc-500">
                {registration.status === "waitlisted" ? `E${index - waitlistStart + 1}` : index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {registration.firstName} {registration.lastName}
                </p>
                <p className="text-sm text-zinc-500">
                  {registration.phone.replace(/^\+51/, "")} ·{" "}
                  {registeredAtFormatter.format(registration.createdAt)}
                </p>
                {(registration.position || registration.level) && (
                  <p className="text-sm text-zinc-500">
                    {[
                      registration.position && POSITION_LABELS[registration.position],
                      registration.level && LEVEL_LABELS[registration.level],
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </div>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium",
                  REGISTRATION_STATUS_BADGE_CLASSES[registration.status],
                )}
              >
                {STATUS_LABELS[registration.status]}
              </span>
              {listEditable && voucherViews.has(registration.id) && (
                <VoucherReview
                  clubSlug={clubSlug}
                  eventId={event.id}
                  registrationId={registration.id}
                  playerName={registration.firstName}
                  reasonMaxLength={REJECTION_REASON_MAX_LENGTH}
                  {...voucherViews.get(registration.id)!}
                />
              )}
              {listEditable && registration.status !== "cancelled" && (
                <RegistrationActions
                  clubSlug={clubSlug}
                  eventId={event.id}
                  registrationId={registration.id}
                  playerName={registration.firstName}
                  canMarkPaid={
                    registration.status === "pending_payment" || registration.status === "in_review"
                  }
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
