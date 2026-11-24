import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { formatInLima } from "@/lib/lima-time";
import { cn } from "@/lib/utils";
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
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Mis inscripciones</h1>
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
          <li
            key={registration.id}
            className="flex flex-col gap-1 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
          >
            <Link
              href={`/c/${event.clubSlug}/${event.id}`}
              className="font-medium underline-offset-4 hover:underline"
            >
              {event.title}
            </Link>
            <p className="text-sm text-zinc-500 first-letter:uppercase">
              {event.clubName} · {formatInLima(event.startsAt)}
            </p>
            <span
              className={cn(
                "w-fit rounded-full px-2 py-0.5 text-xs font-medium",
                REGISTRATION_STATUS_BADGE_CLASSES[registration.status],
              )}
            >
              {REGISTRATION_STATUS_LABELS[registration.status]}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
