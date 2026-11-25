import { CalendarDays, MapPin, Pencil, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { buttonVariants } from "@/components/ui/button";
import { formatEventTimeInLima } from "@/lib/lima-time";
import { cn } from "@/lib/utils";
import { can } from "@/modules/clubs";
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
import { CheckInButton } from "./check-in-button";
import { RegistrationActions } from "./registration-actions";
import { FlyerSharing } from "./flyer-sharing";
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
    <main className="mx-auto w-full max-w-md flex-1 px-4 pt-4 pb-8">
      <Suspense fallback={<p className="text-sm text-zinc-500">Cargando…</p>}>
        <EventRegistrationsContent params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function EventRegistrationsContent({ params, searchParams }: Omit<Props, "children">) {
  const { club: clubSlug, event: eventId } = await params;
  const organizer = await requireOrganizer(clubSlug, "run_game_day");
  if (!organizer) notFound();
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
  // HU-38: attendance counts only players holding a seat.
  const seated = listed.filter((r) => r.status !== "waitlisted" && r.status !== "cancelled");
  const present = seated.filter((r) => r.checkedInAt !== null).length;

  const canManage = can(organizer.role, "manage_club");

  return (
    <div className="flex flex-col gap-6">
      <AutoRefresh />
      <header className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <p className="text-sm text-muted-foreground">{event.club.name}</p>
          <h1 className="text-2xl leading-tight font-semibold tracking-tight">{event.title}</h1>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground first-letter:uppercase">
            <CalendarDays className="size-4 shrink-0" aria-hidden />
            {formatEventTimeInLima(event)}
          </p>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-4 shrink-0" aria-hidden />
            {event.venueName}
          </p>
        </div>
        <div className="flex gap-2">
          {canManage && (
            <Link
              href={`${basePath}/editar`}
              className={buttonVariants({ variant: "outline", className: "h-10 flex-1 gap-1.5" })}
            >
              <Pencil aria-hidden />
              Editar convocatoria
            </Link>
          )}
          <Link
            href={`${basePath}/equipos`}
            className={buttonVariants({ variant: "outline", className: "h-10 flex-1 gap-1.5" })}
          >
            <Users aria-hidden />
            Armar equipos
          </Link>
        </div>
      </header>

      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <p role="status" aria-label="Cupos" className="text-lg font-semibold">
            {seats.taken} ocupados · {seats.free} libres
          </p>
          {!status && present > 0 && (
            <span className="shrink-0 text-sm text-muted-foreground">
              {present} de {seated.length} asistieron
            </span>
          )}
        </div>
        <span aria-hidden className="h-2 overflow-hidden rounded-full bg-secondary">
          <span
            className="block h-full rounded-full bg-primary transition-all"
            style={{ width: `${Math.min(100, (seats.taken / event.capacity) * 100)}%` }}
          />
        </span>
      </section>

      {event.status === "published" && (
        <AddPlayerForm clubSlug={clubSlug} eventId={event.id} isMixed={event.isMixed} />
      )}

      {!status && (event.status === "published" || event.status === "full") && (
        <FlyerSharing flyerPath={`${basePath}/flyer`} fileName={`flyer-${event.id}.png`} />
      )}

      {!status && registrations.length > 0 && (
        <ListSharing
          imagePath={`${basePath}/imagen`}
          fileName={`lista-${event.id}`}
          listText={rosterText({
            title: event.title,
            when: formatEventTimeInLima(event),
            roster: buildRoster(registrations),
          })}
        />
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Inscritos</h2>
        <nav
          aria-label="Filtrar por estado de pago"
          className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]"
        >
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
          <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            {status ? "No hay inscritos con este estado." : "Todavía no hay inscritos."}
          </p>
        ) : (
          <ol aria-label="Inscritos" className="flex flex-col gap-2">
            {registrations.map((registration, index) => (
              <li
                key={registration.id}
                className="flex flex-col gap-3 rounded-2xl border bg-card p-3 shadow-xs"
              >
                <div className="flex items-start gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
                    {registration.status === "waitlisted"
                      ? `E${index - waitlistStart + 1}`
                      : index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {registration.firstName} {registration.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {registration.phone.replace(/^\+51/, "")} ·{" "}
                      {registeredAtFormatter.format(registration.createdAt)}
                    </p>
                    {(registration.position || registration.level) && (
                      <p className="text-sm text-muted-foreground">
                        {[
                          registration.position && POSITION_LABELS[registration.position],
                          registration.level && LEVEL_LABELS[registration.level],
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        REGISTRATION_STATUS_BADGE_CLASSES[registration.status],
                      )}
                    >
                      {STATUS_LABELS[registration.status]}
                    </span>
                    {registration.checkedInAt && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        Asistió
                      </span>
                    )}
                  </div>
                </div>
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
                  <div className="flex flex-wrap gap-2 border-t pt-3">
                    {registration.status !== "waitlisted" && (
                      <CheckInButton
                        clubSlug={clubSlug}
                        eventId={event.id}
                        registrationId={registration.id}
                        checkedIn={registration.checkedInAt !== null}
                      />
                    )}
                    <RegistrationActions
                      clubSlug={clubSlug}
                      eventId={event.id}
                      registrationId={registration.id}
                      playerName={registration.firstName}
                      canMarkPaid={
                        registration.status === "pending_payment" ||
                        registration.status === "in_review"
                      }
                    />
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function FilterLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "shrink-0 rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-secondary text-secondary-foreground hover:bg-primary/15",
      )}
    >
      {label}
    </Link>
  );
}
