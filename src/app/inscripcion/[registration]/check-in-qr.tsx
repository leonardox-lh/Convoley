import { ChevronDown, QrCode } from "lucide-react";
import { renderSVG } from "uqr";
import { appUrl } from "@/lib/app-url";

/**
 * HU-38: the player shows this at the court; the organizer scans it with the phone camera and
 * lands on the attendance page, which only a signed-in organizer of the club can open. Folded until
 * tapped: it's only needed at the court.
 */
export async function CheckInQr(props: {
  clubSlug: string;
  eventId: string;
  registrationId: string;
}) {
  const url = `${await appUrl()}/admin/${props.clubSlug}/convocatorias/${props.eventId}/asistencia/${props.registrationId}`;
  const svg = Buffer.from(renderSVG(url)).toString("base64");
  return (
    <details className="group rounded-lg border border-zinc-200 dark:border-zinc-800">
      <summary className="flex cursor-pointer list-none items-center gap-2 p-4 font-medium [&::-webkit-details-marker]:hidden">
        <QrCode className="size-5 text-primary" aria-hidden />
        Tu QR para la cancha
        <ChevronDown
          className="ml-auto size-4 text-muted-foreground transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="flex flex-col items-center gap-2 px-4 pb-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- inline SVG data, nothing to optimize */}
        <img
          src={`data:image/svg+xml;base64,${svg}`}
          alt="QR de asistencia"
          width={200}
          height={200}
          className="bg-white p-2"
        />
        <p className="text-center text-sm text-zinc-500">
          Muéstraselo al organizador al llegar para marcar tu asistencia.
        </p>
      </div>
    </details>
  );
}
