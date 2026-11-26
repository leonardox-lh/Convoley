import { Pencil, Users } from "lucide-react";
import Link from "next/link";
import { AutoRefresh } from "@/components/auto-refresh";
import { CopyButton } from "@/components/copy-button";
import { GenderIcon } from "@/components/gender-icon";
import { appUrl } from "@/lib/app-url";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { can, clubLogoPath, getClubProfile } from "@/modules/clubs";
import { getOrganizerEvent } from "@/modules/events";
import { listVouchersInReview, signVoucherPath } from "@/modules/payments";
import {
  REJECTION_REASON_MAX_LENGTH,
  listEventRegistrations,
  seatSummary,
  type RegistrationStatus,
} from "@/modules/registrations";
import { LEVEL_LABELS, POSITION_LABELS } from "../../../../player-labels";
import { REGISTRATION_STATUS_BADGE_CLASSES } from "../../../../registration-status";
import { requireOrganizer } from "../../require-organizer";
import { EventHero } from "../../../../event-hero";
import { AddPlayerForm } from "./add-player-form";
import { CheckInButton } from "./check-in-button";
import { RegistrationActions } from "./registration-actions";
import { ShareImageSection } from "./share-image-section";
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

export default function EventRegistrationsPage({ params, searchParams }: Props) {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 pb-8">
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
  const [active, cancelled] = await Promise.all([
    listEventRegistrations({ eventId: event.id }),
    listEventRegistrations({ eventId: event.id, status: "cancelled" }),
  ]);
  const listed =
    status === "cancelled"
      ? cancelled
      : status
        ? active.filter((r) => r.status === status)
        : active;
  // Tab counts, so the organizer sees at a glance how many are in each state.
  const countOf = (value: RegistrationStatus) =>
    value === "cancelled" ? cancelled.length : active.filter((r) => r.status === value).length;
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
  const [clubProfile, origin] = await Promise.all([getClubProfile(clubSlug), appUrl()]);

  return (
    <div className="flex flex-col gap-6">
      <AutoRefresh />
      <EventHero
        event={{
          ...event,
          clubName: event.club.name,
          logoSrc: clubProfile?.logoKey ? clubLogoPath(clubProfile.logoKey) : null,
          primaryColor: clubProfile?.primaryColor ?? null,
          secondaryColor: clubProfile?.secondaryColor ?? null,
          taken: seats.taken,
        }}
        clubSuffix="Convocatoria"
        action={
          <CopyButton
            text={`${origin}/c/${clubSlug}/${event.id}`}
            label="Copiar link"
            showLabel
            className="border-white/30 bg-white/15 text-white hover:bg-white/25 hover:text-white"
          />
        }
        showSeatsBar
        seats={
          <>
            <p role="status" aria-label="Cupos" className="mt-1 text-sm font-semibold">
              {seats.taken} ocupados · {seats.free} libres
            </p>
            {!status && present > 0 && (
              <span className="text-xs text-muted-foreground">
                {present} de {seated.length} asistieron
              </span>
            )}
          </>
        }
      />

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

      {event.status === "published" && (
        <AddPlayerForm clubSlug={clubSlug} eventId={event.id} isMixed={event.isMixed} />
      )}

      {!status && (event.status === "published" || event.status === "full") && (
        <ShareImageSection
          id="flyer-title"
          title="Flyer de la convocatoria"
          imagePath={`${basePath}/flyer`}
          fileName={`flyer-${event.id}.png`}
        />
      )}

      {!status && registrations.length > 0 && (
        <ShareImageSection
          id="list-title"
          title="Lista de participantes"
          imagePath={`${basePath}/imagen?formato=historia`}
          fileName={`lista-${event.id}.png`}
        />
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Inscritos ({active.length})</h2>
        <nav
          aria-label="Filtrar por estado de pago"
          className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]"
        >
          <FilterLink href={basePath} active={!status} label={`Todos (${active.length})`} />
          {(Object.keys(STATUS_LABELS) as RegistrationStatus[]).map((value) => (
            <FilterLink
              key={value}
              href={`${basePath}?estado=${value}`}
              active={status === value}
              label={`${STATUS_LABELS[value]} (${countOf(value)})`}
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
                className="flex flex-col gap-2 rounded-2xl border bg-card px-3 py-2 shadow-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
                    {registration.status === "waitlisted"
                      ? `E${index - waitlistStart + 1}`
                      : index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 font-medium">
                      <span className="truncate">
                        {registration.firstName} {registration.lastName}
                      </span>
                      <GenderIcon gender={registration.gender} />
                    </p>
                    {(registration.position || registration.level) && (
                      <p className="text-xs text-muted-foreground">
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
                  <div className="flex flex-wrap gap-2 border-t pt-2">
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
                      canRevertToPending={registration.status === "paid"}
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
