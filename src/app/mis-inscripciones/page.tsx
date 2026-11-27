import type { Metadata } from "next";
import { CalendarCheck, Clock } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { formatTimeRangeInLima, formatWeekdayDateInLima } from "@/lib/lima-time";
import { cn } from "@/lib/utils";
import { ClubLogo } from "@/components/club-logo";
import { clubLogoPath } from "@/modules/clubs";
import { listEventSummaries } from "@/modules/events";
import { currentUserId, isGoogleSignInEnabled } from "@/modules/identity";
import { listPlayerRegistrations } from "@/modules/registrations";
import {
  REGISTRATION_STATUS_BADGE_CLASSES,
  REGISTRATION_STATUS_LABELS,
} from "../registration-status";
import { signInToMyRegistrationsAction } from "./actions";

export const metadata: Metadata = { title: "Mis inscripciones · Convoley" };

export default function MyRegistrationsPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 pt-4 pb-8">
      <PageHeading icon={CalendarCheck} eyebrow="Convoley" title="Mis inscripciones" />
      <Suspense fallback={<p className="text-sm text-zinc-500">Cargando…</p>}>
        <MyRegistrations />
      </Suspense>
    </main>
  );
}

async function MyRegistrations() {
  const userId = await currentUserId();
  if (!userId) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-zinc-500">
          Ingresa con Google para ver tus inscripciones y su estado de pago.
        </p>
        {isGoogleSignInEnabled && (
          <form action={signInToMyRegistrationsAction}>
            <Button type="submit" size="lg" variant="outline" className="h-11 w-full">
              Continuar con Google
            </Button>
          </form>
        )}
      </div>
    );
  }

  const registrations = await listPlayerRegistrations(userId);
  if (registrations.length === 0) {
    return (
      <p className="text-sm text-zinc-500">Todavía no te inscribiste a ninguna convocatoria.</p>
    );
  }
  const events = new Map(
    (await listEventSummaries(registrations.map((r) => r.eventId))).map((e) => [e.id, e]),
  );

  return (
    <ul aria-label="Mis inscripciones" className="flex flex-col gap-3">
      {registrations.map((registration) => {
        const event = events.get(registration.eventId);
        if (!event) return null;
        return (
          <li key={registration.id}>
            {/* The whole card opens the event: paying and the details live there. */}
            <Link
              href={`/c/${event.clubSlug}/${event.id}`}
              className="flex flex-col gap-2 rounded-2xl border bg-card p-3 transition-colors hover:border-primary/40"
            >
              <div className="flex items-start gap-3">
                <ClubLogo
                  name={event.clubName}
                  src={event.clubLogoKey ? clubLogoPath(event.clubLogoKey) : null}
                  // Light card: the initial badge needs dark text instead of the hero's white.
                  className="size-11 rounded-xl bg-primary/10 text-lg text-primary shadow-none ring-1 ring-border"
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-xs text-muted-foreground">{event.clubName}</span>
                  <span className="font-semibold leading-tight">{event.title}</span>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                    REGISTRATION_STATUS_BADGE_CLASSES[registration.status],
                  )}
                >
                  {REGISTRATION_STATUS_LABELS[registration.status]}
                  {registration.waitlistPosition !== null && ` · ${registration.waitlistPosition}`}
                </span>
              </div>
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock className="size-4 shrink-0" aria-hidden />
                {formatWeekdayDateInLima(event.startsAt)} · {formatTimeRangeInLima(event)}
              </p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
